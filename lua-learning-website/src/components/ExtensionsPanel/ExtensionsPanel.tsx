import styles from './ExtensionsPanel.module.css'

export interface ExtensionsPanelProps {
  onOpenAnsiEditor: () => void
}

export function ExtensionsPanel({ onOpenAnsiEditor }: ExtensionsPanelProps) {
  return (
    <div className={styles.extensionsList} data-testid="extensions-panel">
      <button
        type="button"
        className={styles.extensionItem}
        onClick={onOpenAnsiEditor}
        data-testid="open-ansi-editor"
      >
        <span className={styles.extensionIcon} aria-hidden="true">
          &#9618;
        </span>
        <span className={styles.extensionName}>ANSI Graphics Editor</span>
      </button>
    </div>
  )
}
