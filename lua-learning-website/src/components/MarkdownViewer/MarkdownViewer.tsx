import { useCallback, useMemo, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import styles from './MarkdownViewer.module.css'
import type { MarkdownViewerProps } from './types'

// Module-level map to persist scroll positions across re-renders
const scrollPositions = new Map<string, number>()

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
export function MarkdownViewer({ content, className, basePath, onLinkClick, filePath }: MarkdownViewerProps) {
  const combinedClassName = className
    ? `${styles.markdownViewer} ${className}`
    : styles.markdownViewer

  const containerRef = useRef<HTMLDivElement>(null)
  const previousFilePathRef = useRef<string | undefined>(filePath)

  // Save scroll position when switching away from a file
  useEffect(() => {
    const container = containerRef.current
    if (!container || !filePath) return

    // If file path changed, save the old position and restore the new one
    if (previousFilePathRef.current && previousFilePathRef.current !== filePath) {
      // Position was already saved by scroll handler, just restore new file's position
      const savedPosition = scrollPositions.get(filePath)
      container.scrollTop = savedPosition ?? 0
    } else if (!scrollPositions.has(filePath)) {
      // First time opening this file - scroll to top
      container.scrollTop = 0
    } else {
      // Restoring same file (e.g., on re-mount) - restore position
      container.scrollTop = scrollPositions.get(filePath) ?? 0
    }

    previousFilePathRef.current = filePath
  }, [filePath])

  // Track scroll position on scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container || !filePath) return

    const handleScroll = () => {
      scrollPositions.set(filePath, container.scrollTop)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [filePath])

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
      // External links open in new tab
      const isExternal = href?.startsWith('http://') || href?.startsWith('https://')
      if (isExternal) {
        return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
      }
      return <a href={href} {...props}>{children}</a>
    }
  }), [basePath, onLinkClick, handleLinkClick])

  return (
    <div ref={containerRef} className={combinedClassName} data-testid="markdown-viewer">
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
