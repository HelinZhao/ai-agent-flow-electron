import { exec } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

const GIT_CONFIG_FILE = 'git-config.json'
const DATA_DIR = 'data/export'

function getConfigPath(): string {
  const base = app.isPackaged
    ? app.getPath('userData')
    : join(process.cwd(), 'data')
  return join(base, GIT_CONFIG_FILE)
}

export interface GitConfig {
  enabled: boolean
  repoPath: string
}

function execGit(cmd: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd, timeout: 10000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout.trim())
    })
  })
}

export function loadConfig(): GitConfig {
  try {
    const raw = readFileSync(getConfigPath(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { enabled: false, repoPath: '' }
  }
}

export function saveConfig(config: GitConfig): void {
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8')
}

export async function initRepo(repoPath: string): Promise<void> {
  if (!existsSync(repoPath)) {
    mkdirSync(repoPath, { recursive: true })
  }
  // init if not already
  if (!existsSync(join(repoPath, '.git'))) {
    await execGit('git init', repoPath)
  }
  // bypass Windows safe.directory check (run from a known-safe directory)
  const safeCwd = app.isPackaged ? app.getPath('userData') : join(process.cwd(), 'data')
  await execGit(`git config --global --add safe.directory "${repoPath}"`, safeCwd).catch(() => {})
  // ensure .gitignore
  const gitignorePath = join(repoPath, '.gitignore')
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, 'uploads/\nattachments/\nchat_records/\n*.db\n*.db-journal\nnode_modules/\n', 'utf-8')
  }
  // set local user config (repo scope, won't affect global)
  await execGit('git config user.name "Agent Flow"', repoPath).catch(() => {})
  await execGit('git config user.email "agent-flow@local"', repoPath).catch(() => {})
}

export async function writeEntityJson(repoPath: string, type: string, entity: { id: string; [key: string]: any }): Promise<string> {
  const dir = join(repoPath, DATA_DIR, type)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const filePath = join(dir, `${entity.id}.json`)
  writeFileSync(filePath, JSON.stringify(entity, null, 2), 'utf-8')
  return filePath
}

export async function deleteEntityJson(repoPath: string, type: string, id: string): Promise<string> {
  const filePath = join(repoPath, DATA_DIR, type, `${id}.json`)
  if (existsSync(filePath)) {
    // git rm and keep local file for history
    await execGit(`git rm --cached "${DATA_DIR}/${type}/${id}.json"`, repoPath).catch(() => {})
  }
  return filePath
}

export async function autoCommit(
  repoPath: string,
  files: string[],
  message: string,
): Promise<void> {
  const relative = files.map(f => `"${DATA_DIR}/${f}"`).join(' ')
  await execGit(`git add ${relative}`, repoPath)
  // only commit if there are staged changes
  const status = await execGit('git status --porcelain', repoPath)
  if (status) {
    await execGit(`git commit -m "${message.replace(/"/g, '\\"')}" --allow-empty`, repoPath)
  }
}

export async function getCommitFiles(repoPath: string, hash: string): Promise<{ status: string; file: string }[]> {
  const raw = await execGit(`git diff-tree --no-commit-id --name-status -r ${hash}`, repoPath)
  if (!raw) return []
  return raw.split('\n').filter(Boolean).map(line => ({
    status: line[0],
    file: line.substring(2),
  }))
}

export async function getHistory(repoPath: string, filePath?: string): Promise<{ hash: string; date: string; message: string }[]> {
  const fileArg = filePath ? ` -- "${DATA_DIR}/${filePath}"` : ''
  const log = await execGit(`git log --oneline --pretty=format:"%h|%ai|%s"${fileArg}`, repoPath)
  if (!log) return []
  return log.split('\n').map(line => {
    const [hash, date, ...msgParts] = line.split('|')
    return { hash, date, message: msgParts.join('|') }
  })
}

export async function getDiff(
  repoPath: string,
  hash1: string,
  hash2: string,
  filePath?: string,
): Promise<string> {
  const fileArg = filePath ? ` -- "${DATA_DIR}/${filePath}"` : ''
  return execGit(`git diff ${hash1} ${hash2}${fileArg}`, repoPath)
}

export async function restoreFile(repoPath: string, hash: string, filePath: string): Promise<void> {
  await execGit(`git checkout ${hash} -- "${DATA_DIR}/${filePath}"`, repoPath)
  // immediately commit the restore
  await execGit(`git add "${DATA_DIR}/${filePath}"`, repoPath)
  await execGit(`git commit -m "restore: ${filePath} from ${hash}"`, repoPath)
}

export async function getStatus(repoPath: string): Promise<{ total: number; unstaged: number; lastCommit: string | null }> {
  const total = parseInt(await execGit('git rev-list --count HEAD', repoPath).catch(() => '0'))
  const unstagedRaw = await execGit('git status --porcelain', repoPath)
  const unstaged = unstagedRaw ? unstagedRaw.split('\n').length : 0
  const lastCommit = await execGit('git log -1 --pretty=format:"%h %s"', repoPath).catch(() => '')
  return { total, unstaged, lastCommit: lastCommit || null }
}

export interface GitFileStatus {
  staged: string    // first column: 'M' | 'A' | 'D' | ' ' | '?'
  unstaged: string  // second column: 'M' | 'D' | ' ' | '?'
  file: string
}

export async function getDetailedStatus(repoPath: string): Promise<GitFileStatus[]> {
  const raw = await execGit('git status --porcelain', repoPath)
  if (!raw) return []
  return raw.split('\n').filter(Boolean).map(line => ({
    staged: line[0],
    unstaged: line[1],
    file: line.substring(3),
  })).filter(f => f.file.startsWith(DATA_DIR + '/'))
}

export async function stageFile(repoPath: string, filePath: string): Promise<void> {
  await execGit(`git add -- "${filePath}"`, repoPath)
}

export async function unstageFile(repoPath: string, filePath: string): Promise<void> {
  await execGit(`git restore --staged -- "${filePath}"`, repoPath)
}

export async function stageAllFiles(repoPath: string): Promise<void> {
  await execGit(`git add -A`, repoPath)
}

export async function commitWithMessage(repoPath: string, message: string): Promise<void> {
  // commit only what's already staged
  const status = await execGit('git status --porcelain', repoPath)
  if (status) {
    await execGit(`git commit -m "${message.replace(/"/g, '\\"')}"`, repoPath)
  }
}

export async function showFileAtCommit(repoPath: string, hash: string, filePath: string): Promise<string> {
  return execGit(`git show ${hash}:"${filePath}"`, repoPath)
}

export async function readFileAtCommit(repoPath: string, hash: string, filePath: string): Promise<string> {
  return execGit(`git show ${hash}:"${filePath}"`, repoPath)
}

export async function getCommitFileDiff(repoPath: string, hash: string, filePath: string): Promise<string> {
  return execGit(`git show ${hash} -- "${filePath}"`, repoPath)
}

export async function getWorkingTreeDiff(repoPath: string, filePath: string): Promise<string> {
  return execGit(`git diff -- "${filePath}"`, repoPath)
}

export async function getStagedDiff(repoPath: string, filePath: string): Promise<string> {
  return execGit(`git diff --cached -- "${filePath}"`, repoPath)
}
