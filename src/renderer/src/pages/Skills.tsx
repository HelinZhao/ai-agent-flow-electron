import React, { useState } from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { Skill } from '@renderer/types';
import MdEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';
import MarkdownIt from 'markdown-it';
import CustomButton from '@renderer/components/CustomButton';
import CustomInput from '@renderer/components/CustomInput';
import CustomFileUpload from '@renderer/components/CustomFileUpload';

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
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">技能管理</h1>
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
                <div className="lg:col-span-1 flex flex-col">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg flex-1 flex flex-col">
                        <div className="px-4 py-5 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">技能列表</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-5 sm:p-6">
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
                                                <CustomButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(skill);
                                                    }}
                                                    variant="primary"
                                                    size="sm"
                                                >
                                                    编辑
                                                </CustomButton>
                                                <CustomButton
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(skill);
                                                    }}
                                                    variant="danger"
                                                    size="sm"
                                                >
                                                    删除
                                                </CustomButton>
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
                <div className="lg:col-span-2 flex flex-col">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg flex-1 flex flex-col">
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