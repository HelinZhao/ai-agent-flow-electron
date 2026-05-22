import React from 'react';
import Editor from 'react-simple-code-editor';

interface TemplateEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  minHeight?: string
  size?: 'xs' | 'sm' | 'md'
}

/** 将文本中的 {{placeholder}} 用 span 包裹用于高亮 */
function highlight(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const regex = /\{\{(\w+)\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <span key={match.index} className="text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/30">
        {'{{'}{match[1]}{'}}'}
      </span>
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return <>{parts}</>
}

const PADDING_CLASS = { xs: '!px-2 !py-1', sm: '!px-3 !py-1.5', md: '!px-4 !py-2.5' }
const TEXT_CLASS = { xs: 'text-xs leading-5 rounded', sm: 'text-sm leading-5 rounded', md: 'text-sm leading-6 rounded-md' }

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  value,
  onChange,
  placeholder,
  minHeight,
  size = 'md',
}) => {
  return (
    <Editor
      value={value}
      onValueChange={onChange}
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
  )
}

export default TemplateEditor
