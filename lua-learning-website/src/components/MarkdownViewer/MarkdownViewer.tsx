import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import styles from './MarkdownViewer.module.css'
import type { MarkdownViewerProps } from './types'

/**
 * Custom sanitization schema that extends the default to allow
 * safe styling attributes and highlight.js classes while still
 * preventing XSS attacks.
 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow class and style on all elements (for styling and highlight.js)
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'class', 'style'],
    // Allow highlight.js language class on code elements
    code: [...(defaultSchema.attributes?.['code'] ?? []), 'className', 'class'],
    // Allow hljs class on spans (for syntax tokens)
    span: [...(defaultSchema.attributes?.['span'] ?? []), 'className', 'class'],
  },
}

/**
 * Renders markdown content with support for sanitized HTML
 */
export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  const combinedClassName = className
    ? `${styles.markdownViewer} ${className}`
    : styles.markdownViewer

  return (
    <div className={combinedClassName} data-testid="markdown-viewer">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
