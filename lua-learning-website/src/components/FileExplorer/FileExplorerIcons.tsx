import styles from './FileExplorer.module.css'

// Stryker disable all: Icon components are visual-only, no logic to test
export const NewFileIcon = () => (
  <svg className={styles.toolbarIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M12 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V4l-1-3zm-1 13H5V3h5v2h2v9zM8 7v2H6v1h2v2h1V10h2V9h-2V7H8z"
    />
  </svg>
)

export const NewFolderIcon = () => (
  <svg className={styles.toolbarIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M14 4H8l-1-1H2a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1zm-1 10H3V5h4l1 1h5v8zM8 8v1.5H6.5V11h1.5v1.5H9.5V11H11V9.5H9.5V8H8z"
    />
  </svg>
)

export const AddWorkspaceIcon = () => (
  <svg className={styles.toolbarIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      fill="currentColor"
      d="M14 4H8l-1-1H2a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1z"
    />
    <circle cx="12" cy="11" r="3" fill="currentColor" stroke="var(--bg-primary, #252526)" strokeWidth="1" />
    <path d="M12 9.5v3M10.5 11h3" stroke="var(--bg-primary, #252526)" strokeWidth="1" strokeLinecap="round" />
  </svg>
)
// Stryker restore all
