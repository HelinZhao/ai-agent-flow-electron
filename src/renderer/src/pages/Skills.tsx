import React, { useState } from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { Skill } from '@renderer/types';
import MdEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';
import MarkdownIt from 'markdown-it';

const mdParser = new MarkdownIt(/* Markdown-it options */);

export default function Skills(): React.JSX.Element {
    const { skills, addSkill, updateSkill, deleteSkill } = useWorkflowStore();
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        content: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = (): void => {
        setSelectedSkill(null);
        setFormData({ name: '', description: '', content: '' });
        setIsEditing(true);
    };

    const handleEdit = (skill: Skill): void => {
        setSelectedSkill(skill);
        setFormData({
            name: skill.name,
            description: skill.description,
            content: skill.content
        });
        setIsEditing(true);
    };

    const handleSave = async (): Promise<void> => {
        if (!formData.name.trim() || !formData.content.trim()) return;

        setIsLoading(true);
        try {
            if (selectedSkill) {
                updateSkill(selectedSkill.id, formData);
            } else {
                addSkill(formData);
            }
            setIsEditing(false);
            setSelectedSkill(null);
            setFormData({ name: '', description: '', content: '' });
        } catch (error) {
            console.error('保存失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = (skill: Skill): void => {
        if (window.confirm(`确定要删除技能 "${skill.name}" 吗？`)) {
            deleteSkill(skill.id);
            if (selectedSkill?.id === skill.id) {
                setSelectedSkill(null);
                setIsEditing(false);
            }
        }
    };

    const handleImportFromFile = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const content = await file.text();
            const fileName = file.name.replace(/\.[^/.]+$/, '');

            setFormData({
                name: fileName,
                description: `从文件 ${file.name} 导入`,
                content: content
            });
            setSelectedSkill(null);
            setIsEditing(true);
        } catch (error) {
            console.error(error)
            alert('文件读取失败');
        }

        // 清空input
        event.target.value = '';
    };

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">技能管理</h1>
                <div className="flex space-x-2">
                    <input
                        type="file"
                        accept=".md,.txt"
                        onChange={handleImportFromFile}
                        className="hidden"
                        id="file-upload"
                    />
                    <label
                        htmlFor="file-upload"
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 cursor-pointer"
                    >
                        从文件导入
                    </label>
                    <button
                        onClick={handleCreate}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        创建新技能
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 技能列表 */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">技能列表</h3>
                            <div className="space-y-2">
                                {skills.map((skill) => (
                                    <div
                                        key={skill.id}
                                        className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedSkill?.id === skill.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                            }`}
                                        onClick={() => {
                                            setSelectedSkill(skill);
                                            setIsEditing(false);
                                        }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {skill.name}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {skill.description}
                                                </p>
                                            </div>
                                            <div className="flex space-x-1 ml-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(skill);
                                                    }}
                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                                >
                                                    编辑
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(skill);
                                                    }}
                                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                                >
                                                    删除
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {skills.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        还没有技能，点击上方按钮创建或导入
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 技能编辑/预览 */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                        {selectedSkill ? '编辑技能' : '创建新技能'}
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            技能名称 *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="输入技能名称"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            描述
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="输入技能描述"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            技能内容 *
                                        </label>
                                        <MdEditor
                                            className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden" style={{ height: '400px' }}
                                            renderHTML={text => mdParser.render(text)}
                                            value={formData.content}
                                            onChange={(value) => setFormData(prev => ({ ...prev, content: value.text }))}
                                        />
                                    </div>

                                    <div className="flex justify-end space-x-3">
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                setSelectedSkill(null);
                                                setFormData({ name: '', description: '', content: '' });
                                            }}
                                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={isLoading || !formData.name.trim() || !formData.content.trim()}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? '保存中...' : '保存'}
                                        </button>
                                    </div>
                                </div>
                            ) : selectedSkill ? (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                                        {selectedSkill.name}
                                    </h3>
                                    <div className="mb-4">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{selectedSkill.description}</span>
                                    </div>
                                    <MdEditor
                                        value={selectedSkill.content}
                                        className="border border-gray-300 rounded-md overflow-hidden" style={{ height: '500px' }}
                                        renderHTML={text => mdParser.render(text)}
                                        config={{
                                            view: {
                                                menu: false,    // 隐藏菜单栏
                                                md: false,      // 隐藏编辑区
                                                html: true,     // 显示预览区
                                                fullScreen: false // 隐藏全屏按钮
                                            }
                                        }}
                                        readOnly={true}     // 设置为只读模式
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                    <p>选择一个技能查看详情，或创建新技能</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}