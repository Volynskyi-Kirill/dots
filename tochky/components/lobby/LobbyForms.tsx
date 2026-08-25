"use client";

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Sparkles, Clock, Users, ArrowRight, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function LobbyForms() {
  const router = useRouter();
  const t = useTranslations('Lobby');
  const [roomId, setRoomId] = useState('');
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [initialTimeMins, setInitialTimeMins] = useState(5);
  const [incrementSecs, setIncrementSecs] = useState(3);

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8);
    const searchParams = new URLSearchParams();
    if (timerEnabled) {
      searchParams.set('timer', '1');
      searchParams.set('time', (initialTimeMins * 60 * 1000).toString());
      searchParams.set('inc', (incrementSecs * 1000).toString());
    }
    router.push(`/room/${newRoomId}?${searchParams.toString()}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto mt-6">
      {/* Create Room Card (Primary CTA) */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-md opacity-30 group-hover:opacity-60 transition duration-500" />
        <Card className="relative border-border/80 bg-card/95 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Sparkles className="size-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">{t('createRoom')}</CardTitle>
                <CardDescription className="text-sm mt-0.5">{t('createDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Custom Timer Toggle Card */}
            <div 
              onClick={() => setTimerEnabled(!timerEnabled)}
              className={cn(
                "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none",
                timerEnabled 
                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 shadow-xs" 
                  : "bg-muted/40 border-border/60 hover:bg-muted/70 hover:border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  timerEnabled ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  <Clock className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-medium leading-none text-foreground">{t('enableTimer')}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {timerEnabled ? `${initialTimeMins} min + ${incrementSecs}s / turn` : "Play without time pressure"}
                  </div>
                </div>
              </div>

              {/* Styled iOS/Modern Switch */}
              <div 
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                  timerEnabled ? "bg-blue-600 dark:bg-blue-500" : "bg-input"
                )}
                role="switch"
                aria-checked={timerEnabled}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                    timerEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </div>
            </div>
            
            {timerEnabled && (
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/50 animate-in fade-in-50 slide-in-from-top-2 duration-200">
                <div className="space-y-1.5">
                  <Label htmlFor="initial-time" className="text-xs font-medium text-muted-foreground">{t('initialTime')}</Label>
                  <Input 
                    id="initial-time" 
                    type="number" 
                    min="1" 
                    max="60"
                    value={initialTimeMins} 
                    onChange={(e) => setInitialTimeMins(Number(e.target.value))} 
                    className="h-9 bg-background/80"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="increment" className="text-xs font-medium text-muted-foreground">{t('increment')}</Label>
                  <Input 
                    id="increment" 
                    type="number" 
                    min="0" 
                    max="60"
                    value={incrementSecs} 
                    onChange={(e) => setIncrementSecs(Number(e.target.value))} 
                    className="h-9 bg-background/80"
                  />
                </div>
              </div>
            )}

            <Button 
              onClick={handleCreateRoom} 
              className="w-full h-11 text-base font-semibold shadow-lg shadow-blue-500/20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all transform active:scale-[0.99] cursor-pointer"
            >
              <PlusCircle className="size-5 mr-1.5" />
              {t('createGameButton')}
              <ArrowRight className="size-4 ml-auto opacity-70" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Divider */}
      <div className="relative flex py-1 items-center">
        <div className="grow border-t border-border/60" />
        <span className="shrink mx-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">or join with code</span>
        <div className="grow border-t border-border/60" />
      </div>

      {/* Join Room Card */}
      <Card className="border-border/70 bg-card/60 backdrop-blur-xs shadow-md rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
              <Users className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{t('joinRoom')}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{t('joinDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-id" className="text-xs font-medium text-muted-foreground">{t('roomIdLabel')}</Label>
              <div className="flex gap-2">
                <Input 
                  id="room-id" 
                  placeholder={t('roomIdPlaceholder')} 
                  value={roomId} 
                  onChange={(e) => setRoomId(e.target.value)} 
                  className="h-10 bg-background/80 uppercase tracking-wider font-mono text-sm"
                />
                <Button 
                  type="submit" 
                  disabled={!roomId.trim()}
                  variant="secondary"
                  className="h-10 px-5 shrink-0 font-medium cursor-pointer"
                >
                  {t('joinGameButton')}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
