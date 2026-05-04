import { BaseCache } from '@langchain/core/caches'
import { Generation } from '@langchain/core/outputs'

const CACHE_TTL_MS = 10 * 60 * 1000 // 10分钟
// 带 TTL 的 LLM 缓存，条目超过指定时间后自动淘汰，避免内存无限增长
export class TTLCache extends BaseCache<Generation[]> {
  private store = new Map<string, { value: Generation[]; ts: number }>()

  // 淘汰超过 TTL 的条目
  private evictExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now - entry.ts > CACHE_TTL_MS) {
        this.store.delete(key)
      }
    }
  }

  async lookup(prompt: string, llmKey: string): Promise<Generation[] | null> {
    this.evictExpired()
    const key = this.keyEncoder(prompt, llmKey)
    const entry = this.store.get(key)
    return entry?.value ?? null
  }

  async update(prompt: string, llmKey: string, value: Generation[]): Promise<void> {
    this.store.set(this.keyEncoder(prompt, llmKey), { value, ts: Date.now() })
  }
}

export const llmCache = new TTLCache()