/**
 * Type declarations for @chip-composer/player.
 *
 * The player package is built by Vite (no .d.ts emitted),
 * so we provide declarations here for TypeScript consumption.
 */
declare module '@chip-composer/player' {
  export interface OPLPatch {
    name?: string
    [key: string]: unknown
  }

  export interface OPLOperator {
    [key: string]: unknown
  }

  export interface OPLVoice {
    [key: string]: unknown
  }

  export interface TrackerNote {
    [key: string]: unknown
  }

  export interface TrackerPattern {
    [key: string]: unknown
  }

  export interface ChipPlayerOptions {
    workletUrl?: string
    audioContext?: AudioContext
    volume?: number
  }

  export interface PlaybackState {
    playing: boolean
    currentRow: number
    bpm: number
    totalRows: number
  }

  export class ChipPlayer {
    constructor(options?: ChipPlayerOptions)
    init(): Promise<void>
    destroy(): Promise<void>
    noteOn(track: number, midiNote: number, velocity?: number): void
    noteOff(track: number, midiNote: number): void
    setTrackInstrument(track: number, patchOrId: OPLPatch | number): void
    setInstrumentBank(bank: OPLPatch[]): void
    loadInstrumentBankFromUrl(url: string): Promise<OPLPatch[]>
    loadPattern(pattern: TrackerPattern): void
    loadSong(song: unknown): void
    loadCollection(yaml: string, songIndex?: number): void
    loadSongFile(yaml: string): void
    play(options?: { loop?: boolean }): void
    pause(): void
    stop(): void
    seekToRow(row: number): void
    setBPM(bpm: number): void
    setVolume(volume: number): void
    setGain(gain: number): void
    getState(): PlaybackState
    onRowChange(cb: (row: number) => void): () => void
    onStateChange(cb: (state: PlaybackState) => void): () => void
  }

  export class PatternBuilder {
    constructor(tracks: number, rows: number, bpm?: number, stepsPerBeat?: number)
    setNote(
      row: number,
      track: number,
      midiNote: number,
      opts?: { instrument?: number; velocity?: number; effect?: string }
    ): this
    setNoteOff(row: number, track: number): this
    build(): TrackerPattern
  }

  export const NOT_SET: unique symbol
  export const NOTE_OFF: unique symbol
}
