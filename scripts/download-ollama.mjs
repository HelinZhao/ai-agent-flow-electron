#!/usr/bin/env node

/**
 * 下载 Ollama 可执行文件到 resources/ollama/ 目录
 *
 * 在 npm install 后自动执行（postinstall hook），将 ollama 内嵌到 Electron 应用中。
 * 如果 resources/ollama/ 已存在可执行文件则跳过，通过环境变量 FORCE_DOWNLOAD=1 强制重新下载。
 *
 * 若系统 PATH 中已有 ollama（`ollama --version` 成功），则跳过下载。
 * 若网络受限无法下载，应用会回退使用系统 PATH 中的 ollama。
 *
 * 环境变量：
 *   FORCE_DOWNLOAD=1     — 强制重新下载
 *   GITHUB_MIRROR=https://mirror.example.com  — GitHub Release 镜像地址
 */

import { existsSync, mkdirSync } from 'fs'
import { unlink, rm } from 'fs/promises'
import { join } from 'path'
import dotenv from 'dotenv'
dotenv.config()
import { spawnSync, spawn } from 'child_process'

const DEST_DIR = join(import.meta.dirname, '..', 'resources', 'ollama')
const MIRROR = process.env.GITHUB_MIRROR || 'https://github.com'

function getPlatformInfo() {
  const supported = process.arch === 'x64' || (process.platform === 'darwin' && process.arch === 'arm64')
  if (!supported) {
    console.warn(`[download-ollama] 不支持的架构: ${process.arch}，仅支持 x64（macOS 支持 x64 和 arm64）`)
    return null
  }
  const base = `${MIRROR}/ollama/ollama/releases/latest/download`
  console.log(base)
  if (process.platform === 'win32') {
    return { url: `${base}/ollama-windows-amd64.zip`, binaryName: 'ollama.exe', isZip: true }
  }
  if (process.platform === 'darwin') {
    return { url: `${base}/ollama-darwin`, binaryName: 'ollama', isZip: false }
  }
  if (process.platform === 'linux') {
    return { url: `${base}/ollama-linux-amd64`, binaryName: 'ollama', isZip: false }
  }
  console.warn(`[download-ollama] 不支持的平台: ${process.platform}`)
  return null
}

/** 检测系统是否已有 ollama */
function isOllamaOnPath() {
  const r = spawnSync('ollama', ['--version'], { stdio: 'pipe', timeout: 5000 })
  return r.status === 0
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
  const { createWriteStream } = await import('fs')
  const { pipeline } = await import('stream/promises')
  const resp = await fetch(url, { signal: AbortSignal.timeout(120_000) })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const writer = createWriteStream(destPath)
  await pipeline(resp.body, writer)
}

function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    const ps = `
      Add-Type -AssemblyName System.IO.Compression.FileSystem
      [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath.replace(/'/g, "''")}', '${destDir.replace(/'/g, "''")}')
    `
    const proc = spawn('powershell', ['-NoProfile', '-Command', ps], { stdio: 'pipe' })
    let err = ''
    proc.stderr.on('data', (c) => { err += c })
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`解压失败 (${code})`)))
    proc.on('error', reject)
  })
}

async function main() {
  // 如果系统已有 ollama，无需内嵌
  if (isOllamaOnPath()) {
    console.log('[download-ollama] 系统已安装 ollama，跳过内嵌下载')
    return
  }

  const info = getPlatformInfo()
  if (!info) {
    console.log('[download-ollama] 跳过下载')
    return
  }

  mkdirSync(DEST_DIR, { recursive: true })
  const destPath = join(DEST_DIR, info.binaryName)

  if (!process.env.FORCE_DOWNLOAD && existsSync(destPath)) {
    console.log(`[download-ollama] ${destPath} 已存在，跳过下载`)
    return
  }

  if (existsSync(destPath)) await unlink(destPath)

  // 尝试所有下载方式
  for (const method of ['curl', 'fetch']) {
    try {
      if (info.isZip) {
        const zipPath = join(DEST_DIR, 'ollama-windows-amd64.zip')
        if (method === 'curl') await downloadWithCurl(info.url, zipPath)
        else await downloadWithFetch(info.url, zipPath)

        console.log('[download-ollama] 下载完成，正在解压...')
        await extractZip(zipPath, DEST_DIR)
        await unlink(zipPath)

        // ZIP 可能包含子目录
        if (!existsSync(destPath)) {
          const sub = join(DEST_DIR, 'ollama-windows-amd64')
          if (existsSync(join(sub, info.binaryName))) {
            await (await import('fs/promises')).rename(join(sub, info.binaryName), destPath)
            await rm(sub, { recursive: true, force: true })
          }
        }

        // 删除 ZIP 解压可能产生的子目录（ollama-windows-amd64/），保留 ollama.exe + lib/
        const entries = await (await import('fs/promises')).readdir(DEST_DIR)
        for (const entry of entries) {
          if (entry !== info.binaryName && entry !== 'lib') {
            const fullPath = join(DEST_DIR, entry)
            const stat = await (await import('fs/promises')).stat(fullPath)
            if (stat.isDirectory() && entry.endsWith('-amd64')) {
              await rm(fullPath, { recursive: true, force: true })
            }
          }
        }
      } else {
        if (method === 'curl') await downloadWithCurl(info.url, destPath)
        else await downloadWithFetch(info.url, destPath)

        const { spawn } = await import('child_process')
        await new Promise((resolve, reject) => {
          const chmod = spawn('chmod', ['+x', destPath])
          chmod.on('close', (code) => code === 0 ? resolve() : reject())
        })
      }

      if (existsSync(destPath)) {
        const size = (await (await import('fs/promises')).stat(destPath)).size
        console.log(`[download-ollama] 下载完成 (${(size / 1024 / 1024).toFixed(1)} MB): ${destPath}`)
        return
      }
    } catch (err) {
      console.log(`[download-ollama] ${method} 方式下载失败: ${err.message}`)
      // 清理残骸
      try { await rm(DEST_DIR, { recursive: true, force: true }) } catch {}
      mkdirSync(DEST_DIR, { recursive: true })
    }
  }

  console.error('[download-ollama] 所有下载方式均失败。')
  console.error('[download-ollama] 请手动下载 ollama 并放置到:')
  console.error(`  ${destPath}`)
  console.error('[download-ollama] 下载地址: https://github.com/ollama/ollama/releases')
  console.error('[download-ollama] 或在系统 PATH 中安装 ollama。应用仍可正常运行（回退使用系统 ollama）。')
}

main()
