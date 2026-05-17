import { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import CustomButton from './CustomButton';

export interface PickerItem {
  id: string
  label: string
  description?: string
}

interface ItemPickerModalProps {
  open: boolean
  title: string
  items: PickerItem[]
  selected: string[]
  onApply: (ids: string[]) => void
  onClose: () => void
}

function CheckCircle({ checked }: { checked: boolean }) {
  return (
    <div
      className={`flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all duration-200 ${
        checked
          ? 'bg-blue-500 border-blue-500'
          : 'border-gray-300 dark:border-gray-500 group-hover/item:border-gray-400 dark:group-hover/item:border-gray-400'
      }`}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}

export default function ItemPickerModal({
  open,
  title,
  items,
  selected,
  onApply,
  onClose,
}: ItemPickerModalProps) {
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setLocalSelected(selected);
      setSearch('');
    }
  }, [open]);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const q = search.toLowerCase();
        return (
          !q ||
          item.label.toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
        );
      }),
    [items, search],
  );

  const toggleItem = (id: string) => {
    setLocalSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    const allIds = filtered.map((item) => item.id);
    setLocalSelected((prev) => [...new Set([...prev, ...allIds])]);
  };

  const deselectAll = () => {
    const allIds = new Set(filtered.map((item) => item.id));
    setLocalSelected((prev) => prev.filter((id) => !allIds.has(id)));
  };

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((item) => localSelected.includes(item.id));

  const handleConfirm = () => {
    onApply(localSelected);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span>
          {title}
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
            ({localSelected.length} 项已选)
          </span>
        </span>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-gray-400 dark:text-gray-500">{items.length} 项</span>
          <CustomButton onClick={handleConfirm} variant="primary" size="sm">
            完成{localSelected.length > 0 && ` (${localSelected.length})`}
          </CustomButton>
        </div>
      }
    >
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 dark:focus:border-blue-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Select all / clear */}
      {filtered.length > 1 && (
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={allVisibleSelected ? deselectAll : selectAll}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {allVisibleSelected ? '取消全选' : '全选'}
          </button>
          {localSelected.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">已选 {localSelected.length} 项</span>
          )}
        </div>
      )}

      {/* Item list */}
      <div className="space-y-1 max-h-80 overflow-y-auto mt-2 -mx-2 px-2">
        {filtered.map((item) => {
          const enabled = localSelected.includes(item.id);
          const firstChar = item.label.charAt(0);
          return (
            <div
              key={item.id}
              role="option"
              aria-selected={enabled}
              onClick={() => toggleItem(item.id)}
              className="group/item relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 select-none"
              style={{ backgroundColor: enabled ? 'rgba(59, 130, 246, 0.06)' : undefined }}
            >
              {enabled && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-500 rounded-full" />
              )}
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 transition-colors ${
                  enabled
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 group-hover/item:bg-gray-200 dark:group-hover/item:bg-gray-600'
                }`}
              >
                <span className="text-sm font-semibold">{firstChar}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-medium transition-colors ${
                    enabled ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {item.label}
                </div>
                {item.description && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {item.description}
                  </div>
                )}
              </div>
              <CheckCircle checked={enabled} />
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
            <svg className="w-10 h-10 mb-2 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p className="text-sm">无匹配结果</p>
            <p className="text-xs mt-0.5">尝试更换搜索关键词</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
