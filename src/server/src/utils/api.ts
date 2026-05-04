import { ApiConfig } from '../types'

export const executeApiCall = async (apiConfig: ApiConfig): Promise<any> => {
  try {
    const response = await fetch(apiConfig.url, {
      method: apiConfig.method,
      headers: apiConfig.headers || {},
      body: apiConfig.body ? JSON.stringify(apiConfig.body) : undefined,
      signal: apiConfig.timeout ? AbortSignal.timeout(apiConfig.timeout) : undefined
    })

    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    throw new Error(`API调用错误: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}