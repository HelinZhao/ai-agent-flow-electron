import { ProxyAgent } from 'undici'
import { SocksClient } from 'socks'
import http from 'http'
import tls from 'tls'
import fs from 'fs/promises'
import { getResourcesDir } from './file'

const PROXY_CONFIG_PATH = '/proxy-config.json'

export interface ProxyConfig {
  enabled: boolean
  protocol: 'http' | 'https' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
}

let cachedAgent: ProxyAgent | null = null
let cachedUrl: string | null = null
let cachedConfig: ProxyConfig | null = null
let configLoadTime = 0
const CONFIG_CACHE_TTL = 30_000 // 30 秒

function buildProxyUrl(config: ProxyConfig): string {
  const auth = config.username && config.password
    ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`
    : ''
  return `${config.protocol}://${auth}${config.host}:${config.port}`
}

export async function loadProxyConfig(): Promise<ProxyConfig> {
  try {
    const filePath = getResourcesDir(PROXY_CONFIG_PATH)
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { enabled: false, protocol: 'http', host: '', port: 8080 }
  }
}

export async function saveProxyConfig(config: ProxyConfig): Promise<void> {
  const filePath = getResourcesDir(PROXY_CONFIG_PATH)
  await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8')
  cachedAgent = null
  cachedUrl = null
}

/**
 * 基于 socks 包的自定义 fetch，用于 SOCKS5 代理
 * 通过 SocksClient 创建隧道，再通过 https.request 发送请求
 */
function createSocks5Fetch(config: ProxyConfig): typeof fetch {
  const socksOptions = {
    proxy: {
      host: config.host,
      port: config.port,
      type: 5 as const,
      userId: config.username,
      password: config.password,
    },
    command: 'connect' as const,
  }

  return async (input, init) => {
    const url = typeof input === 'string' ? new URL(input) : new URL(input.url)
    const method = init?.method || 'GET'

    // 将 Headers 转成普通对象，确保 Content-Type 不被丢掉
    const headers: Record<string, string> = {}
    if (init?.headers) {
      const src = init.headers
      if (typeof src.entries === 'function') {
        for (const [k, v] of (src as Headers).entries()) {
          headers[k] = v
        }
      } else {
        Object.assign(headers, src as Record<string, string>)
      }
    }

    const body = init?.body
    const destPort = url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80)

    // 通过 SOCKS5 建立 TCP 隧道
    let socket: import('net').Socket
    try {
      const conn = await SocksClient.createConnection({
        ...socksOptions,
        destination: { host: url.hostname, port: destPort },
      })
      socket = conn.socket
    } catch (err) {
      console.error('[SOCKS5 代理] 隧道建立失败:', err)
      throw err instanceof Error ? err : new Error(String(err))
    }

    // SOCKS5 隧道建立的是裸 TCP 连接，HTTPS 需要手动做 TLS 加密
    // 直接用 http.request + tls 包装过的 socket，避免 https.request 不处理 TLS
    const isHttps = url.protocol === 'https:'
    const tlsSocket = isHttps
      ? tls.connect({ socket, host: url.hostname, servername: url.hostname, rejectUnauthorized: true })
      : socket

    return new Promise<Response>((resolve, reject) => {
      const req = http.request(
        {
          createConnection: () => tlsSocket,
          hostname: url.hostname,
          port: destPort,
          path: url.pathname + url.search,
          method,
          headers,
          timeout: 30000,
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk) => chunks.push(chunk))
          res.on('end', () => {
            try {
              const body = Buffer.concat(chunks)
              const flatHeaders: Record<string, string> = {}
              if (res.headers) {
                for (const [k, v] of Object.entries(res.headers)) {
                  if (v !== undefined) flatHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v)
                }
              }
              const response = new Response(body, {
                status: res.statusCode ?? 502,
                statusText: res.statusMessage ?? '',
                headers: new Headers(flatHeaders),
              })
              resolve(response)
            } catch (err) {
              reject(err instanceof Error ? err : new Error(String(err)))
            }
          })
        }
      )
      req.on('error', (err) => {
        console.error('[SOCKS5 代理] 请求错误:', err)
        reject(err instanceof Error ? err : new Error(String(err)))
      })
      req.on('timeout', () => { req.destroy(); reject(new Error('SOCKS5 代理请求超时')) })
      if (body) req.write(body)
      req.end()
    })
  }
}

/**
 * 基于 undici ProxyAgent 的自定义 fetch，用于 HTTP/HTTPS 代理
 */
function createHttpProxyFetch(proxyUrl: string): typeof fetch {
  if (proxyUrl !== cachedUrl || !cachedAgent) {
    cachedAgent = new ProxyAgent(proxyUrl)
    cachedUrl = proxyUrl
  }

  return (input, init) => fetch(input, { ...init, dispatcher: cachedAgent! })
}

export function getProxyFetch(config?: ProxyConfig): typeof fetch {
  if (!config?.enabled || !config.host) return fetch

  if (config.protocol === 'socks5') {
    return createSocks5Fetch(config)
  }

  return createHttpProxyFetch(buildProxyUrl(config))
}

/**
 * 带内存缓存的代理配置加载，避免频繁读磁盘
 */
export async function getCachedProxyConfig(): Promise<ProxyConfig> {
  const now = Date.now()
  if (cachedConfig && now - configLoadTime < CONFIG_CACHE_TTL) {
    return cachedConfig
  }
  cachedConfig = await loadProxyConfig()
  configLoadTime = now
  return cachedConfig
}
