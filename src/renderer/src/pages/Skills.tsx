import React, { useState } from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { Skill } from '@renderer/types';
import MdEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';
import MarkdownIt from 'markdown-it';
import MarkdownPreview from '@renderer/components/MarkdownPreview';
import CustomButton from '@renderer/components/CustomButton';
import CustomInput from '@renderer/components/CustomInput';
import CustomFileUpload from '@renderer/components/CustomFileUpload';

const mdParser = new MarkdownIt(/* Markdown-it options */);

export default function Skills(): React.JSX.Element {
    const { skills, addSkill, updateSkill, deleteSkill } = useWorkflowStore();
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 过滤skills基于搜索词
    const filteredSkills = skills.filter(skill =>
        skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (skill.description && skill.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">⚡</span>
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        技能管理
                    </h1>
                </div>
                <div className="flex space-x-2">
                    <CustomFileUpload
                        accept=".md,.txt"
                        onChange={handleImportFromFile}
                    >
                        从文件导入
                    </CustomFileUpload>
                    <CustomButton
                        onClick={handleCreate}
                        variant="primary"
                    >
                        创建新技能
                    </CustomButton>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* 技能列表 */}
                <div className="lg:col-span-1 flex flex-col ">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 flex-1 flex flex-col">
                        <div className="p-4 pb-2">
                            <div className="flex items-center space-x-2 mb-4">
                                <span className="text-white font-bold text-lg">📋</span>
                                <h3 className="font-semibold text-gray-900 dark:text-white">技能列表</h3>
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                    {filteredSkills.length}
                                </span>
                            </div>
                            {/* 搜索框 */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400">🔍</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="搜索技能..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 pt-0">
                            <div className="space-y-2">
                                {filteredSkills.map((skill) => (
                                    <div
                                        key={skill.id}
                                        className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${selectedSkill?.id === skill.id
                                            ? 'border-blue-500/50 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20'
                                            : 'border-gray-200/50 dark:border-gray-600/50 hover:border-gray-300/50 dark:hover:border-gray-500/50 hover:shadow-sm bg-white/50 dark:bg-gray-700/30'
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
                                            <div className="flex space-x-1 ml-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(skill);
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                                                    title="编辑"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(skill);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                                                    title="删除"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredSkills.length === 0 && (
                                    <div className="text-center py-12">
                                        {searchTerm ? (
                                            <>
                                                <div className="text-4xl mb-3">🔍</div>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm  mb-1">未找到匹配的技能</p>
                                                <p className="text-sm text-gray-400 dark:text-gray-500">尝试使用其他关键词搜索</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-4xl mb-3">⚡</div>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">还没有技能</p>
                                                <p className="text-sm text-gray-400 dark:text-gray-500">点击上方按钮创建您的第一个AI Agent</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 技能编辑/预览 */}
                <div className="lg:col-span-2 flex flex-col">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50 flex-1 flex flex-col">
                        <div className="flex-1 overflow-y-auto px-4 py-5 sm:p-6">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                        {selectedSkill ? '编辑技能' : '创建新技能'}
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            技能名称 *
                                        </label>
                                        <CustomInput
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="输入技能名称"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            描述
                                        </label>
                                        <CustomInput
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                                        <CustomButton
                                            onClick={() => {
                                                setIsEditing(false);
                                                setSelectedSkill(null);
                                                setFormData({ name: '', description: '', content: '' });
                                            }}
                                            variant="secondary"
                                        >
                                            取消
                                        </CustomButton>
                                        <CustomButton
                                            onClick={handleSave}
                                            disabled={isLoading || !formData.name.trim() || !formData.content.trim()}
                                            variant="primary"
                                        >
                                            {isLoading ? '保存中...' : '保存'}
                                        </CustomButton>
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
                                    <MarkdownPreview content={selectedSkill.content} />
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