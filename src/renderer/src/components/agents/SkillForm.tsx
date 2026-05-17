import { useState } from 'react';
import { Skill } from '@renderer/types';
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/lib/index.css';
import CustomInput from '@renderer/components/ui/CustomInput';
import CustomButton from '@renderer/components/ui/CustomButton';

const mdParser = new MarkdownIt();

interface SkillFormProps {
  skill: Skill | null
  onSave: (data: { name: string; description: string; content: string }) => Promise<void>
  onCancel: () => void
}

export default function SkillForm({ skill, onSave, onCancel }: SkillFormProps) {
  const isCreate = !skill;
  const [name, setName] = useState(skill?.name ?? '');
  const [description, setDescription] = useState(skill?.description ?? '');
  const [content, setContent] = useState(skill?.content ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return;
    setIsLoading(true);
    try {
      await onSave({ name, description, content });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-8">
        {/* ── Basic Info Section ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-amber-500 rounded-full" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">基本信息</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                名称 <span className="text-red-500">*</span>
              </label>
              <CustomInput
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="给技能起个名字"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                描述
              </label>
              <CustomInput
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述这个技能的用途"
              />
            </div>
          </div>
        </section>

        {/* ── Content Section ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-amber-500 rounded-full" />
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">技能内容</h3>
          </div>
          <div>
            <div className="border border-gray-200/50 dark:border-gray-600/50 rounded-xl overflow-hidden">
              <MdEditor
                style={{ height: '400px' }}
                renderHTML={(text) => mdParser.render(text)}
                value={content}
                onChange={(value) => setContent(value.text)}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              详细的技能定义、行为说明和调用方式 <span className="text-red-500">*</span>
            </p>
          </div>
        </section>
      </div>

      {/* ── Form Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-6 mt-8 border-t border-gray-200 dark:border-gray-700">
        <CustomButton onClick={onCancel} variant="secondary">
          取消
        </CustomButton>
        <CustomButton
          onClick={handleSave}
          disabled={isLoading || !name.trim() || !content.trim()}
        >
          {isLoading ? '保存中...' : isCreate ? '创建技能' : '保存修改'}
        </CustomButton>
      </div>
    </>
  );
}
