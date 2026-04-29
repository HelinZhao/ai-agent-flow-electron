import React from 'react'
import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

interface MarkdownPreviewProps {
  content: string
  className?: string
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className = '' }) => (
  <div
    className={`markdown-body ${className}`}
    dangerouslySetInnerHTML={{ __html: md.render(content) }}
  />
)

export default MarkdownPreview