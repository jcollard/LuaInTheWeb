export interface CrtSettings {
  enabled: boolean
  intensity: number
}

export interface CrtContextValue {
  enabled: boolean
  intensity: number
  toggleCrt: () => void
  setIntensity: (intensity: number) => void
}
