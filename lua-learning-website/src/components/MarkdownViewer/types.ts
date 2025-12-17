export interface MarkdownViewerProps {
  content: string
  className?: string
  /** Base path for resolving relative links (directory of current file) */
  basePath?: string
  /** Callback when a relative link is clicked */
  onLinkClick?: (path: string) => void
  /** File path for scroll position persistence */
  filePath?: string
}
