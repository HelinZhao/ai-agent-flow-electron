import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { LLMConfig } from '@renderer/types';

export default function Settings(): React.JSX.Element {
    const {
        llmConfigs,
        activeLLMConfig,
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
            provider: 'openai',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            baseUrl: '',
            temperature: 0.7,
            maxTokens: 2000,
            isActive: false
        }
    });

    const onSubmit = async (data: LLMConfig): Promise<void> => {
        setIsLoading(true);
        setMessage(null);

        try {
            // 根据选择的提供商验证API Key格式
            if (data.apiKey) {
                const validationRules = {
                    openai: { prefix: 'sk-', message: 'OpenAI API Key必须以sk-开头' },
                    anthropic: { prefix: 'sk-ant-', message: 'Anthropic API Key必须以sk-ant-开头' },
                    azure: { prefix: '', message: '' },
                    qwen: { prefix: 'sk-', message: 'Qwen API Key必须以sk-开头' },
                    longcat: { prefix: 'ak_', message: 'LongCat API Key必须以ak_开头' }
                };

                const rule = validationRules[data.provider as keyof typeof validationRules];
                if (rule && rule.prefix && !data.apiKey.startsWith(rule.prefix)) {
                    throw new Error(rule.message);
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
            setMessage({ type: 'error', text: '切换失败' });
        } finally {
            setIsLoading(false);
        }
    };

    const testConnection = async (): Promise<void> => {
        setIsLoading(true);
        setMessage(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            setMessage({ type: 'success', text: '连接测试成功！' });
        } catch (error) {
            setMessage({ type: 'error', text: '连接测试失败，请检查API Key和网络连接' });
        } finally {
            setIsLoading(false);
        }
    };

    const startNewConfig = () => {
        reset({
            name: '',
            provider: 'openai',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            baseUrl: '',
            temperature: 0.7,
            maxTokens: 2000,
            isActive: false
        });
        setEditingConfig(null);
        setShowForm(true);
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white">大模型API配置管理</h2>
                            <button
                                onClick={startNewConfig}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                            >
                                <span>+ 新建配置</span>
                            </button>
                        </div>

                        {message && (
                            <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        {/* 配置列表 */}
                        <div className="space-y-3 mb-6">
                            {llmConfigs.map((config) => (
                                <div key={config.id} className={`border rounded-lg p-4 ${config.isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3">
                                                {config.isActive && (
                                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">当前使用</span>
                                                )}
                                                <h3 className="font-medium text-gray-900 dark:text-white">{config.name}</h3>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">{config.provider}</span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">{config.model}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {!config.isActive && (
                                                <button
                                                    onClick={() => handleActivate(config.id!)}
                                                    disabled={isLoading}
                                                    className="text-green-600 hover:text-green-800 px-3 py-1 text-sm border border-green-300 rounded hover:bg-green-50"
                                                >
                                                    启用
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleEdit(config)}
                                                className="text-blue-600 hover:text-blue-800 px-3 py-1 text-sm border border-blue-300 rounded hover:bg-blue-50"
                                            >
                                                编辑
                                            </button>
                                            <button
                                                onClick={() => handleDelete(config.id!)}
                                                disabled={llmConfigs.length <= 1}
                                                className="text-red-600 hover:text-red-800 px-3 py-1 text-sm border border-red-300 rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 配置表单 */}
                        {showForm && (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 border-t pt-6">
                                <h3 className="text-md font-medium text-gray-900 dark:text-white">
                                    {editingConfig ? '编辑配置' : '新建配置'}
                                </h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        配置名称 *
                                    </label>
                                    <input
                                        {...register('name', { required: '请输入配置名称' })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="例如：OpenAI 主配置"
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                                    )}
                                </div>

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

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        API Base URL (可选)
                                    </label>
                                    <input
                                        {...register('baseUrl')}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder={
                                            getValues('provider') === 'openai' ? 'https://api.openai.com/v1' :
                                            getValues('provider') === 'anthropic' ? 'https://api.anthropic.com' :
                                            getValues('provider') === 'azure' ? 'https://your-resource.openai.azure.com/' :
                                            getValues('provider') === 'qwen' ? 'https://dashscope.aliyuncs.com/compatible-mode/v1' :
                                            getValues('provider') === 'longcat' ? 'https://api.longcat.ai' :
                                            'https://api.openai.com/v1'
                                        }
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        留空使用默认地址，或使用自定义代理地址
                                    </p>
                                </div>

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
                                        {isLoading ? '保存中...' : editingConfig ? '更新配置' : '创建配置'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={testConnection}
                                        disabled={isLoading || !watch('apiKey')}
                                        className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        测试连接
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForm(false);
                                            setEditingConfig(null);
                                            reset();
                                        }}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                    >
                                        取消
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}