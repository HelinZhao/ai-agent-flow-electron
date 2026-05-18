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
 * 参数：
 *   --platform win32|darwin|linux   — 指定下载平台（默认自动检测当前系统）
 *   --arch x64|arm64                — 指定架构（默认自动检测当前系统）
 *
 * 环境变量：
 *   FORCE_DOWNLOAD=1     — 强制重新下载
 *   GITHUB_MIRROR=https://mirror.example.com  — GitHub Release 镜像地址
 */

import { existsSync, mkdirSync } from 'fs'
import { unlink, rm, rename, stat, readdir } from 'fs/promises'
import { join } from 'path'
import dotenv from 'dotenv'
dotenv.config()
import { spawnSync, spawn } from 'child_process'

const DEST_DIR = join(import.meta.dirname, '..', 'resources', 'ollama')
const MIRROR = process.env.GITHUB_MIRROR || 'https://github.com'
const args = process.argv.slice(2)

function parseArgs() {
  const options = { platform: process.platform, arch: process.arch }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--platform' && i + 1 < args.length) {
      options.platform = args[++i]
    } else if (args[i] === '--arch' && i + 1 < args.length) {
      options.arch = args[++i]
    }
  }
  return options
}

function getPlatformInfo() {
  const { platform, arch } = parseArgs()
  const supported = arch === 'x64' || (platform === 'darwin' && arch === 'arm64')
  if (!supported) {
    console.warn(`[download-ollama] 不支持的架构: ${arch}，仅支持 x64（macOS 支持 x64 和 arm64）`)
    return null
  }
  const base = `${MIRROR}/ollama/ollama/releases/latest/download`
  if (platform === 'win32') {
    return { url: `${base}/ollama-windows-amd64.zip`, binaryName: 'ollama.exe', archiveType: 'zip' }
  }
  if (platform === 'darwin') {
    return { url: `${base}/ollama-darwin.tgz`, binaryName: 'ollama', archiveType: 'tgz' }
  }
  if (platform === 'linux') {
    return { url: `${base}/ollama-linux-amd64.tar.zst`, binaryName: 'ollama', archiveType: 'zst' }
  }
  console.warn(`[download-ollama] 不支持的平台: ${platform}`)
  return null
}

/** 检测系统是否已有 ollama */
function isOllamaOnPath() {
  const r = spawnSync('ollama', ['--version'], { stdio: 'pipe', timeout: 5000 })
  return r.status === 0
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

function extractTgz(tgzPath, destDir) {
  return new Promise((resolve, reject) => {
    const proc = spawn('tar', ['-xzf', tgzPath, '-C', destDir], { stdio: 'pipe' })
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`tgz 解压失败 (${code})`)))
    proc.on('error', () => reject(new Error('tar 不可用')))
  })
}

function extractZst(archivePath, destDir) {
  return new Promise((resolve, reject) => {
    const proc = spawn('tar', ['--zstd', '-xf', archivePath, '-C', destDir], { stdio: 'pipe' })
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`zst 解压失败 (${code})`)))
    proc.on('error', () => reject(new Error('tar 或 zstd 不可用')))
  })
}

/** 在 destDir 的子目录中搜索 binaryName，找到后移动到 destPath */
async function findAndMoveBinary(destDir, binaryName, destPath) {
  const dirs = (await readdir(destDir, { withFileTypes: true }))
    .filter(d => d.isDirectory())
    .map(d => d.name)
  for (const dir of dirs) {
    const candidate = join(destDir, dir, binaryName)
    if (existsSync(candidate)) {
      await rename(candidate, destPath)
      await rm(join(destDir, dir), { recursive: true, force: true })
      return true
    }
  }
  return false
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

  // 下载并解压
  try {
    if (info.archiveType === 'zip') {
      const zipPath = join(DEST_DIR, info.url.split('/').pop())
      await downloadWithFetch(info.url, zipPath)

      console.log('[download-ollama] 下载完成，正在解压...')
      await extractZip(zipPath, DEST_DIR)
      await unlink(zipPath)

      // ZIP 解压后可能产生子目录（如 ollama-windows-amd64/）
      if (!existsSync(destPath)) {
        await findAndMoveBinary(DEST_DIR, info.binaryName, destPath)
      }

      // 保留 binary + lib/，删除解压产生的多余目录
      const entries = await readdir(DEST_DIR)
      for (const entry of entries) {
        if (entry !== info.binaryName && entry !== 'lib') {
          const fullPath = join(DEST_DIR, entry)
          const s = await stat(fullPath)
          if (s.isDirectory()) {
            await rm(fullPath, { recursive: true, force: true })
          }
        }
      }
    } else {
      // tgz / zst — 下载压缩包、解压、设置可执行权限
      const archiveName = info.url.split('/').pop()
      const archivePath = join(DEST_DIR, archiveName)
      await downloadWithFetch(info.url, archivePath)

      console.log('[download-ollama] 下载完成，正在解压...')
      if (info.archiveType === 'tgz') await extractTgz(archivePath, DEST_DIR)
      else if (info.archiveType === 'zst') await extractZst(archivePath, DEST_DIR)
      await unlink(archivePath)

      // tgz/zst 解压后二进制可能在子目录中（如 bin/ollama）
      if (!existsSync(destPath)) {
        await findAndMoveBinary(DEST_DIR, info.binaryName, destPath)
      }

      if (existsSync(destPath)) {
        spawn('chmod', ['+x', destPath])
      }
    }

    if (existsSync(destPath)) {
      const size = (await stat(destPath)).size
      console.log(`[download-ollama] 下载完成 (${(size / 1024 / 1024).toFixed(1)} MB): ${destPath}`)
      return
    }

    throw new Error('解压后未找到可执行文件')
  } catch (err) {
    console.error(`[download-ollama] 下载失败: ${err.message}`)
    console.error('[download-ollama] 请手动下载 ollama 并放置到:')
    console.error(`  ${destPath}`)
    console.error('[download-ollama] 下载地址: https://github.com/ollama/ollama/releases')
    console.error('[download-ollama] 或在系统 PATH 中安装 ollama。应用仍可正常运行（回退使用系统 ollama）。')
  }
}

main()
