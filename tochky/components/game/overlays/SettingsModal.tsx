"use client";
import { Settings, X, Volume2, VolumeX } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { ControlSchemeType, CONTROL_SCHEME } from '@/lib/constants';

export function SettingsModal({
  onClose,
  controlScheme,
  setControlScheme,
  soundEnabled,
  setSoundEnabled,
  t
}: {
  onClose: () => void;
  controlScheme: ControlSchemeType;
  setControlScheme: (val: ControlSchemeType) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  t: (key: string) => string;
}) {
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
          
          <div className="flex items-center justify-between p-3 border rounded-lg mb-4 hover:bg-secondary/50 cursor-pointer" onClick={() => setSoundEnabled(!soundEnabled)}>
            <div className="flex items-center gap-3">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
              <div className="font-medium text-sm">{t('soundEnabled')}</div>
            </div>
            <input type="checkbox" checked={soundEnabled} readOnly className="pointer-events-none" />
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
