"use client";
import { Settings, X, Volume1, Volume2, VolumeX } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { ControlSchemeType, CONTROL_SCHEME } from '@/lib/constants';

function VolumeIcon({ enabled, volume }: { enabled: boolean; volume: number }) {
  if (!enabled || volume === 0) return <VolumeX className="w-5 h-5 text-muted-foreground" />;
  if (volume < 0.5) return <Volume1 className="w-5 h-5 text-primary" />;
  return <Volume2 className="w-5 h-5 text-primary" />;
}

import { useSettingsStore } from '@/store/useSettingsStore';

export function SettingsModal({
  onClose,
  t
}: {
  onClose: () => void;
  t: (key: string) => string;
}) {
  const { controlScheme, setControlScheme, soundEnabled, setSoundEnabled, soundVolume, setSoundVolume } = useSettingsStore();

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border shadow-xl rounded-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> {t("settings")}</h2>
        
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3">{t("controlsMobile")}</h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-secondary/50">
              <input type="radio" name="controlScheme" value={CONTROL_SCHEME.DIRECT} checked={controlScheme === CONTROL_SCHEME.DIRECT} onChange={(e) => setControlScheme(e.target.value as ControlSchemeType)} className="mt-1" />
              <div>
                <div className="font-medium text-sm">{t("directTouch")}</div>
                <div className="text-xs text-muted-foreground">{t("directTouchDesc")}</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-secondary/50">
              <input type="radio" name="controlScheme" value={CONTROL_SCHEME.DRAG} checked={controlScheme === CONTROL_SCHEME.DRAG} onChange={(e) => setControlScheme(e.target.value as ControlSchemeType)} className="mt-1" />
              <div>
                <div className="font-medium text-sm">{t("dragRelease")}</div>
                <div className="text-xs text-muted-foreground">{t("dragReleaseDesc")}</div>
              </div>
            </label>
          </div>
        </div>

        <div className="mb-2 border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">{t('preferences')}</h3>
          
          {/* Sound toggle + volume slider */}
          <div className="p-3 border rounded-lg mb-4">
            <div
              className="flex items-center justify-between cursor-pointer hover:opacity-80"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              <div className="flex items-center gap-3">
                <VolumeIcon enabled={soundEnabled} volume={soundVolume} />
                <div className="font-medium text-sm">{t('soundEnabled')}</div>
              </div>
              <input type="checkbox" checked={soundEnabled} readOnly className="pointer-events-none" />
            </div>

            {soundEnabled && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                <VolumeX className="w-4 h-4 shrink-0 text-muted-foreground" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <Volume2 className="w-4 h-4 shrink-0 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t('theme')}</span>
              <ThemeToggle />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t('language')}</span>
              <LanguageToggle />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
