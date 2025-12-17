import { useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import styles from './MarkdownViewer.module.css'
import type { MarkdownViewerProps } from './types'

/**
 * Resolves a relative path against a base path
 */
function resolvePath(basePath: string, relativePath: string): string {
  // Remove leading ./ if present
  const cleanRelative = relativePath.startsWith('./') ? relativePath.slice(2) : relativePath

  // Combine base path with relative path
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
  return `${base}/${cleanRelative}`
}

/**
 * Checks if a URL is a relative link (not external or anchor)
 */
function isRelativeLink(href: string | undefined): boolean {
  if (!href) return false
  if (href.startsWith('http://') || href.startsWith('https://')) return false
  if (href.startsWith('#')) return false
  if (href.startsWith('mailto:')) return false
  return true
}

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
export function MarkdownViewer({ content, className, basePath, onLinkClick }: MarkdownViewerProps) {
  const combinedClassName = className
    ? `${styles.markdownViewer} ${className}`
    : styles.markdownViewer

  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    if (basePath && onLinkClick) {
      const resolvedPath = resolvePath(basePath, href)
      onLinkClick(resolvedPath)
    }
  }, [basePath, onLinkClick])

  const components = useMemo<Components>(() => ({
    a: ({ href, children, ...props }) => {
      if (isRelativeLink(href) && basePath && onLinkClick) {
        return (
          <a
            href={href}
            onClick={(e) => handleLinkClick(e, href!)}
            {...props}
          >
            {children}
          </a>
        )
      }
      return <a href={href} {...props}>{children}</a>
    }
  }), [basePath, onLinkClick, handleLinkClick])

  return (
    <div className={combinedClassName} data-testid="markdown-viewer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
