import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { FONT_ATLASES, getFontById, getFontCoverage } from '@lua-learning/lua-runtime'
import {
  CHAR_PALETTE_CATEGORIES,
  getCharName,
  type CharEntry,
} from './charPaletteData'
import { extractCurrentChars, extractLayerChars } from './extractUsedChars'
import type { Layer } from './types'
import styles from './AnsiGraphicsEditor.module.css'

export interface CharacterPanelProps {
  currentChar: string
  fontId: string
  layers: readonly Layer[]
  activeLayerId: string
  recent: readonly string[]
  onSelect: (char: string) => void
}

type SpecialTabId = 'layer' | 'current' | 'recent' | 'all'
type TabId = string

interface ResolvedTab {
  id: TabId
  label: string
  entries: CharEntry[]
}

const SPECIAL_TAB_LABELS: Record<SpecialTabId, string> = {
  layer: 'Layer',
  current: 'Current',
  recent: 'Recent',
  all: 'All',
}

function entriesFor(chars: readonly string[]): CharEntry[] {
  return chars.map(c => ({ char: c, name: getCharName(c) }))
}

const allFontEntriesCache = new Map<string, CharEntry[]>()
function allFontEntries(fontId: string): CharEntry[] {
  const cached = allFontEntriesCache.get(fontId)
  if (cached) return cached
  const atlas = FONT_ATLASES.get(fontId)
  const cps = atlas ? Array.from(atlas.glyphs.keys()).sort((a, b) => a - b) : []
  const out = cps.map(cp => {
    const ch = String.fromCodePoint(cp)
    return { char: ch, name: getCharName(ch) }
  })
  allFontEntriesCache.set(fontId, out)
  return out
}

const curatedEntriesCache = new Map<string, ResolvedTab[]>()
function curatedTabsFor(fontId: string): ResolvedTab[] {
  const cached = curatedEntriesCache.get(fontId)
  if (cached) return cached
  const cov = getFontCoverage(fontId)
  const inFont = (e: CharEntry) => cov.has(e.char.codePointAt(0) ?? -1)
  const out = CHAR_PALETTE_CATEGORIES
    .map(cat => ({ id: cat.id, label: cat.label, entries: cat.chars.filter(inFont) }))
    .filter(t => t.entries.length > 0)
  curatedEntriesCache.set(fontId, out)
  return out
}

function matchesQuery(entry: CharEntry, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  if (entry.char === query) return true
  if (entry.name.toLowerCase().includes(q)) return true
  // Hex match: "u+2595", "U+2595", "2595", "0x2595".
  const hex = (entry.char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')
  const hexQuery = q.replace(/^(u\+|0x)/, '').toUpperCase()
  if (hexQuery && hex.includes(hexQuery)) return true
  return false
}

export function CharacterPanel({
  currentChar,
  fontId,
  layers,
  activeLayerId,
  recent,
  onSelect,
}: CharacterPanelProps): ReactElement {
  const [activeTab, setActiveTab] = useState<TabId>('alpha')
  const [query, setQuery] = useState('')

  const previewFontFamily = getFontById(fontId)?.fontFamily

  const curatedTabs = useMemo(() => curatedTabsFor(fontId), [fontId])
  const allTab = useMemo<ResolvedTab>(
    () => ({ id: 'all', label: SPECIAL_TAB_LABELS.all, entries: allFontEntries(fontId) }),
    [fontId],
  )

  const dynamicTabs = useMemo<ResolvedTab[]>(() => {
    const cov = getFontCoverage(fontId)
    const inFont = (c: string) => cov.has(c.codePointAt(0) ?? -1)
    const activeLayer = layers.find(l => l.id === activeLayerId)
    return [
      { id: 'layer', label: SPECIAL_TAB_LABELS.layer, entries: entriesFor(extractLayerChars(activeLayer).filter(inFont)) },
      { id: 'current', label: SPECIAL_TAB_LABELS.current, entries: entriesFor(extractCurrentChars(layers).filter(inFont)) },
      { id: 'recent', label: SPECIAL_TAB_LABELS.recent, entries: entriesFor(recent.filter(inFont)) },
    ]
  }, [fontId, layers, activeLayerId, recent])

  const tabs = useMemo<ResolvedTab[]>(
    () => [...curatedTabs, ...dynamicTabs, allTab],
    [curatedTabs, dynamicTabs, allTab],
  )

  const active = tabs.find(t => t.id === activeTab) ?? tabs[0]
  const visibleEntries = useMemo(
    () => active?.entries.filter(e => matchesQuery(e, query)) ?? [],
    [active, query],
  )

  const cellStyle = useMemo(
    () => previewFontFamily ? { fontFamily: `"${previewFontFamily}", monospace` } : undefined,
    [previewFontFamily],
  )

  return (
    <div className={styles.characterPanel} data-testid="character-panel">
      <header className={styles.colorPanelHeader}>
        <span className={styles.colorPanelTitle}>Characters</span>
      </header>
      <input
        type="text"
        className={styles.charPanelFilter}
        placeholder="Filter (char, name, U+####)"
        value={query}
        onChange={e => setQuery(e.target.value)}
        data-testid="character-panel-filter"
      />
      <div className={styles.charPanelTabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.paletteSelectorBtn} ${activeTab === tab.id ? styles.paletteSelectorBtnActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`character-panel-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.charPanelBody}>
        {visibleEntries.length === 0 ? (
          <div className={styles.charPanelEmpty} data-testid="character-panel-empty">
            No matches.
          </div>
        ) : (
          <div className={styles.charPanelGrid}>
            {visibleEntries.map(entry => {
              const isSelected = entry.char === currentChar
              return (
                <button
                  key={entry.char}
                  type="button"
                  className={`${styles.charPanelCell}${isSelected ? ` ${styles.charPanelCellSelected}` : ''}`}
                  style={cellStyle}
                  title={entry.name}
                  onClick={() => onSelect(entry.char)}
                  data-testid="character-panel-cell"
                  aria-pressed={isSelected || undefined}
                >
                  {entry.char}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
