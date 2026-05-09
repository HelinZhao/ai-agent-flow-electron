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
      // 重新获取统计
      const newStats = await dataApi.getDbStats();
      setDbStats(newStats);
    } catch (error) {
      console.error('VACUUM 失败:', error);
    } finally {
      setIsVacuuming(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">数据管理</h3>

      {/* 数据库空间统计 */}
      {dbStats && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">数据库空间占用</p>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <p>主数据库 (base): {formatSize(dbStats.base.size)}</p>
            <p>知识库向量 (knowledge): {formatSize(dbStats.knowledge.size)}</p>
            <p className="font-medium text-gray-700 dark:text-gray-300">合计: {formatSize(dbStats.total)}</p>
          </div>
          {vacuumResult && vacuumResult.saved > 0 && (
            <p className="mt-2 text-xs text-green-600 dark:text-green-400">
              上次清理释放了 {formatSize(vacuumResult.saved)} 空间
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {/* 清理空闲空间 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">清理数据库空闲空间</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">删除数据后数据库文件不会自动缩小，执行 VACUUM 可释放已删除数据占用的磁盘空间</p>
          </div>
          <CustomButton
            variant="secondary"
            onClick={handleVacuum}
            disabled={isVacuuming}
          >
            {isVacuuming ? '清理中...' : '清理空间'}
          </CustomButton>
        </div>

        {/* 清除聊天历史 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">清除所有聊天历史</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">此操作不可恢复，将删除所有对话记录</p>
          </div>
          <CustomButton
            variant="danger"
            onClick={handleClearChatHistory}
            disabled={isClearing}
          >
            {isClearing ? '清除中...' : '清除'}
          </CustomButton>
        </div>
      </div>
    </div>
  );
}