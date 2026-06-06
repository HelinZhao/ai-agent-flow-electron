import { ipcMain, app } from 'electron'
import { join } from 'path'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'

/** 头像存储根目录（相对于 userData） */
const AVATAR_SUBDIR = 'avatars'

/** 用户头像固定文件名 */
const USER_AVATAR_FILENAME = 'avatar_user.png'

function getAvatarDir(): string {
  const base = app.isPackaged
    ? app.getPath('userData')
    : join(process.cwd(), 'data')
  return join(base, AVATAR_SUBDIR)
}

/** 从 data:image/xxx;base64,.... 中提取 ext + buffer */
function parseDataUrl(dataUrl: string): { ext: string; buffer: Buffer } | null {
  const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!matches) return null
  let ext = matches[1]
  if (ext === 'jpeg') ext = 'jpg'
  if (ext === 'svg+xml') ext = 'svg'
  const buffer = Buffer.from(matches[2], 'base64')
  return { ext, buffer }
}

export function setupAvatarIPC(): void {
  // 保存头像文件，返回可访问的 URL 路径
  ipcMain.handle('avatar:save', async (_event, dataUrl: string) => {
    try {
      const parsed = parseDataUrl(dataUrl)
      if (!parsed) return { success: false, error: '无效的图片数据' }

      const { ext, buffer } = parsed
      const dir = getAvatarDir()
      await mkdir(dir, { recursive: true })

      const fileName = `avatar_${uuidv4()}.${ext}`
      const filePath = join(dir, fileName)
      await writeFile(filePath, buffer)

      return { success: true, urlPath: `/api/avatars/${fileName}` }
    } catch (error) {
      console.error('IPC保存头像失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // 删除头像文件
  ipcMain.handle('avatar:delete', async (_event, urlPath: string) => {
    try {
      // urlPath 格式: /api/avatars/filename.ext
      const fileName = urlPath.replace('/api/avatars/', '')
      if (fileName.includes('..') || fileName.includes('/')) {
        return { success: false, error: '非法的文件名' }
      }
      const filePath = join(getAvatarDir(), fileName)
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
      return { success: true }
    } catch (error) {
      console.error('IPC删除头像失败:', error)
      return { success: false, error: (error as Error).message }
    }
  })

}
