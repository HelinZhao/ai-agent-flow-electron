import React from 'react'
import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { KnowledgeBase } from '@renderer/types'
import CustomInput from '@renderer/components/ui/CustomInput'
import CustomButton from '@renderer/components/ui/CustomButton'
import CustomSelect from '@renderer/components/ui/CustomSelect'
import { KB_DEFAULTS, CHUNK_SIZE_RANGE, CHUNK_OVERLAP_RANGE, TOP_K_RANGE, EXTERNAL_KB_PROVIDER_META, VECTOR_STORE_OPTIONS, VECTOR_STORE_CONFIG_FIELDS, VECTOR_STORE_DEFAULTS } from '@renderer/config'

interface KnowledgeFormPanelProps {
  show: boolean
  editingId: string | null
  isLoading: boolean
  onSubmit: () => void
  onClose: () => void
  register: UseFormRegister<KnowledgeBase>
  watch: UseFormWatch<KnowledgeBase>
  setValue: UseFormSetValue<KnowledgeBase>
  errors: FieldErrors<KnowledgeBase>
  kbType: string
  handleProviderChange: (provider: string) => void
}

const KnowledgeFormPanel: React.FC<KnowledgeFormPanelProps> = ({
  show,
  editingId,
  isLoading,
  onSubmit,
  onClose,
  register,
  watch,
  setValue,
  errors,
  kbType,
  handleProviderChange
}) => {
  if (!show) return null

  const getVectorConfigValue = (key: string): any => {
    try { return JSON.parse(watch('vectorConfig') || '{}')[key] } catch { return undefined }
  }

  const setVectorConfigValue = (key: string, value: any): void => {
    const current = watch('vectorConfig') || '{}'
    let parsed: Record<string, any> = {}
    try { parsed = JSON.parse(current) } catch { /* ignore */ }
    parsed[key] = value
    setValue('vectorConfig', JSON.stringify(parsed))
  }

  const getProviderConfigValue = (key: string): any => {
    try { return JSON.parse(watch('providerConfig') || '{}')[key] } catch { return undefined }
  }

  const setProviderConfigValue = (key: string, value: any): void => {
    const current = watch('providerConfig') || '{}'
    let parsed: Record<string, any> = {}
    try { parsed = JSON.parse(current) } catch { /* ignore */ }
    parsed[key] = value
    setValue('providerConfig', JSON.stringify(parsed))
  }

  return (
    <div className="mt-5 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {editingId ? '编辑知识库' : '创建知识库'}
        </span>
        <button onClick={onClose}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <form onSubmit={onSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">名称</label>
          <CustomInput {...register('name', { required: '请输入知识库名称' })} placeholder="例如：产品文档库" error={errors.name?.message} size='sm' />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">描述</label>
          <CustomInput {...register('description')} placeholder="知识库用途说明" size='sm' />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">类型</label>
          <div className="flex space-x-3">
            <button type="button" onClick={() => setValue('type', 'internal')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border text-sm transition-colors ${kbType === 'internal'
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v13.5zM8 7h8m-8 4h5" /></svg>
              <span>内部知识库</span>
            </button>
            <button type="button" onClick={() => setValue('type', 'external')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border text-sm transition-colors ${kbType === 'external'
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <span>外部知识库</span>
            </button>
          </div>
        </div>
        {kbType === 'internal' && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">向量引擎</label>
              <CustomSelect value={watch('vectorStore') || 'sqlite-vec'} onChange={(v) => { setValue('vectorStore', v); setValue('vectorConfig', '') }}
                options={VECTOR_STORE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))} placeholder="选择向量引擎" size='sm' />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{VECTOR_STORE_DEFAULTS[watch('vectorStore') || 'sqlite-vec'] || ''}</p>
            </div>
            {VECTOR_STORE_CONFIG_FIELDS[watch('vectorStore') || ''] && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 space-y-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">连接配置</p>
                {VECTOR_STORE_CONFIG_FIELDS[watch('vectorStore') || ''].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{field.label}{field.required ? ' *' : ''}</label>
                    <CustomInput type={field.type} placeholder={field.placeholder}
                      value={getVectorConfigValue(field.key) || ''} onChange={(e) => setVectorConfigValue(field.key, e.target.value)} size='sm' />
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500">Embedding 模型根据活跃 LLM 提供商自动选择</p>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">分块大小</label>
                <CustomInput type="number" min={CHUNK_SIZE_RANGE.min} max={CHUNK_SIZE_RANGE.max} {...register('chunkSize', { valueAsNumber: true })} size='sm' /></div>
              <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">分块重叠</label>
                <CustomInput type="number" min={CHUNK_OVERLAP_RANGE.min} max={CHUNK_OVERLAP_RANGE.max} {...register('chunkOverlap', { valueAsNumber: true })} size='sm' /></div>
              <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">检索数量</label>
                <CustomInput type="number" min={TOP_K_RANGE.min} max={TOP_K_RANGE.max} {...register('topK', { valueAsNumber: true })} size='sm' /></div>
            </div>
          </div>
        )}
        {kbType === 'external' && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
            <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">提供商</label>
              <CustomSelect value={watch('provider') || 'generic'} onChange={handleProviderChange}
                options={Object.entries(EXTERNAL_KB_PROVIDER_META).map(([key, meta]) => ({ value: key, label: meta.name }))}
                placeholder="选择提供商" size='sm' />
              {watch('provider') && watch('provider') !== 'generic' && EXTERNAL_KB_PROVIDER_META[watch('provider')!]?.docs && (
                <a href={EXTERNAL_KB_PROVIDER_META[watch('provider')!].docs} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 mt-1 inline-block">
                  查看 {EXTERNAL_KB_PROVIDER_META[watch('provider')!].name} 文档 →
                </a>
              )}
            </div>
            <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">API 地址</label>
              <CustomInput {...register('apiUrl', { required: kbType === 'external' ? '请输入API地址' : false })}
                placeholder="https://your-api.com/retrieve" error={errors.apiUrl?.message} size='sm' /></div>
            <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">API Key（可选）</label>
              <CustomInput type="password" {...register('apiKey')} placeholder="Bearer token" size='sm' /></div>
            {watch('provider') === 'dify' && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Dify 检索配置</p>
                <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">搜索模式</label>
                  <CustomSelect value={getProviderConfigValue('search_method') || 'keyword_search'}
                    onChange={(v) => setProviderConfigValue('search_method', v)}
                    options={[{ value: 'keyword_search', label: '关键字搜索' }, { value: 'semantic_search', label: '语义搜索' }, { value: 'hybrid_search', label: '混合搜索' }, { value: 'full_text_search', label: '全文搜索' }]} size='sm' /></div>
              </div>
            )}
            <div><label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">检索数量</label>
              <CustomInput type="number" min={TOP_K_RANGE.min} max={TOP_K_RANGE.max} {...register('topK', { valueAsNumber: true })} size='sm' /></div>
          </div>
        )}
        <div className="flex space-x-3 pt-2 justify-end">
          <CustomButton type="submit" disabled={isLoading} variant="primary" size='sm'>
            {isLoading ? '保存中...' : editingId ? '更新' : '创建'}
          </CustomButton>
          <CustomButton type="button" onClick={onClose} variant="secondary" size='sm'>取消</CustomButton>
        </div>
      </form>
    </div>
  )
}

export default React.memo(KnowledgeFormPanel)
