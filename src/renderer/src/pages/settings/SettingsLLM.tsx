import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAppStore } from '@renderer/store/appStore';
import { LLMConfig } from '@renderer/types';
import { llmConfigApi } from '@renderer/lib/api';
import CustomSelect, { SelectOption } from '@renderer/components/ui/CustomSelect';
import CustomInput from '@renderer/components/ui/CustomInput';
import Modal from '@renderer/components/ui/Modal';
import CustomButton from '@renderer/components/ui/CustomButton';
import { LLM_DEFAULTS, PROVIDER_MATES, TEMPERATURE_RANGE, MAX_TOKENS_RANGE, MIN_LLM_CONFIG_COUNT } from '@renderer/config';
import MessageBanner from '@renderer/components/ui/MessageBanner';
import { ALL_CAPABILITIES, getDefaultCapabilities } from '@renderer/lib/llmCapabilities';
import ProviderIcon from '@renderer/components/ui/ProviderIcon';

function TemperatureSlider({ value, onChange, min, max, step }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative flex-1" ref={trackRef}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ '--range-progress': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
        className="w-full"
      />
    </div>
  )
}

export default function SettingsLLM(): React.JSX.Element {
  const {
    llmConfigs,
    addLLMConfig,
    updateLLMConfig,
    deleteLLMConfig,
    activateLLMConfig,
  } = useAppStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; scope?: 'page' | 'modal' } | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, watch, getValues, setValue } = useForm<LLMConfig>({
    defaultValues: {
      name: '',
      provider: LLM_DEFAULTS.provider,
      apiKey: '',
      model: LLM_DEFAULTS.model,
      baseUrl: LLM_DEFAULTS.baseUrl,
      temperature: LLM_DEFAULTS.temperature,
      maxTokens: LLM_DEFAULTS.maxTokens,
      capabilities: ['text', 'tool_use', 'streaming'],
      isActive: false,
    }
  });
  const provider = watch('provider')
  const model = watch('model')

  // 模型/提供商变更时自动更新能力勾选（仅新建模式，编辑时保留用户选择）
  useEffect(() => {
    if (!editingConfig && showForm) {
      const defaults = getDefaultCapabilities(model, provider)
      setValue('capabilities', defaults)
    }
  }, [model, provider, editingConfig, showForm, setValue])

  const onSubmit = async (data: LLMConfig): Promise<void> => {
    setIsSaving(true);
    setMessage(null);

    try {
      if (data.apiKey) {
        const previderMate = PROVIDER_MATES[data.provider]
        if (previderMate && !data.apiKey.startsWith(previderMate.prefix)) {
          const message = `${previderMate.name} API Key必须以${previderMate.prefix}开头`;
          throw new Error(message);
        }
      }

      if (editingConfig) {
        await updateLLMConfig(editingConfig, data);
        setMessage({ type: 'success', text: '配置更新成功！' });
      } else {
        await addLLMConfig(data);
        setMessage({ type: 'success', text: '配置创建成功！' });
      }

      reset();
      setShowForm(false);
      setEditingConfig(null);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '操作失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (config: LLMConfig) => {
    setEditingConfig(config.id!);
    reset({
      ...config,
      capabilities: config.capabilities ?? getDefaultCapabilities(config.model, config.provider),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个配置吗？')) return;

    setIsSaving(true);
    try {
      await deleteLLMConfig(id);
      setMessage({ type: 'success', text: '配置删除成功！' });
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: '删除失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    setIsSaving(true);
    try {
      await activateLLMConfig(id);
      setMessage({ type: 'success', text: '配置切换成功！' });
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: '切换失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (): Promise<void> => {
    setIsTesting(true);
    setMessage(null);

    try {
      const currentConfig = getValues();

      if (!currentConfig.apiKey) {
        throw new Error('请先输入API Key');
      }
      if (!currentConfig.model) {
        throw new Error('请先输入模型名称');
      }

      const result = await llmConfigApi.testConnection({
        provider: currentConfig.provider,
        apiKey: currentConfig.apiKey,
        model: currentConfig.model,
        baseUrl: currentConfig.baseUrl,
      })

      if (result.success) {
        setMessage({
          type: 'success',
          scope: 'modal',
          text: `连接测试成功！API响应正常。LLM回复: ${result.response}`
        });
      } else {
        throw new Error('连接测试返回异常结果');
      }
    } catch (error) {
      console.error('连接测试失败:', error);
      setMessage({
        type: 'error',
        scope: 'modal',
        text: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const startNewConfig = () => {
    reset({
      name: '',
      provider: LLM_DEFAULTS.provider,
      apiKey: '',
      model: LLM_DEFAULTS.model,
      baseUrl: LLM_DEFAULTS.baseUrl,
      temperature: LLM_DEFAULTS.temperature,
      maxTokens: LLM_DEFAULTS.maxTokens,
      capabilities: getDefaultCapabilities(LLM_DEFAULTS.model, LLM_DEFAULTS.provider),
      isActive: false,
    });
    setEditingConfig(null);
    setShowForm(true);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">大模型API配置</h3>
        <CustomButton
          onClick={startNewConfig}
          variant="primary"
          size="sm"
        >
          + 新建配置
        </CustomButton>
      </div>

      {message && message.scope !== 'modal' && (
        <MessageBanner
          type={message.type}
          text={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      {/* 配置列表 */}
      <div className="space-y-3 mb-6">
        {llmConfigs.map((config) => (
          <div key={config.id} className={`group relative rounded-xl border transition-all duration-200 ${config.isActive
            ? 'border-blue-300 dark:border-blue-600 bg-gradient-to-r from-blue-50/80 to-white dark:from-blue-900/15 dark:to-gray-800/80 shadow-sm shadow-blue-500/10'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
            }`}>
            {/* 活跃指示条 */}
            {config.isActive && (
              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-full" />
            )}
            <div className="p-4 pl-5">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {config.isActive && (
                      <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                        当前使用
                      </span>
                    )}
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">{config.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <ProviderIcon provider={config.provider} className="w-3.5 h-3.5" />
                      {config.provider}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>{config.model}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {!config.isActive && (
                    <CustomButton
                      onClick={() => handleActivate(config.id!)}
                      variant="success"
                      size="sm"
                      disabled={isSaving || isTesting}
                    >
                      启用
                    </CustomButton>
                  )}
                  <CustomButton
                    onClick={() => handleEdit(config)}
                    variant="secondary"
                    size="sm"
                    className="!px-2.5"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    <span className="hidden sm:inline">编辑</span>
                  </CustomButton>
                  <CustomButton
                    onClick={() => handleDelete(config.id!)}
                    variant="ghost"
                    size="sm"
                    disabled={llmConfigs.length <= MIN_LLM_CONFIG_COUNT}
                    className="!px-2.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </CustomButton>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 配置表单弹窗 */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingConfig(null); reset() }}
        title={editingConfig ? '编辑配置' : '新建配置'}
        footer={
          <>
            <CustomButton
              type="button"
              onClick={testConnection}
              disabled={isSaving || isTesting || (provider !== 'ollama' && !watch('apiKey'))}
              variant="secondary"
              size='sm'
            >
              {isTesting ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              )}
              <span>{isTesting ? '测试中...' : '测试连接'}</span>
            </CustomButton>
            <CustomButton
              type="submit"
              disabled={isSaving || isTesting}
              variant="primary"
              size='sm'
              form="llm-config-form"
            >
              {isSaving ? '保存中...' : editingConfig ? '更新配置' : '创建配置'}
            </CustomButton>
            <CustomButton
              type="button"
              onClick={() => {
                setIsTesting(false);
                setShowForm(false);
                setEditingConfig(null);
                reset();
              }}
              variant="ghost"
              size='sm'
            >
              取消
            </CustomButton>
          </>
        }
      >
        {message?.scope === 'modal' && (
          <MessageBanner
            type={message.type}
            text={message.text}
            onClose={() => setMessage(null)}
          />
        )}
        <form id="llm-config-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              配置名称 *
            </label>
            <CustomInput
              {...register('name', { required: '请输入配置名称' })}
              placeholder="例如：OpenAI 主配置"
              error={errors.name?.message}
              size='sm'
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              提供商
            </label>
            <CustomSelect
              value={provider}
              onChange={(value) => {
                setValue('provider', value as LLMConfig['provider'], { shouldValidate: true });
                // 切换供应商时自动更新能力勾选（新建模式）
                if (!editingConfig) {
                  const defaults = getDefaultCapabilities(watch('model'), value)
                  setValue('capabilities', defaults)
                }
              }}
              options={(() => {
                const groupOrder = ['国际', '国内', '云平台', '本地', '聚合']
                const groups: Record<string, [string, typeof PROVIDER_MATES[string]][]> = {}
                for (const [k, v] of Object.entries(PROVIDER_MATES)) {
                  const g = v.group || '其他'
                  ;(groups[g] ??= []).push([k, v])
                }
                const opts: SelectOption[] = []
                for (const g of groupOrder) {
                  const items = groups[g]
                  if (!items?.length) continue
                  opts.push({ value: `__group_${g}`, label: <span className="text-[11px] font-semibold tracking-wide text-gray-400 dark:text-gray-500 uppercase">{g}</span>, disabled: true })
                  for (const [key, mate] of items) {
                    opts.push({
                      value: key,
                      label: (
                        <span className="flex items-center gap-2.5">
                          <ProviderIcon provider={key} className="w-4 h-4 shrink-0" />
                          <span className="truncate">{mate.name}</span>
                        </span>
                      ),
                    })
                  }
                }
                return opts
              })()}
              placeholder="选择提供商"
              error={!!errors.provider}
              size='sm'
            />
            {errors.provider && (
              <p className="mt-1 text-sm text-red-600">{errors.provider.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              API Key {provider !== 'ollama' ? '*' : ''}
            </label>
            {provider === 'ollama' ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">Ollama 本地模型不需要 API Key</p>
            ) : (
              <>
                <CustomInput
                  type="password"
                  {...register('apiKey', { required: provider !== 'ollama' ? '请输入API Key' : false })}
                  placeholder={(PROVIDER_MATES[provider]?.prefix || "") + "..."}
                  error={errors.apiKey?.message}
                  size='sm'
                />
                {errors.apiKey && (
                  <p className="mt-1 text-sm text-red-600">{errors.apiKey.message}</p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              模型名称
            </label>
            <CustomInput
              {...register('model')}
              placeholder={provider === 'ollama' ? 'bge-m3-q8_0（推荐中文） / nomic-embed-text' : "gpt-3.5-turbo"}
              helper={provider === 'ollama' ? '先在终端运行 ollama pull <模型名> 下载模型' : undefined}
              size='sm'
            />
            {/* 模型能力：自动按 model+provider 勾选默认值，可手动修正 */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                模型能力
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {ALL_CAPABILITIES.map((cap) => {
                  const checked = (watch('capabilities') ?? []).includes(cap.key)
                  return (
                    <label
                      key={cap.key}
                      className={`relative flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all
                        ${checked
                          ? 'border-blue-300 dark:border-blue-600 bg-blue-50/60 dark:bg-blue-900/15'
                          : 'border-gray-200 dark:border-gray-600 bg-transparent hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const current = watch('capabilities') ?? []
                          const next = checked
                            ? current.filter(k => k !== cap.key)
                            : [...current, cap.key]
                          setValue('capabilities', next, { shouldDirty: true })
                        }}
                        className="mt-0.5 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{cap.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{cap.description}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {provider !== 'ollama' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                API Base URL (可选)
              </label>
              <CustomInput
                {...register('baseUrl')}
                placeholder={(PROVIDER_MATES[provider]?.baseUrl ?? "") || 'https://api.openai.com/v1'}
                helper="留空使用默认地址，或使用自定义代理地址"
                size='sm'
              />
            </div>
          )}

          {provider !== 'ollama' && (
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  温度
                </label>
                <div className="flex items-center gap-3">
                  <TemperatureSlider
                    value={watch('temperature') || 0.7}
                    onChange={(v) => setValue('temperature', v, { shouldValidate: true })}
                    min={TEMPERATURE_RANGE.min}
                    max={TEMPERATURE_RANGE.max}
                    step={TEMPERATURE_RANGE.step}
                  />
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-300 min-w-[3ch] tabular-nums">
                    {watch('temperature') || 0.7}
                  </span>
                </div>
              </div>

              <div className="col-span-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  最大Token数
                </label>
                <CustomInput
                  type="number"
                  min={MAX_TOKENS_RANGE.min}
                  max={MAX_TOKENS_RANGE.max}
                  {...register('maxTokens', { valueAsNumber: true })}
                  size='sm'
                />
              </div>
            </div>
          )}

          {provider !== 'ollama' && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-900/15 border border-amber-200/70 dark:border-amber-700/40 rounded-lg">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  <p className="font-medium text-amber-800 dark:text-amber-300 mb-0.5">消息格式说明</p>
                  <p>当前系统仅支持 OpenAI 兼容的消息格式。请确保您的 LLM 提供商兼容 OpenAI API 规范，否则可能导致调用失败。</p>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}