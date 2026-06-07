// ---------------------------------------------------------------------------
// 模型能力映射
// 内置主流模型的能力清单，新增 llm config 时按此默认勾选，用户可手动修正
// ---------------------------------------------------------------------------

export type ModelCapability = 'text' | 'vision' | 'tool_use' | 'streaming'

export const ALL_CAPABILITIES: ModelCapability[] = ['text', 'vision', 'tool_use', 'streaming']

const MODEL_CAPABILITIES: Record<string, ModelCapability[]> = {
  // ===== OpenAI =====
  'gpt-4o': ['text', 'vision', 'tool_use', 'streaming'],
  'gpt-4o-mini': ['text', 'vision', 'tool_use', 'streaming'],
  'gpt-4o-audio-preview': ['text', 'vision', 'tool_use', 'streaming'],
  'gpt-4.1': ['text', 'vision', 'tool_use', 'streaming'],
  'gpt-4.1-mini': ['text', 'vision', 'tool_use', 'streaming'],
  'gpt-4.1-nano': ['text', 'vision', 'tool_use', 'streaming'],
  'gpt-4.5-preview': ['text', 'vision', 'tool_use', 'streaming'],
  'gpt-4-turbo': ['text', 'vision', 'tool_use', 'streaming'],
  'gpt-4': ['text', 'tool_use', 'streaming'],
  'gpt-3.5-turbo': ['text', 'tool_use', 'streaming'],
  'o4-mini': ['text', 'tool_use'],
  'o3': ['text', 'tool_use'],
  'o3-mini': ['text', 'tool_use'],
  'o1': ['text', 'tool_use'],
  'o1-mini': ['text', 'tool_use'],
  'o1-preview': ['text', 'tool_use'],
  // ===== Anthropic =====
  'claude-sonnet-4-6': ['text', 'vision', 'tool_use', 'streaming'],
  'claude-opus-4-8': ['text', 'vision', 'tool_use', 'streaming'],
  'claude-3-5-sonnet': ['text', 'vision', 'tool_use', 'streaming'],
  'claude-3-5-haiku': ['text', 'vision', 'tool_use', 'streaming'],
  'claude-3-opus': ['text', 'vision', 'tool_use', 'streaming'],
  'claude-3-sonnet': ['text', 'vision', 'tool_use', 'streaming'],
  'claude-3-haiku': ['text', 'vision', 'tool_use', 'streaming'],
  // ===== Google Gemini =====
  'gemini-2.5-pro': ['text', 'vision', 'tool_use', 'streaming'],
  'gemini-2.5-flash': ['text', 'vision', 'tool_use', 'streaming'],
  'gemini-2.0-flash': ['text', 'vision', 'tool_use', 'streaming'],
  'gemini-2.0-flash-lite': ['text', 'tool_use', 'streaming'],
  'gemini-1.5-pro': ['text', 'vision', 'tool_use', 'streaming'],
  'gemini-1.5-flash': ['text', 'vision', 'tool_use', 'streaming'],
  // ===== DeepSeek =====
  'deepseek-chat': ['text', 'tool_use', 'streaming'],
  'deepseek-v4-pro': ['text', 'vision', 'tool_use', 'streaming'],
  'deepseek-v4-flash': ['text', 'vision', 'tool_use', 'streaming'],
  'deepseek-v3': ['text', 'tool_use', 'streaming'],
  'deepseek-r1': ['text', 'streaming'],
  'deepseek-reasoner': ['text', 'streaming'],
  // ===== xAI Grok =====
  'grok-3': ['text', 'vision', 'tool_use', 'streaming'],
  'grok-3-mini': ['text', 'tool_use', 'streaming'],
  'grok-2': ['text', 'vision', 'tool_use', 'streaming'],
  'grok-2-vision': ['text', 'vision', 'streaming'],
  // ===== Meta Llama (原生 / Ollama) =====
  'llama4': ['text', 'vision', 'tool_use', 'streaming'],
  'llama4-maverick': ['text', 'vision', 'tool_use', 'streaming'],
  'llama4-scout': ['text', 'vision', 'tool_use', 'streaming'],
  'llama3.3': ['text', 'tool_use', 'streaming'],
  'llama3.2': ['text', 'streaming'],
  'llama3.2-vision': ['text', 'vision', 'streaming'],
  'llama3.1': ['text', 'tool_use', 'streaming'],
  'llama3': ['text', 'streaming'],
  // ===== Qwen =====
  'qwen3': ['text', 'tool_use', 'streaming'],
  'qwen3-vl': ['text', 'vision', 'tool_use', 'streaming'],
  'qwen2.5': ['text', 'streaming'],
  'qwen2.5-vl': ['text', 'vision', 'streaming'],
  'qwen2.5-coder': ['text', 'streaming'],
  'qwen2': ['text', 'streaming'],
  // ===== Mistral =====
  'mistral-large': ['text', 'tool_use', 'streaming'],
  'mistral-small': ['text', 'tool_use', 'streaming'],
  'mistral-nemo': ['text', 'streaming'],
  'mixtral': ['text', 'streaming'],
  'codestral': ['text', 'streaming'],
  'ministral-3b': ['text', 'streaming'],
  'ministral-8b': ['text', 'streaming'],
  // ===== Google 开源 =====
  'gemma3': ['text', 'vision', 'streaming'],
  'gemma2': ['text', 'streaming'],
  // ===== Microsoft =====
  'phi-4': ['text', 'streaming'],
  'phi-4-multimodal': ['text', 'vision', 'streaming'],
  'phi-3': ['text', 'streaming'],
  // ===== Cohere =====
  'command-r-plus': ['text', 'tool_use', 'streaming'],
  'command-r': ['text', 'tool_use', 'streaming'],
  'command-a': ['text', 'tool_use', 'streaming'],
  // ===== Perplexity =====
  'sonar-pro': ['text', 'tool_use', 'streaming'],
  'sonar-reasoning': ['text', 'streaming'],
  // ===== Yi / 01.AI =====
  'yi-lightning': ['text', 'streaming'],
  'yi-1.5': ['text', 'streaming'],
  // ===== 阿里通义千问 =====
  'qwen-turbo': ['text', 'streaming'],
  'qwen-plus': ['text', 'tool_use', 'streaming'],
  'qwen-max': ['text', 'tool_use', 'streaming'],
  // ===== 百度文心 =====
  'ernie-4.0': ['text', 'streaming'],
  'ernie-3.5': ['text', 'streaming'],
  // ===== 月之暗面 Moonshot =====
  'moonshot-v1': ['text', 'streaming'],
  'moonshot-v1-32k': ['text', 'streaming'],
  // ===== 智谱 GLM =====
  'glm-4-plus': ['text', 'tool_use', 'streaming'],
  'glm-4': ['text', 'tool_use', 'streaming'],
  'glm-4v': ['text', 'vision', 'streaming'],
  'glm-4-flash': ['text', 'tool_use', 'streaming'],
}

// 按 provider 兜底（精确模型名未命中时使用）
const PROVIDER_DEFAULT_CAPABILITIES: Record<string, ModelCapability[]> = {
  // 标准 API 提供商
  'openai': ['text', 'tool_use', 'streaming'],
  'anthropic': ['text', 'vision', 'tool_use', 'streaming'],
  'deepseek': ['text', 'tool_use', 'streaming'],
  'google': ['text', 'vision', 'tool_use', 'streaming'],
  'gemini': ['text', 'vision', 'tool_use', 'streaming'],
  'xai': ['text', 'vision', 'tool_use', 'streaming'],
  'grok': ['text', 'vision', 'tool_use', 'streaming'],
  'mistral': ['text', 'tool_use', 'streaming'],
  'cohere': ['text', 'tool_use', 'streaming'],
  'perplexity': ['text', 'tool_use', 'streaming'],
  'together': ['text', 'tool_use', 'streaming'],
  'groq': ['text', 'tool_use', 'streaming'],
  'meta': ['text', 'tool_use', 'streaming'],
  // 本地 / 自托管
  'ollama': ['text', 'tool_use', 'streaming'],
  'localai': ['text', 'tool_use', 'streaming'],
  'lmstudio': ['text', 'tool_use', 'streaming'],
  'vllm': ['text', 'tool_use', 'streaming'],
  'tgi': ['text', 'tool_use', 'streaming'],
  // 云平台
  'azure': ['text', 'tool_use', 'streaming'],
  'aws': ['text', 'tool_use', 'streaming'],
  'bedrock': ['text', 'tool_use', 'streaming'],
  'vertex': ['text', 'vision', 'tool_use', 'streaming'],
  'gcp': ['text', 'vision', 'tool_use', 'streaming'],
  // 国内厂商
  'bailian': ['text', 'tool_use', 'streaming'],
  'longcat': ['text', 'tool_use', 'streaming'],
  'qwen': ['text', 'tool_use', 'streaming'],
  'tongyi': ['text', 'tool_use', 'streaming'],
  'zhipu': ['text', 'tool_use', 'streaming'],
  'glm': ['text', 'tool_use', 'streaming'],
  'moonshot': ['text', 'tool_use', 'streaming'],
  'kimi': ['text', 'tool_use', 'streaming'],
  'baidu': ['text', 'tool_use', 'streaming'],
  'ernie': ['text', 'tool_use', 'streaming'],
  'doubao': ['text', 'tool_use', 'streaming'],
  'hunyuan': ['text', 'tool_use', 'streaming'],
  'tencent': ['text', 'tool_use', 'streaming'],
  'stepfun': ['text', 'tool_use', 'streaming'],
  'minimax': ['text', 'tool_use', 'streaming'],
  'sensetime': ['text', 'tool_use', 'streaming'],
  '01-ai': ['text', 'tool_use', 'streaming'],
  'yi': ['text', 'tool_use', 'streaming'],
  'deepinfra': ['text', 'tool_use', 'streaming'],
  'fireworks': ['text', 'tool_use', 'streaming'],
  'replicate': ['text', 'tool_use', 'streaming'],
}

/**
 * 根据模型名 + provider 返回默认能力列表
 * 精确匹配 → provider 兜底 
 */
export function getDefaultCapabilities(model: string, provider: string): ModelCapability[] {
  return MODEL_CAPABILITIES[model] ?? PROVIDER_DEFAULT_CAPABILITIES[provider] ?? ['text', 'tool_use', 'streaming']
}
