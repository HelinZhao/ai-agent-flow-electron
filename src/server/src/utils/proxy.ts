import { ProxyAgent } from 'undici'
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

export function getProxyFetch(config?: ProxyConfig): typeof fetch {
  if (!config?.enabled || !config.host) return fetch

  const url = buildProxyUrl(config)
  if (url !== cachedUrl || !cachedAgent) {
    cachedAgent = new ProxyAgent(url)
    cachedUrl = url
  }

  return (input, init) => fetch(input, { ...init, dispatcher: cachedAgent! })
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
