import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { LLMConfig } from '@renderer/types';

export default function Settings(): React.JSX.Element {
    const { llmConfig, setLLMConfig } = useWorkflowStore();
    const [isLoading, setIsLoading] = useState(false);

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const { register, handleSubmit, formState: { errors }, reset, watch, getValues } = useForm<LLMConfig>();

    useEffect(() => {
        reset(llmConfig || {
            provider: 'openai',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 2000,
        })
    }, [llmConfig, reset])

    const onSubmit = async (data: LLMConfig): Promise<void> => {
        setIsLoading(true);
        setMessage(null);

        try {
            // 根据选择的提供商验证API Key格式
            if (data.apiKey) {
                const validationRules = {
                    openai: { prefix: 'sk-', message: 'OpenAI API Key必须以sk-开头' },
                    anthropic: { prefix: 'sk-ant-', message: 'Anthropic API Key必须以sk-ant-开头' },
                    azure: { prefix: '', message: '' }, // Azure通常使用自定义格式，不强制验证
                    qwen: { prefix: 'sk-', message: 'Qwen API Key必须以sk-开头' },
                    longcat: { prefix: 'ak_', message: 'LongCat API Key必须以ak_开头' }
                };

                const rule = validationRules[data.provider as keyof typeof validationRules];
                if (rule && rule.prefix && !data.apiKey.startsWith(rule.prefix)) {
                    throw new Error(rule.message);
                }
            }

            setLLMConfig(data);
            setMessage({ type: 'success', text: '配置保存成功！' });
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
        } finally {
            setIsLoading(false);
        }
    };

    const testConnection = async (): Promise<void> => {
        setIsLoading(true);
        setMessage(null);

        try {
            // 这里应该实现实际的API连接测试
            await new Promise(resolve => setTimeout(resolve, 1000));
            setMessage({ type: 'success', text: '连接测试成功！' });
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: '连接测试失败，请检查API Key和网络连接' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">大模型API配置</h2>

                    {message && (
                        <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                提供商
                            </label>
                            <select
                                {...register('provider', { required: '请选择提供商' })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="azure">Azure OpenAI</option>
                                <option value="qwen">Qwen (通义千问)</option>
                                <option value="longcat">Longcat (LongCat)</option>
                            </select>
                            {errors.provider && (
                                <p className="mt-1 text-sm text-red-600">{errors.provider.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                API Key *
                            </label>
                            <input
                                type="password"
                                {...register('apiKey', { required: '请输入API Key' })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="sk-..."
                            />
                            {errors.apiKey && (
                                <p className="mt-1 text-sm text-red-600">{errors.apiKey.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                模型名称
                            </label>
                            <input
                                {...register('model')}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="gpt-3.5-turbo"
                            />
                        </div>

                        {getValues('provider') === 'azure' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Base URL
                                </label>
                                <input
                                    {...register('baseUrl')}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="https://your-resource.openai.azure.com/"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    温度 ({watch('temperature') || 0.7})
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    {...register('temperature', { valueAsNumber: true })}
                                    className="w-full bg-white dark:bg-gray-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    最大Token数
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="4000"
                                    {...register('maxTokens', { valueAsNumber: true })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? '保存中...' : '保存配置'}
                            </button>

                            <button
                                type="button"
                                onClick={testConnection}
                                disabled={isLoading || !watch('apiKey')}
                                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                测试连接
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}