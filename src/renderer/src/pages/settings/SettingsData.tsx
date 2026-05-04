import React, { useState } from 'react';
import { chatHistoryApi } from '@renderer/lib/chatHistory';
import CustomButton from '@renderer/components/ui/CustomButton';

export default function SettingsData(): React.JSX.Element {
  const [isClearing, setIsClearing] = useState(false);

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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">数据管理</h3>

      <div className="space-y-3">
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