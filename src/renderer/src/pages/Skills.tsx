import React, { useState, useCallback } from 'react';
import { useAppStore } from '@renderer/store/appStore';
import { Skill } from '@renderer/types';
import CustomInput from '@renderer/components/ui/CustomInput';
import CustomButton from '@renderer/components/ui/CustomButton';
import CustomFileUpload from '@renderer/components/ui/CustomFileUpload';
import ResponsiveGrid from '@renderer/components/ui/ResponsiveGrid';
import SkillForm from '@renderer/components/skills/SkillForm';
import SkillDetail from '@renderer/components/skills/SkillDetail';
import { SKILL_IMPORT_ACCEPT } from '@renderer/config';

// ─── Skill Card ───
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
  const summary = skill.content
    ? skill.content.replace(/[#*\n]/g, ' ').substring(0, 90) +
    (skill.content.length > 90 ? '...' : '')
    : '暂无内容';

  return (
    <div
      className="group/skill relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/50 hover:border-amber-300 dark:hover:border-amber-600/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => onSelect(skill.id)}
    >
      <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-amber-400 to-orange-500" />
      <div className="p-4">
        <div className="flex items-start gap-2.5 mb-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 flex-shrink-0">
            <span className="text-base">⚡</span>
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {skill.name}
            </h4>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
              {skill.description || '暂无描述'}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 leading-relaxed">
          {summary}
        </p>
      </div>

      <div className="absolute top-3 right-3 z-10 hidden group-hover/skill:flex items-center gap-1 px-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(skill) }}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="编辑"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(skill) }}
          className="flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="删除"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-3 right-3 text-gray-300 dark:text-gray-600 group-hover/skill:text-amber-400 dark:group-hover/skill:text-amber-500 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
});

// ─── Main Page ───
export default function Skills(): React.JSX.Element {
  const { skills, addSkill, updateSkill, deleteSkill } = useAppStore();
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const selectedSkill = selectedSkillId
    ? skills.find((s) => s.id === selectedSkillId) ?? null
    : null;

  const filteredSkills = skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (skill.description &&
        skill.description.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleCreate = useCallback((): void => {
    setSelectedSkillId('__create__');
    setIsEditing(true);
  }, []);

  const handleEdit = useCallback((skill: Skill): void => {
    setSelectedSkillId(skill.id);
    setIsEditing(true);
  }, []);

  const handleDelete = useCallback(
    (skill: Skill): void => {
      if (window.confirm(`确定要删除技能 "${skill.name}" 吗？`)) {
        deleteSkill(skill.id);
        if (selectedSkillId === skill.id) {
          setSelectedSkillId(null);
          setIsEditing(false);
        }
      }
    },
    [deleteSkill, selectedSkillId],
  );

  const handleBack = (): void => {
    setSelectedSkillId(null);
    setIsEditing(false);
  };

  const handleSave = async (data: {
    name: string
    description: string
    content: string
  }): Promise<void> => {
    if (selectedSkill) {
      await updateSkill(selectedSkill.id, data);
    } else {
      await addSkill(data);
    }
    setIsEditing(false);
    setSelectedSkillId(null);
  };

  const handleImportFromFile = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      // Create a new skill immediately with imported content, then open for editing
      await addSkill({
        name: fileName,
        description: `从文件 ${file.name} 导入`,
        content,
      });
    } catch (error) {
      console.error(error);
      alert('文件读取失败');
    }
    event.target.value = '';
  };

  // ─── Detail / Edit View ───
  if (selectedSkillId) {
    return (
      <div className="px-6 py-4">
        {/* Back button */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEditing
              ? selectedSkill
                ? '编辑技能'
                : '创建新技能'
              : selectedSkill?.name || ''}
          </h2>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
          {isEditing ? (
            <SkillForm
              skill={selectedSkill}
              onSave={handleSave}
              onCancel={() => {
                if (selectedSkill) {
                  setIsEditing(false);
                } else {
                  handleBack();
                }
              }}
            />
          ) : selectedSkill ? (
            <SkillDetail
              skill={selectedSkill}
              onEdit={() => setIsEditing(true)}
              onDelete={() => handleDelete(selectedSkill)}
            />
          ) : null}
        </div>
      </div>
    );
  }

  // ─── List View ───
  return (
    <div className="px-6 py-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            技能管理
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">创建和管理 AI 技能，为工作流和 Agent 提供可复用的专业知识与处理能力</p>
        </div>
        <div className="flex items-center flex-wrap gap-2 justify-end">
          {skills.length > 0 && (
            <CustomInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索技能..."
              size="sm"
              className="rounded-xl"
              leftIcon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              }
            />
          )}
          <CustomFileUpload
            accept={SKILL_IMPORT_ACCEPT}
            onChange={handleImportFromFile}
            size="sm"
          >
            从文件导入
          </CustomFileUpload>
          <CustomButton onClick={handleCreate} variant="primary" size="sm">
            <span>✨</span>
            <span>创建</span>
          </CustomButton>
        </div>
      </div>

      {/* Cards / Empty state */}
      {filteredSkills.length > 0 ? (
        <ResponsiveGrid>
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onSelect={setSelectedSkillId}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </ResponsiveGrid>
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
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 mb-6">
                <span className="text-4xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                还没有技能
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                创建您的第一个技能或从文件导入
              </p>
              <button
                onClick={handleCreate}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-lg font-medium"
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
