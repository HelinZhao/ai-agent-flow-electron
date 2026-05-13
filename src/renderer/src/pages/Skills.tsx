import React, { useState, useCallback } from 'react';
import { useWorkflowStore } from '@renderer/store/workflowStore';
import { Skill } from '@renderer/types';
import MdEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';
import MarkdownIt from 'markdown-it';
import MarkdownPreview from '@renderer/components/MarkdownPreview';
import CustomInput from '@renderer/components/ui/CustomInput';
import CustomButton from '@renderer/components/ui/CustomButton';
import CustomFileUpload from '@renderer/components/ui/CustomFileUpload';
import { SKILL_IMPORT_ACCEPT } from '@renderer/config';

const mdParser = new MarkdownIt(/* Markdown-it options */);

const SkillCard = React.memo(function SkillCard({
  skill,
  onEdit,
  onDelete,
  onSelect,
}: {
  skill: Skill
  onEdit: (skill: Skill) => void
  onDelete: (skill: Skill) => void
  onSelect: (id: string) => void
}) {
  const contentSummary = skill.content
    ? skill.content.replace(/[#*\n]/g, ' ').substring(0, 100) + (skill.content.length > 100 ? '...' : '')
    : '暂无内容'

  return (
    <div
      className="group/skill relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => onSelect(skill.id)}
    >
      <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-blue-400 to-purple-500" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-2.5 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
              <span className="text-base">⚡</span>
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{skill.name}</h4>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{skill.description || '暂无描述'}</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2">{contentSummary}</p>
      </div>

      <div className="absolute top-3 right-3 z-10 hidden group-hover/skill:flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(skill) }}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="编辑"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(skill) }}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="删除"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <div className="absolute bottom-4 right-4 text-gray-300 dark:text-gray-600 group-hover/skill:text-blue-400 dark:group-hover/skill:text-blue-500 transition-colors">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7" /></svg>
      </div>
    </div>
  )
})

export default function Skills(): React.JSX.Element {
    const { skills, addSkill, updateSkill, deleteSkill } = useWorkflowStore();
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const selectedSkill = selectedSkillId ? skills.find(s => s.id === selectedSkillId) ?? null : null;

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

    const handleCreate = useCallback((): void => {
        setSelectedSkillId('__create__');
        setFormData({ name: '', description: '', content: '' });
        setIsEditing(true);
    }, []);

    const handleEdit = useCallback((skill: Skill): void => {
        setSelectedSkillId(skill.id);
        setFormData({
            name: skill.name,
            description: skill.description,
            content: skill.content
        });
        setIsEditing(true);
    }, []);

    const handleSave = async (): Promise<void> => {
        if (!formData.name.trim() || !formData.content.trim()) return;

        setIsLoading(true);
        try {
            if (selectedSkill) {
                await updateSkill(selectedSkill.id, formData);
            } else {
                await addSkill(formData);
            }
            setIsEditing(false);
            setSelectedSkillId(null);
            setFormData({ name: '', description: '', content: '' });
        } catch (error) {
            console.error('保存失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = useCallback((skill: Skill): void => {
        if (window.confirm(`确定要删除技能 "${skill.name}" 吗？`)) {
            deleteSkill(skill.id);
            setSelectedSkillId(prev => prev === skill.id ? null : prev);
            setIsEditing(false);
        }
    }, [deleteSkill]);

    const handleBack = (): void => {
        setSelectedSkillId(null);
        setIsEditing(false);
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
            setIsEditing(true);
        } catch (error) {
            console.error(error);
            alert('文件读取失败');
        }

        event.target.value = '';
    };

    // ========== 二级页面：技能详情/编辑 ==========
    if (selectedSkillId) {
        return (
            <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* 顶部导航 */}
                <div className="flex items-center space-x-3 mb-6">
                    <button
                        onClick={handleBack}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">⚡</span>
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                {isEditing ? (selectedSkill ? '编辑技能' : '创建新技能') : selectedSkill!.name}
                            </h3>
                            {!isEditing && selectedSkill!.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedSkill!.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                    <div className="px-6 py-6">
                        {isEditing ? (
                            <div className="space-y-6">
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
                                    <div className="border border-gray-200/50 dark:border-gray-600/50 rounded-xl overflow-hidden">
                                        <MdEditor
                                            style={{ height: '400px' }}
                                            renderHTML={text => mdParser.render(text)}
                                            value={formData.content}
                                            onChange={(value) => setFormData(prev => ({ ...prev, content: value.text }))}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-4 pt-4">
                                    <CustomButton
                                        onClick={() => {
                                            setIsEditing(false);
                                            if (!selectedSkill) handleBack();
                                        }}
                                        variant="secondary"
                                    >
                                        取消
                                    </CustomButton>
                                    <CustomButton
                                        onClick={handleSave}
                                        disabled={isLoading || !formData.name.trim() || !formData.content.trim()}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="animate-spin">⚡</span>
                                                <span>保存中...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>💾</span>
                                                <span>保存</span>
                                            </>
                                        )}
                                    </CustomButton>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                                            {selectedSkill!.name}
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300">{selectedSkill!.description || '暂无描述'}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(selectedSkill!)}
                                            className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center space-x-1.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <span>编辑</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(selectedSkill!)}
                                            className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center space-x-1.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            <span>删除</span>
                                        </button>
                                    </div>
                                </div>
                                <MarkdownPreview content={selectedSkill!.content} className="border border-gray-200/50 dark:border-gray-600/50 rounded-xl p-4" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ========== 一级页面：技能列表（卡片式） ==========
    return (
        <div className="mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {/* 标题栏 */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    技能管理
                </h1>
                <div className="flex space-x-2 items-center">
                    <CustomInput
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="搜索技能..."
                        size="sm"
                        hidden={skills.length === 0}
                        className='rounded-xl'
                        leftIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>}
                    />
                    <CustomFileUpload
                        accept={SKILL_IMPORT_ACCEPT}
                        onChange={handleImportFromFile}
                        size='sm'
                    >
                        从文件导入
                    </CustomFileUpload>
                    <CustomButton
                        onClick={handleCreate}
                        variant="primary"
                        size="sm"
                    >
                        <span>✨</span>
                        <span>创建新技能</span>
                    </CustomButton>
                </div>
            </div>

            {/* 卡片网格 */}
            {filteredSkills.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredSkills.map((skill) => (
                        <SkillCard
                            key={skill.id}
                            skill={skill}
                            onSelect={setSelectedSkillId}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
                    {searchTerm ? (
                        <>
                            <svg className="w-14 h-14 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="text-sm font-medium">未找到匹配的技能</p>
                            <p className="text-xs mt-1">尝试使用其他关键词搜索</p>
                        </>
                    ) : (
                        <>
                            <div className="text-8xl mb-6">⚡</div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">还没有技能</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">创建您的第一个技能或从文件导入</p>
                            <button
                                onClick={handleCreate}
                                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg font-medium"
                            >
                                创建第一个技能
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
