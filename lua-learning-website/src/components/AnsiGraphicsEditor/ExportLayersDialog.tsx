import { useState, useCallback, useRef, useEffect, useId, useMemo, type KeyboardEvent } from 'react'
import type { TreeNode } from '../../hooks/fileSystemTypes'
import type { ImportEntry } from './layerImport'
import type { Layer } from './types'
import { isGroupLayer } from './types'
import { deduplicateFileName, getGroupCheckState, computeExportWarnings } from './layerExport'
import { useExportLayerSelection } from './useExportLayerSelection'
import { DirectoryPicker } from './DirectoryPicker'
import dialogStyles from './SaveAsDialog.module.css'
import importStyles from './ImportLayersDialog.module.css'
import styles from './ExportLayersDialog.module.css'

export interface ExportLayersDialogProps {
  entries: ImportEntry[]
  allLayers: Layer[]
  tree: TreeNode[]
  defaultFileName: string
  defaultFolderPath?: string
  availableTags?: string[]
  checkFileExists?: (path: string) => boolean
  onConfirm: (selectedIds: Set<string>, flattenToRoot: boolean, includeEmptyGroups: boolean, folderPath: string, fileName: string) => void
  onCancel: () => void
}

const INDENT_PX = 24
const BASE_PADDING_PX = 8
const EXTENSION = '.ansi.lua'

function ensureExtension(name: string): string {
  if (name.endsWith(EXTENSION)) return name
  return name.replace(/\.ansi$|\.lua$/, '') + EXTENSION
}

export function ExportLayersDialog({
  entries, allLayers, tree, defaultFileName, defaultFolderPath,
  availableTags, checkFileExists, onConfirm, onCancel,
}: ExportLayersDialogProps) {
  const titleId = useId()
  const [flattenToRoot, setFlattenToRoot] = useState(false)
  const [includeEmptyGroups, setIncludeEmptyGroups] = useState(false)
  const [filter, setFilter] = useState('')
  const [selectedPath, setSelectedPath] = useState(defaultFolderPath ?? '/')
  const [fileName, setFileName] = useState(defaultFileName)
  const [error, setError] = useState('')

  const {
    selected, activeTags, collapsed, hiddenByCollapse,
    handleToggle, handleSelectAll, handleDeselectAll, handleSelectVisible,
    handleAddTag, handleRemoveTag, handleToggleCollapse,
  } = useExportLayerSelection({ entries, allLayers, flattenToRoot })

  const filenameInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { filenameInputRef.current?.focus(); filenameInputRef.current?.select() }, [])

  const filteredEntries = useMemo(() => entries.filter(e => {
    if (hiddenByCollapse.has(e.layer.id)) return false
    if (filter && !e.layer.name.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  }), [entries, filter, hiddenByCollapse])

  const resolvedFileName = useMemo(() => {
    const trimmed = fileName.trim()
    if (!trimmed || trimmed === EXTENSION) return null
    const withExt = ensureExtension(trimmed)
    if (!checkFileExists) return { finalName: withExt, renamed: false }
    return deduplicateFileName(selectedPath, withExt, checkFileExists)
  }, [fileName, selectedPath, checkFileExists])

  const handleConfirm = useCallback(() => {
    if (!resolvedFileName) { setError('Please enter a file name.'); return }
    setError('')
    onConfirm(selected, flattenToRoot, includeEmptyGroups, selectedPath, resolvedFileName.finalName)
  }, [onConfirm, selected, flattenToRoot, includeEmptyGroups, selectedPath, resolvedFileName])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); onCancel() }
  }, [onCancel])

  const warnings = computeExportWarnings(entries, selected, flattenToRoot)
  const hasTags = availableTags && availableTags.length > 0

  return (
    <div className={dialogStyles.overlay} onClick={onCancel} data-testid="export-layers-overlay">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={dialogStyles.dialog} onKeyDown={handleKeyDown}
        onClick={e => e.stopPropagation()} tabIndex={-1}>
        <div className={dialogStyles.header}>
          <h2 id={titleId} className={dialogStyles.title}>Export Layers</h2>
        </div>

        <div className={dialogStyles.body}>
          <input type="text" className={dialogStyles.filenameInput} placeholder="Filter layers..."
            value={filter} onChange={e => setFilter(e.target.value)} data-testid="export-filter-input" />

          <div className={importStyles.bulkActions}>
            <button type="button" className={importStyles.linkButton}
              onClick={handleSelectAll}>Select All</button>
            <button type="button" className={importStyles.linkButton}
              onClick={handleSelectVisible} data-testid="export-select-visible">Select Visible Layers</button>
            <button type="button" className={importStyles.linkButton}
              onClick={handleDeselectAll}>Deselect All</button>
          </div>

          {hasTags && (
            <div data-testid="export-tags-row">
              <div className={styles.tagRow}>
                <label className={styles.tagLabel} htmlFor="export-tag-select">Select by tag:</label>
                <select id="export-tag-select" className={styles.tagSelect} value=""
                  onChange={e => { if (e.target.value) handleAddTag(e.target.value) }}
                  data-testid="export-tag-select">
                  <option value="" disabled>Choose a tag...</option>
                  {availableTags.filter(t => !activeTags.has(t)).map(tag => (
                    <option key={tag} value={tag} data-testid={`export-tag-${tag}`}>{tag}</option>
                  ))}
                </select>
              </div>
              {activeTags.size > 0 && (
                <div className={styles.pillRow} data-testid="export-tag-pills">
                  {[...activeTags].map(tag => (
                    <button key={tag} type="button" className={styles.pill}
                      onClick={() => handleRemoveTag(tag)} data-testid={`export-pill-${tag}`}>
                      {tag} <span className={styles.pillClose}>{'\u00D7'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={importStyles.layerList} data-testid="export-layer-list">
            {filteredEntries.map(({ layer, depth }) => {
              const isGroup = isGroupLayer(layer)
              const groupState = isGroup ? getGroupCheckState(layer.id, allLayers, selected) : null
              const isChecked = isGroup ? groupState === 'all' : selected.has(layer.id)
              return (
                <div key={layer.id} className={importStyles.layerItem}
                  data-testid={`export-layer-${layer.id}`}
                  style={{ paddingLeft: `${BASE_PADDING_PX + depth * INDENT_PX}px` }}>
                  {isGroup && (
                    <button type="button" className={styles.collapseToggle}
                      onClick={() => handleToggleCollapse(layer.id)}
                      data-testid={`export-collapse-${layer.id}`}
                      title={collapsed.has(layer.id) ? 'Expand group' : 'Collapse group'}>
                      {collapsed.has(layer.id) ? '\u25B6' : '\u25BC'}
                    </button>
                  )}
                  <input type="checkbox" checked={isChecked}
                    ref={el => { if (el) el.indeterminate = groupState === 'some' }}
                    onChange={e => handleToggle(layer.id, e.target.checked)}
                    data-testid={`export-check-${layer.id}`} />
                  <span>{layer.name}</span>
                  <span className={importStyles.layerType}>({layer.type})</span>
                </div>
              )
            })}
          </div>

          <label className={styles.flattenRow} data-testid="export-flatten-row">
            <input type="checkbox" checked={flattenToRoot}
              onChange={e => setFlattenToRoot(e.target.checked)}
              data-testid="export-flatten-checkbox" />
            Export layers to Root
            <span className={styles.tooltipIcon}
              title="Ignores the group structure and all layers will be saved in the root"
              data-testid="export-flatten-tooltip">?</span>
          </label>

          <label className={styles.flattenRow} data-testid="export-empty-groups-row">
            <input type="checkbox" checked={includeEmptyGroups}
              onChange={e => setIncludeEmptyGroups(e.target.checked)}
              data-testid="export-empty-groups-checkbox" />
            Export Empty Groups
          </label>

          {warnings.map((w, i) => (
            <div key={i} className={importStyles.warning} data-testid="export-warning">{w}</div>
          ))}

          <div>
            <div className={dialogStyles.label}>Location</div>
            <DirectoryPicker tree={tree} selectedPath={selectedPath} onSelect={setSelectedPath} />
          </div>

          <div className={dialogStyles.filenameGroup}>
            <label className={dialogStyles.label} htmlFor="export-filename">File name</label>
            <input ref={filenameInputRef} id="export-filename" className={dialogStyles.filenameInput}
              type="text" value={fileName}
              onChange={e => { setFileName(e.target.value); setError('') }}
              data-testid="export-filename" />
            {error && <div className={dialogStyles.errorMessage} data-testid="export-error">{error}</div>}
            {resolvedFileName?.renamed && (
              <div className={importStyles.warning} data-testid="export-rename-warning">
                File already exists — will be saved as "{resolvedFileName.finalName}"
              </div>
            )}
          </div>
        </div>

        <div className={dialogStyles.footer}>
          <button type="button" className={`${dialogStyles.button} ${dialogStyles.cancelButton}`}
            onClick={onCancel} data-testid="export-cancel">Cancel</button>
          <button type="button" className={`${dialogStyles.button} ${dialogStyles.saveButton}`}
            onClick={handleConfirm} disabled={selected.size === 0}
            data-testid="export-confirm-button">Export</button>
        </div>
      </div>
    </div>
  )
}
