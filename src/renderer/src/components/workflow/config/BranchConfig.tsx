import React from 'react';
import { v4 as uuidv4 } from 'uuid';

interface BranchCondition {
  id: string;
  label: string;
  condition: string;
}

interface BranchConfigProps {
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
}

const BranchConfig: React.FC<BranchConfigProps> = ({ config, onConfigChange }) => {
  const branches: BranchCondition[] = config.branches || [
    { id: uuidv4(), label: '条件1', condition: '' },
    { id: uuidv4(), label: '条件2', condition: '' }
  ];

  const addBranch = (): void => {
    const newBranch = {
      id: uuidv4(),
      label: `条件${branches.length + 1}`,
      condition: ''
    };
    onConfigChange({ ...config, branches: [...branches, newBranch] });
  };

  const removeBranch = (branchId: string): void => {
    if (branches.length <= 2) {
      alert('分支节点至少需要2个分支');
      return;
    }
    onConfigChange({ ...config, branches: branches.filter((b: any) => b.id !== branchId) });
  };

  const updateBranch = (branchId: string, field: string, value: string): void => {
    const updatedBranches = branches.map((branch: any) =>
      branch.id === branchId ? { ...branch, [field]: value } : branch
    );
    onConfigChange({ ...config, branches: updatedBranches });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          分支条件配置
        </label>
        <button
          onClick={addBranch}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + 添加分支
        </button>
      </div>

      {branches.map((branch: any, index: number) => (
        <div key={branch.id} className="border border-gray-200 dark:border-gray-600 rounded-md p-3 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              分支 {index + 1}
            </span>
            {branches.length > 2 && (
              <button
                onClick={() => removeBranch(branch.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                删除
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              分支标签
            </label>
            <input
              type="text"
              value={branch.label}
              onChange={(e) => updateBranch(branch.id, 'label', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="分支名称"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              条件描述
            </label>
            <textarea
              value={branch.condition}
              onChange={(e) => updateBranch(branch.id, 'condition', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="描述此分支的执行条件"
            />
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-500">
        每个分支可以连接到不同的后续节点。
      </p>
    </div>
  );
};

export default BranchConfig;