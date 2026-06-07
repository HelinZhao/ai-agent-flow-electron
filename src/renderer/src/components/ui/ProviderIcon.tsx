import React from 'react'

interface ProviderIconProps {
  provider: string
  className?: string
}

// Vite 的 glob 导入 —— 构建时静态扫描，Windows 也兼容
const iconModules = import.meta.glob('@renderer/assets/providers/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const LOGO_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(iconModules).map(([path, raw]) => {
    const name = path.replace(/^.*[/\\]/, '').replace(/\.svg$/, '')
    return [name, raw as string]
  })
)

// provider 别名映射
const ALIAS: Record<string, string> = {
  google: 'gemini',
  gcp: 'gemini',
  xai: 'grok',
  tongyi: 'qwen',
  glm: 'zhipu',
  kimi: 'moonshot',
  ernie: 'baidu',
  hunyuan: 'tencent',
  sense: 'sensetime',
  '01-ai': 'yi',
  lmstudio: 'localai',
  vllm: 'localai',
  tgi: 'localai',
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10A37F',
  anthropic: '#9447FF',
  gemini: '#4285F4',
  grok: '#000000',
  deepseek: '#3C5DFF',
  mistral: '#FF6F00',
  cohere: '#7C3AED',
  perplexity: '#1F1F3F',
  together: '#FF6B35',
  groq: '#F97316',
  meta: '#0467DF',
  zhipu: '#1677FF',
  qwen: '#1E9EF2',
  bailian: '#FF6A00',
  moonshot: '#6C5CE7',
  kimi: '#6C5CE7',
  baidu: '#2319DC',
  doubao: '#1E80FF',
  tencent: '#0052D9',
  hunyuan: '#0052D9',
  stepfun: '#2B6BF2',
  minimax: '#FF6B35',
  sensetime: '#1677FF',
  yi: '#3874FF',
  longcat: '#2E8B57', 
  azure: '#0078D4',
  aws: '#FF9900',
  bedrock: '#FF9900',
  vertex: '#4285F4',
  ollama: '#000000',
  localai: '#7C3AED',
  deepinfra: '#FF6B35',
  fireworks: '#EF4444',
  replicate: '#000000',
}

const ProviderIcon: React.FC<ProviderIconProps> = ({ provider, className = 'w-4 h-4' }) => {
  const key = ALIAS[provider] || provider
  const rawSvg = LOGO_MAP[key]
  if (!rawSvg) return null

  // 移除 XML 声明和外层 <svg> 标签，只保留内部内容
  const svgContent = rawSvg.replace(/<\?xml[^?]*\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')

  return (
    <span
      className={`${className} inline-flex items-center justify-center flex-shrink-0`}
      style={{ color: PROVIDER_COLORS[key] || 'currentColor' }}
    >
      <svg
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        className="w-full h-full"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </span>
  )
}

export default ProviderIcon
