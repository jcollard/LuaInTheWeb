import styles from './HtmlViewer.module.css'
import type { HtmlViewerProps } from './types'

/**
 * Renders HTML content in a sandboxed iframe.
 * allow-scripts enables JS execution inside the iframe but
 * without allow-same-origin, parent DOM access is prevented.
 */
export function HtmlViewer({ content, className }: HtmlViewerProps) {
  const combinedClassName = className
    ? `${styles.htmlViewer} ${className}`
    : styles.htmlViewer

  return (
    <iframe
      srcDoc={content}
      sandbox="allow-scripts"
      title="HTML Preview"
      className={combinedClassName}
      data-testid="html-viewer"
    />
  )
}
