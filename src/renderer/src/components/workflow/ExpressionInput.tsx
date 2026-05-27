import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

interface Suggestion {
  label: string
  insert: string  // $模式插入的内容
  insertBracket: string  // {{$}}模式插入的内容
  category: string
  description?: string
}

/** 高亮 {{$xxx}} 内置变量和裸写 $nodes，以及 {{表达式}} */
function highlight(text: string): string {
  const markers = new Set<string>()
  let result = text
  const knownRegex = /(\{\{\$nodes(?:\["[^"]+"\]|\.\w+)(?:\.[a-zA-Z_$][\w$]*)*\}\})|(\{\{\$(?:input|params\.\w+(?:\.\w+)*|env\.\w+|global\.\w+|vars\.\w+|now(?:\.\w+)?)\}\})|(\$nodes(?:\["[^"]+"\]|\.\w+)(?:\.[a-zA-Z_$][\w$]*)?)/g
  result = result.replace(knownRegex, (match, nodesBuiltin, dollarBuiltin, bareNodes) => {
    markers.add(match)
    if (nodesBuiltin) return `<span class="text-purple-600 dark:text-purple-400 bg-purple-100/60 dark:bg-purple-900/30">${nodesBuiltin}</span>`
    if (dollarBuiltin) return `<span class="text-teal-600 dark:text-teal-400 bg-teal-100/60 dark:bg-teal-900/30">${dollarBuiltin}</span>`
    if (bareNodes) return `<span class="text-purple-600 dark:text-purple-400 bg-purple-100/60 dark:bg-purple-900/30">${bareNodes}</span>`
    return match
  })
  result = result.replace(/\{\{[^}]+\}\}/g, (match) => {
    if (markers.has(match)) return match
    return `<span class="text-teal-600 dark:text-teal-400 bg-teal-100/60 dark:bg-teal-900/30">${match}</span>`
  })
  return result
}

const PADDING_CLASS = { xs: '!px-2 !py-1', sm: '!px-3 !py-1.5', md: '!px-4 !py-2.5' }
const TEXT_CLASS = { xs: 'text-xs leading-5 rounded', sm: 'text-sm leading-5 rounded', md: 'text-sm leading-6 rounded-md' }

/** 所有可用变量的定义 */
function buildSuggestions(availableNodes: NodeRef[]): Suggestion[] {
  const list: Suggestion[] = [
    { label: '$input', insert: '$input', insertBracket: '{{$input}}', category: '核心', description: '上游输入' },
    { label: '$params.', insert: '$params.', insertBracket: '{{$params.}}', category: '核心', description: 'Start 节点参数，如 $params.name' },
    { label: '$env.', insert: '$env.', insertBracket: '{{$env.}}', category: '环境变量', description: '工作流级环境变量，如 $env.API_KEY' },
    { label: '$global.', insert: '$global.', insertBracket: '{{$global.}}', category: '环境变量', description: '全局环境变量' },
    { label: '$vars.', insert: '$vars.', insertBracket: '{{$vars.}}', category: '变量', description: '工作流变量节点设置的值' },
    { label: '$now', insert: '$now', insertBracket: '{{$now}}', category: '时间', description: '当前 ISO 时间' },
    { label: '$now.date', insert: '$now.date', insertBracket: '{{$now.date}}', category: '时间', description: '日期 YYYY-MM-DD' },
    { label: '$now.time', insert: '$now.time', insertBracket: '{{$now.time}}', category: '时间', description: '时间 HH:mm:ss' },
    { label: '$now.timestamp', insert: '$now.timestamp', insertBracket: '{{$now.timestamp}}', category: '时间', description: '毫秒时间戳' },
    { label: '$now.iso', insert: '$now.iso', insertBracket: '{{$now.iso}}', category: '时间', description: 'ISO 完整时间' },
    { label: '$now.year', insert: '$now.year', insertBracket: '{{$now.year}}', category: '时间', description: '年份' },
    { label: '$now.month', insert: '$now.month', insertBracket: '{{$now.month}}', category: '时间', description: '月份 01-12' },
    { label: '$now.day', insert: '$now.day', insertBracket: '{{$now.day}}', category: '时间', description: '日 01-31' },
    { label: '$now.hour', insert: '$now.hour', insertBracket: '{{$now.hour}}', category: '时间', description: '小时 00-23' },
    { label: '$now.minute', insert: '$now.minute', insertBracket: '{{$now.minute}}', category: '时间', description: '分钟 00-59' },
    { label: '$now.second', insert: '$now.second', insertBracket: '{{$now.second}}', category: '时间', description: '秒 00-59' },
  ]
  // 如果有 availableNodes，添加 $nodes 引用
  if (availableNodes.length > 0) {
    list.push({ label: '$nodes["id"].output', insert: '$nodes[', insertBracket: '{{$nodes[""]}}', category: '核心', description: '引用已完成节点输出' })
  }
  return list
}

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
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [hasBracket, setHasBracket] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const allSuggestions = useMemo(() => buildSuggestions(availableNodes), [availableNodes])

  const filtered = useMemo(() => {
    if (!filter) return allSuggestions
    const f = filter.toLowerCase()
    return allSuggestions.filter(s => s.label.toLowerCase().includes(f))
  }, [filter, allSuggestions])

  const handleValueChange = useCallback((newValue: string) => {
    onChange(newValue)

    const cursorPos = textareaRef.current?.selectionStart ?? newValue.length
    const textBeforeCursor = newValue.slice(0, cursorPos)

    // 检测触发条件：{{$xxx 或 $xxx
    const bracketMatch = textBeforeCursor.match(/\{\{(\$[\w.]*)$/)
    const dollarMatch = !bracketMatch && textBeforeCursor.match(/(\$[\w.]*)$/)

    if (bracketMatch || dollarMatch) {
      const ta = textareaRef.current
      if (ta) {
        // 估算光标位置：计算光标前换行数 × 行高
        const textBefore = newValue.slice(0, cursorPos)
        const lines = textBefore.split('\n')
        const lineNum = lines.length - 1
        const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 20
        const padding = parseInt(getComputedStyle(ta).paddingTop) || 8
        const editorRect = editorRef.current?.getBoundingClientRect()
        const taRect = ta.getBoundingClientRect()
        if (editorRect) {
          setMenuPos({
            top: taRect.top - editorRect.top + padding + (lineNum + 1) * lineHeight,
            left: 8 // 固定缩进
          })
        }
      }
      if (bracketMatch) setFilter(bracketMatch[1] || '$')
      else setFilter(dollarMatch![1] || '$')
      setHasBracket(!!bracketMatch)
      setSelectedIndex(0)
      setShowMenu(true)
    } else {
      setShowMenu(false)
    }
  }, [onChange])

  const insertSuggestion = useCallback((suggestion: Suggestion) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const cursorPos = textarea.selectionStart
    const textBefore = value.slice(0, cursorPos)
    const textAfter = value.slice(cursorPos)

    // 确定要替换的末尾模式
    const replaced = hasBracket
      ? textBefore.replace(/\{\{(\$[\w.]*)$/, suggestion.insertBracket)
      : textBefore.replace(/(\$[\w.]*)$/, suggestion.insert)
    const newValue = replaced + textAfter
    onChange(newValue)
    setShowMenu(false)
    // 设置焦点回编辑器
    setTimeout(() => textarea.focus(), 0)
  }, [value, onChange, hasBracket])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showMenu || filtered.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        insertSuggestion(filtered[selectedIndex])
        break
      case 'Escape':
        e.preventDefault()
        setShowMenu(false)
        break
    }
  }, [showMenu, filtered, selectedIndex, insertSuggestion])

  // 获取 textarea ref
  useEffect(() => {
    const el = editorRef.current?.querySelector('textarea')
    if (el) {
      textareaRef.current = el
      el.addEventListener('keydown', handleKeyDown as any)
    }
    return () => {
      if (textareaRef.current) {
        textareaRef.current.removeEventListener('keydown', handleKeyDown as any)
      }
    }
  }, [handleKeyDown])

  // 点击外部关闭菜单
  useEffect(() => {
    if (!showMenu) return
    const onClick = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node) &&
          menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [showMenu])

  // 分组显示
  const grouped = useMemo(() => {
    const groups: Record<string, Suggestion[]> = {}
    for (const s of filtered) {
      if (!groups[s.category]) groups[s.category] = []
      groups[s.category].push(s)
    }
    return groups
  }, [filtered])

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

      {showMenu && filtered.length > 0 && (
        <div
          ref={menuRef}
          style={{ position: 'absolute', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          className="w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-64 overflow-y-auto"
        >
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                {category}
              </div>
              {items.map((s) => {
                const globalIdx = filtered.indexOf(s)
                return (
                  <button
                    key={s.label}
                    onMouseDown={() => insertSuggestion(s)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                      globalIdx === selectedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <code className="font-mono text-xs truncate">{s.label}</code>
                      {s.description && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate hidden sm:inline">
                          {s.description}
                        </span>
                      )}
                    </div>
                    <code className="text-[10px] text-gray-400 dark:text-gray-500 ml-2 shrink-0 font-mono">
                      {s.insertBracket}
                    </code>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ExpressionInput