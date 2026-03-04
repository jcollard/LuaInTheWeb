import { useState, useCallback, useId, type KeyboardEvent } from 'react'
import type { GroupLayer } from './types'
import type { ImportEntry } from './layerImport'
import dialogStyles from './SaveAsDialog.module.css'
import styles from './ImportLayersDialog.module.css'

export interface ImportLayersDialogProps {
  entries: ImportEntry[]
  groups: GroupLayer[]
  onConfirm: (selectedIds: Set<string>, targetParentId: string | undefined) => void
  onCancel: () => void
  warnings: string[]
}

const INDENT_PX = 24
const BASE_PADDING_PX = 8

export function ImportLayersDialog({
  entries,
  groups,
  onConfirm,
  onCancel,
  warnings,
}: ImportLayersDialogProps) {
  const titleId = useId()
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(entries.map(e => e.layer.id)),
  )
  const [targetParentId, setTargetParentId] = useState<string | undefined>(undefined)
  const [filter, setFilter] = useState('')

  const filteredEntries = filter
    ? entries.filter(e => e.layer.name.toLowerCase().includes(filter.toLowerCase()))
    : entries

  const handleToggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelected(new Set(entries.map(e => e.layer.id)))
  }, [entries])

  const handleDeselectAll = useCallback(() => {
    setSelected(new Set())
  }, [])

  const handleConfirm = useCallback(() => {
    onConfirm(selected, targetParentId)
  }, [onConfirm, selected, targetParentId])

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <div className={dialogStyles.overlay} onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={dialogStyles.dialog}
        onKeyDown={handleKeyDown}
        onClick={e => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className={dialogStyles.header}>
          <h2 id={titleId} className={dialogStyles.title}>Import Layers</h2>
        </div>

        <div className={dialogStyles.body}>
          <div>
            <label className={dialogStyles.label} htmlFor="import-parent-select">
              Import into:
            </label>
            <select
              id="import-parent-select"
              data-testid="import-parent-select"
              className={styles.parentSelect}
              value={targetParentId ?? ''}
              onChange={e => setTargetParentId(e.target.value || undefined)}
            >
              <option value="">Root</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            className={dialogStyles.filenameInput}
            placeholder="Filter layers..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            data-testid="import-filter-input"
          />

          <div className={styles.bulkActions}>
            <button
              type="button"
              className={styles.linkButton}
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <button
              type="button"
              className={styles.linkButton}
              onClick={handleDeselectAll}
            >
              Deselect All
            </button>
          </div>

          <div className={styles.layerList} data-testid="import-layer-list">
            {filteredEntries.map(({ layer, depth }) => (
              <label
                key={layer.id}
                className={styles.layerItem}
                data-testid={`import-layer-${layer.id}`}
                style={{ paddingLeft: `${BASE_PADDING_PX + depth * INDENT_PX}px` }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(layer.id)}
                  onChange={() => handleToggle(layer.id)}
                  data-testid={`import-check-${layer.id}`}
                />
                <span>{layer.name}</span>
                <span className={styles.layerType}>({layer.type})</span>
              </label>
            ))}
          </div>

          {warnings.map((w, i) => (
            <div key={i} className={styles.warning}>{w}</div>
          ))}
        </div>

        <div className={dialogStyles.footer}>
          <button
            type="button"
            className={`${dialogStyles.button} ${dialogStyles.cancelButton}`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${dialogStyles.button} ${dialogStyles.saveButton}`}
            onClick={handleConfirm}
            data-testid="import-confirm-button"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
