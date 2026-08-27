import { create } from "zustand"
import { persist } from "zustand/middleware"
import { ControlSchemeType, CONTROL_SCHEME } from "@/lib/constants"

const DEFAULT_VOLUME = 0.5 // half of max

interface SettingsState {
  controlScheme: ControlSchemeType
  soundEnabled: boolean
  soundVolume: number
  setControlScheme: (scheme: ControlSchemeType) => void
  setSoundEnabled: (enabled: boolean) => void
  setSoundVolume: (volume: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      controlScheme: CONTROL_SCHEME.DIRECT,
      soundEnabled: true,
      soundVolume: DEFAULT_VOLUME,
      setControlScheme: (scheme) => set({ controlScheme: scheme }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setSoundVolume: (volume) => set({ soundVolume: volume }),
    }),
    {
      name: "dots-settings",
    }
  )
)
