#!/usr/bin/env node

/**
 * 下载 bge-m3 GGUF 模型到 resources/models/ 目录
 *
 * 在打包前执行（npm run build:win 等命令自动触发），将模型文件内嵌到 Electron 安装包中。
 * 应用首次启动时通过 Ollama /api/create 导入，避免运行时从 registry 缓慢拉取。
 *
 * 如果 resources/models/ 已存在则跳过，通过 FORCE_DOWNLOAD=1 强制重新下载。
 *
 * 环境变量：
 *   FORCE_DOWNLOAD=1     — 强制重新下载
 *   MODEL_MIRROR=...     — 镜像地址（默认 https://www.modelscope.cn）
 */

import { existsSync, mkdirSync } from 'fs'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { spawn } from 'child_process'
import dotenv from 'dotenv'
dotenv.config()

const DEST_DIR = join(import.meta.dirname, '..', 'resources', 'models')
const GGUF_FILE = 'bge-m3-q8_0.gguf'
const MODEL_REPO = 'OllmOne/bge-m3-GGUF'

function getDownloadUrl() {
  const mirror = process.env.MODEL_MIRROR || 'https://www.modelscope.cn'
  return `${mirror}/${MODEL_REPO}/resolve/master/${GGUF_FILE}`
}

function downloadWithCurl(url, destPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('curl', ['-fsSL', '--retry', '2', '-o', destPath, url], { stdio: 'pipe' })
    let stderr = ''
    proc.stderr.on('data', (c) => { stderr += c })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`curl 下载失败 (${code})`))
    })
    proc.on('error', () => reject(new Error('curl 不可用')))
  })
}

async function downloadWithFetch(url, destPath) {
  const { writeFile } = await import('fs/promises')
  const resp = await fetch(url, { signal: AbortSignal.timeout(600_000) })
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`)
  const buf = Buffer.from(await resp.arrayBuffer())
  await writeFile(destPath, buf)
}

async function main() {
  const destPath = join(DEST_DIR, GGUF_FILE)

  mkdirSync(DEST_DIR, { recursive: true })

  if (!process.env.FORCE_DOWNLOAD && existsSync(destPath)) {
    console.log(`[download-model] ${GGUF_FILE} 已存在，跳过下载 (${destPath})`)
    return
  }

  if (existsSync(destPath)) await unlink(destPath)

  const url = getDownloadUrl()
  console.log(`[download-model] 下载 bge-m3 GGUF 模型...`)
  console.log(`[download-model] 来源: ${url}`)
  console.log(`[download-model] 目标: ${destPath}`)

  for (const method of ['curl', 'fetch']) {
    try {
      if (method === 'curl') await downloadWithCurl(url, destPath)
      else await downloadWithFetch(url, destPath)

      const { stat } = await import('fs/promises')
      const size = (await stat(destPath)).size
      console.log(`[download-model] 下载完成 (${(size / 1024 / 1024).toFixed(1)} MB): ${destPath}`)
      return
    } catch (err) {
      console.log(`[download-model] ${method} 方式下载失败: ${err.message}`)
    }
  }

  console.error('[download-model] 所有下载方式均失败。')
  console.error('[download-model] 应用仍可正常运行（首次使用时会在线拉取模型），但打包后将不包含内嵌模型。')
  console.error('[download-model] 如需手动下载，请访问:')
  console.error(`  https://www.modelscope.cn/${MODEL_REPO}`)
}

main()
