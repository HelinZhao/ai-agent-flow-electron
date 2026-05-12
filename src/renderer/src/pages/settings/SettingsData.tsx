import React, { useState, useEffect } from 'react';
import { chatHistoryApi } from '@renderer/lib/chatHistory';
import { dataApi } from '@renderer/lib/api';
import CustomButton from '@renderer/components/ui/CustomButton';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function SettingsData(): React.JSX.Element {
  const [isClearing, setIsClearing] = useState(false);
  const [isVacuuming, setIsVacuuming] = useState(false);
  const [dbStats, setDbStats] = useState<{ base: { size: number }; knowledge: { size: number }; total: number } | null>(null);
  const [vacuumResult, setVacuumResult] = useState<{ saved: number } | null>(null);

  useEffect(() => {
    dataApi.getDbStats().then(setDbStats).catch(() => {});
  }, []);

  const handleClearChatHistory = async () => {
    if (!window.confirm('确定要清除所有聊天历史吗？此操作不可恢复。')) return;
    setIsClearing(true);
    try {
      await chatHistoryApi.clearAllHistories();
    } catch (error) {
      console.error('清除聊天历史失败:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleVacuum = async () => {
    if (!window.confirm('确定要清理数据库空闲空间吗？此操作可能需要几秒钟。')) return;
    setIsVacuuming(true);
    setVacuumResult(null);
    try {
      const before = dbStats?.total || 0;
      const result = await dataApi.vacuum();
      const after = result.total;
      setVacuumResult({ saved: before - after });
      const newStats = await dataApi.getDbStats();
      setDbStats(newStats);
    } catch (error) {
      console.error('VACUUM 失败:', error);
    } finally {
      setIsVacuuming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">数据管理</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理应用数据与存储空间</p>
      </div>

      {/* 数据库空间统计 */}
      {dbStats && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">数据库空间占用</h4>
          </div>

          <div className="space-y-3">
            {/* 主数据库 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">主数据库</span>
              </div>
              <span className="text-sm font-mono tabular-nums text-gray-900 dark:text-gray-100">{formatSize(dbStats.base.size)}</span>
            </div>
            {/* 知识库 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">知识库向量</span>
              </div>
              <span className="text-sm font-mono tabular-nums text-gray-900 dark:text-gray-100">{formatSize(dbStats.knowledge.size)}</span>
            </div>

            {/* 进度条 */}
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${dbStats.total > 0 ? 100 : 0}%` }}
              />
            </div>

            {/* 合计 */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">合计</span>
              <span className="text-sm font-semibold font-mono tabular-nums text-gray-900 dark:text-white">{formatSize(dbStats.total)}</span>
            </div>
          </div>

          {vacuumResult && (
            <div className={`mt-3 flex items-center gap-1.5 text-xs ${vacuumResult.saved > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {vacuumResult.saved > 0
                ? `上次清理释放了 ${formatSize(vacuumResult.saved)} 空间`
                : '数据库已是紧凑状态'}
            </div>
          )}
        </div>
      )}

      {/* 操作项 */}
      <div className="space-y-3">
        {/* 清理空闲空间 */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">清理数据库空闲空间</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-md">删除数据后数据库文件不会自动缩小，执行 VACUUM 可释放已删除数据占用的磁盘空间</p>
            </div>
          </div>
          <CustomButton
            variant="secondary"
            onClick={handleVacuum}
            disabled={isVacuuming}
            size="sm"
          >
            {isVacuuming ? '清理中...' : '清理空间'}
          </CustomButton>
        </div>

        {/* 清除聊天历史 */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">清除所有聊天历史</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">此操作不可恢复，将删除所有对话记录</p>
            </div>
          </div>
          <CustomButton
            variant="danger"
            onClick={handleClearChatHistory}
            disabled={isClearing}
            size="sm"
          >
            {isClearing ? '清除中...' : '清除'}
          </CustomButton>
        </div>
      </div>
    </div>
  );
}
