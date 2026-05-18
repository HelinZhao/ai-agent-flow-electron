// 跨平台环境准备：Windows 上切换控制台编码为 UTF-8
import { execSync } from 'child_process'
if (process.platform === 'win32') {
  try {
    execSync('chcp 65001', { stdio: 'pipe' })
  } catch {
    // chcp 失败不影响后续启动
  }
}
