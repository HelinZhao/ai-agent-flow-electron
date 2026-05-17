import React from 'react';
import { Skill } from '@renderer/types';
import MarkdownPreview from '@renderer/components/MarkdownPreview';

interface SkillDetailProps {
  skill: Skill
  onEdit: () => void
  onDelete: () => void
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-white">{children}</dd>
    </div>
  );
}

export default function SkillDetail({ skill, onEdit, onDelete }: SkillDetailProps) {
  return (
    <>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10 dark:from-amber-500/5 dark:to-orange-500/5 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 shadow-lg flex-shrink-0">
              <span className="text-2xl text-white">⚡</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{skill.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {skill.description || '暂无描述'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>编辑</span>
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>删除</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Timestamps ── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
          <InfoItem label="创建时间">
            {new Date(skill.createdAt).toLocaleString('zh-CN')}
          </InfoItem>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
          <InfoItem label="更新时间">
            {new Date(skill.updatedAt).toLocaleString('zh-CN')}
          </InfoItem>
        </div>
      </div>

      {/* ── Content ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-amber-500 rounded-full" />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">技能内容</h3>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-5">
          <MarkdownPreview content={skill.content} />
        </div>
      </div>
    </>
  );
}
