import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { LLMConfig } from '@renderer/types';
import { llmConfigApi } from '@renderer/lib/api';
import CustomSelect from '@renderer/components/ui/CustomSelect';
import CustomInput from '@renderer/components/ui/CustomInput';
import CustomButton from '@renderer/components/ui/CustomButton';
import { LLM_DEFAULTS, PROVIDER_MATES, TEMPERATURE_RANGE, MAX_TOKENS_RANGE, MIN_LLM_CONFIG_COUNT } from '@renderer/config';

export default function SettingsLLM(): React.JSX.Element {
    const {
        llmConfigs,
        addLLMConfig,
        updateLLMConfig,
        deleteLLMConfig,
        activateLLMConfig,
    } = useWorkflowStore();

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
            isActive: false,
        }
    });
    const provider = watch('provider')

    const onSubmit = async (data: LLMConfig): Promise<void> => {
        setIsLoading(true);
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
            setIsLoading(false);
        }
    };

    const handleEdit = (config: LLMConfig) => {
        setEditingConfig(config.id!);
        reset(config);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这个配置吗？')) return;

        setIsLoading(true);
        try {
            await deleteLLMConfig(id);
            setMessage({ type: 'success', text: '配置删除成功！' });
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: '删除失败' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivate = async (id: string) => {
        setIsLoading(true);
        try {
            await activateLLMConfig(id);
            setMessage({ type: 'success', text: '配置切换成功！' });
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: '切换失败' });
        } finally {
            setIsLoading(false);
        }
    };

    const testConnection = async (): Promise<void> => {
        setIsLoading(true);
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
                    text: `连接测试成功！API响应正常。LLM回复: ${result.response}`
                });
            } else {
                throw new Error('连接测试返回异常结果');
            }
        } catch (error) {
            console.error('连接测试失败:', error);
            setMessage({
                type: 'error',
                text: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`
            });
        } finally {
            setIsLoading(false);
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

            {message && (
                <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* 配置列表 */}
            <div className="space-y-3 mb-6">
                {llmConfigs.map((config) => (
                    <div key={config.id} className={`border rounded-lg p-4 ${config.isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                    {config.isActive && (
                                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2 py-1 rounded">当前使用</span>
                                    )}
                                    <h4 className="font-medium text-gray-900 dark:text-white">{config.name}</h4>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{config.provider}</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{config.model}</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {!config.isActive && (
                                    <CustomButton
                                        onClick={() => handleActivate(config.id!)}
                                        variant="success"
                                        size="sm"
                                        disabled={isLoading}
                                    >
                                        启用
                                    </CustomButton>
                                )}
                                <CustomButton
                                    onClick={() => handleEdit(config)}
                                    variant="primary"
                                    size="sm"
                                >
                                    编辑
                                </CustomButton>
                                <CustomButton
                                    onClick={() => handleDelete(config.id!)}
                                    variant="danger"
                                    size="sm"
                                    disabled={llmConfigs.length <= MIN_LLM_CONFIG_COUNT}
                                >
                                    删除
                                </CustomButton>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 配置表单 */}
            {showForm && (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 border-t py-6">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white">
                        {editingConfig ? '编辑配置' : '新建配置'}
                    </h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            配置名称 *
                        </label>
                        <CustomInput
                            {...register('name', { required: '请输入配置名称' })}
                            placeholder="例如：OpenAI 主配置"
                            error={errors.name?.message}
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            提供商
                        </label>
                        <CustomSelect
                            value={provider}
                            onChange={(value) => {
                                setValue('provider', value as LLMConfig['provider'], { shouldValidate: true });
                            }}
                            options={Object.entries(PROVIDER_MATES).map(([key, item]) => ({ value: key, label: item.name }))}
                            placeholder="选择提供商"
                            error={!!errors.provider}
                        />
                        {errors.provider && (
                            <p className="mt-1 text-sm text-red-600">{errors.provider.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                />
                                {errors.apiKey && (
                                    <p className="mt-1 text-sm text-red-600">{errors.apiKey.message}</p>
                                )}
                            </>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            模型名称
                        </label>
                        <CustomInput
                            {...register('model')}
                            placeholder={provider === 'ollama' ? 'bge-m3（推荐中文） / nomic-embed-text' : "gpt-3.5-turbo"}
                            helper={provider === 'ollama' ? '先在终端运行 ollama pull <模型名> 下载模型' : undefined}
                        />
                    </div>

                    {provider !== 'ollama' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                API Base URL (可选)
                            </label>
                            <CustomInput
                                {...register('baseUrl')}
                                placeholder={(PROVIDER_MATES[provider]?.baseUrl ?? "") || 'https://api.openai.com/v1'}
                                helper="留空使用默认地址，或使用自定义代理地址"
                            />
                        </div>
                    )}

                    {provider !== 'ollama' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    温度 ({watch('temperature') || 0.7})
                                </label>
                                <input
                                    type="range"
                                    min={TEMPERATURE_RANGE.min}
                                    max={TEMPERATURE_RANGE.max}
                                    step={TEMPERATURE_RANGE.step}
                                    {...register('temperature', { valueAsNumber: true })}
                                    className="w-full bg-white dark:bg-gray-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    最大Token数
                                </label>
                                <CustomInput
                                type="number"
                                min={MAX_TOKENS_RANGE.min}
                                max={MAX_TOKENS_RANGE.max}
                                {...register('maxTokens', { valueAsNumber: true })}
                            />
                            </div>
                        </div>
                    )}

                    {provider !== 'ollama' && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                    消息格式说明
                                </h3>
                                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                                    <p>
                                        当前系统仅支持 OpenAI 消息格式
                                    </p>
                                    <p className="mt-1">
                                        请确保您选择的 LLM 提供商兼容 OpenAI 的消息格式规范，否则可能导致调用失败。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    <div className="flex space-x-4">
                        <CustomButton
                            type="submit"
                            disabled={isLoading}
                            variant="primary"
                            className="flex-1"
                        >
                            {isLoading ? '保存中...' : editingConfig ? '更新配置' : '创建配置'}
                        </CustomButton>

                        <CustomButton
                            type="button"
                            onClick={testConnection}
                            disabled={isLoading || (provider !== 'ollama' && !watch('apiKey'))}
                            variant="secondary"
                            className="flex-1"
                        >
                            测试连接
                        </CustomButton>

                        <CustomButton
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                setEditingConfig(null);
                                reset();
                            }}
                            variant="secondary"
                        >
                            取消
                        </CustomButton>
                    </div>
                </form>
            )}
        </div>
    );
}