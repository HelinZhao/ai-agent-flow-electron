import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from 'react-simple-code-editor';

interface NodeRef {
  id: string
  label: string
  type: string
}

interface ExpressionInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  minHeight?: string
  size?: 'xs' | 'sm' | 'md'
  availableNodes?: NodeRef[]
}

/** 高亮 {{$input}}、{{$params}}、{{$nodes}}、{{$env}}、{{$global}}、{{$now}}、{{var}} 和裸写 $nodes */
// 注意：只能用 text-* 和 bg-*，不能有 padding/border/margin/rounded 等影响尺寸的类
// 否则 <pre> 高亮层和 <textarea> 输入层宽度不一致 → 光标错位
function highlight(text: string): string {
  const regex = /(\{\{\$nodes(?:\["[^"]+"\]|\.\w+)(?:\.[a-zA-Z_$][\w$]*)*\}\})|(\{\{\$(?:input|params\.\w+(?:\.\w+)*|env\.\w+|global\.\w+|now(?:\.\w+)?)\}\})|(\{\{\w+\}\})|(\$nodes(?:\["[^"]+"\]|\.\w+)(?:\.[a-zA-Z_$][\w$]*)?)/g
  return text.replace(regex, (match, nodesBuiltin, dollarBuiltin, variable, bareNodes) => {
    if (nodesBuiltin) return `<span class="text-purple-600 dark:text-purple-400 bg-purple-100/60 dark:bg-purple-900/30">${nodesBuiltin}</span>`
    if (dollarBuiltin) return `<span class="text-teal-600 dark:text-teal-400 bg-teal-100/60 dark:bg-teal-900/30">${dollarBuiltin}</span>`
    if (variable) return `<span class="text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/30">${variable}</span>`
    if (bareNodes) return `<span class="text-purple-600 dark:text-purple-400 bg-purple-100/60 dark:bg-purple-900/30">${bareNodes}</span>`
    return match
  })
}

const PADDING_CLASS = { xs: '!px-2 !py-1', sm: '!px-3 !py-1.5', md: '!px-4 !py-2.5' }
const TEXT_CLASS = { xs: 'text-xs leading-5 rounded', sm: 'text-sm leading-5 rounded', md: 'text-sm leading-6 rounded-md' }

const ExpressionInput: React.FC<ExpressionInputProps> = ({
  value,
  onChange,
  placeholder,
  minHeight,
  size = 'md',
  availableNodes = [],
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [filter, setFilter] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const filteredNodes = availableNodes.filter(n =>
    n.label.toLowerCase().includes(filter.toLowerCase()) ||
    n.id.toLowerCase().includes(filter.toLowerCase())
  )

  const handleValueChange = useCallback((newValue: string) => {
    onChange(newValue)

    // 检测是否刚输入了 $ 字符
    const cursorPos = textareaRef.current?.selectionStart ?? newValue.length
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const dollarMatch = textBeforeCursor.match(/\$(\w*)$/)

    if (dollarMatch) {
      setFilter(dollarMatch[1] || '')
      setShowMenu(true)
    } else {
      setShowMenu(false)
    }
  }, [onChange])

  const handleSelectNode = useCallback((nodeId: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const cursorPos = textarea.selectionStart
    const textBefore = value.slice(0, cursorPos)
    const textAfter = value.slice(cursorPos)

    // 替换最后的 $xxx 为 {{$nodes["xxx"].output}} （花括号包裹，与其他变量语法一致）
    const replaced = textBefore.replace(/\$\w*$/, `{{$nodes["${nodeId}"].output}}`)
    const newValue = replaced + textAfter
    onChange(newValue)
    setShowMenu(false)
  }, [value, onChange])

  // 获取 textarea ref（Editor 内部是 textarea）
  useEffect(() => {
    const el = editorRef.current?.querySelector('textarea')
    if (el) {
      textareaRef.current = el
    }
  }, [])

  return (
    <div className="relative" ref={editorRef}>
      <Editor
        value={value}
        onValueChange={handleValueChange}
        highlight={highlight}
        placeholder={placeholder}
        textareaClassName={`focus:outline-none bg-transparent ${PADDING_CLASS[size]}`}
        preClassName={PADDING_CLASS[size]}
        className={`border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 ${TEXT_CLASS[size]}`}
        style={{
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          minHeight: minHeight || '100px',
        }}
        tabSize={2}
        insertSpaces
      />

      {/* $nodes 自动补全菜单 */}
      {showMenu && filteredNodes.length > 0 && (
        <div className="absolute z-50 left-2 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
            引用节点输出 (点击插入)
          </div>
          {filteredNodes.map(node => (
            <button
              key={node.id}
              onClick={() => handleSelectNode(node.id)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white truncate">{node.label}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 shrink-0">{node.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ExpressionInput
