"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type SoundEvent = 
  | 'move_self' 
  | 'move_opponent' 
  | 'capture' 
  | 'win' 
  | 'lose' 
  | 'draw' 
  | 'undo_req' 
  | 'undo_acc' 
  | 'timer_tick';

interface SoundSettings {
  masterEnabled: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

interface SoundContextType {
  settings: SoundSettings;
  updateSettings: (newSettings: Partial<SoundSettings>) => void;
  playSound: (event: SoundEvent) => void;
  playMusic: () => void;
  stopMusic: () => void;
}

const defaultSettings: SoundSettings = {
  masterEnabled: true,
  musicEnabled: true,
  sfxEnabled: true,
};

const SoundContext = createContext<SoundContextType | null>(null);

export const useSound = () => {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return ctx;
};

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SoundSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  
  // Audio elements for SFX
  const sfxRefs = useRef<Record<SoundEvent, HTMLAudioElement | null>>({
    move_self: null,
    move_opponent: null,
    capture: null,
    win: null,
    lose: null,
    draw: null,
    undo_req: null,
    undo_acc: null,
    timer_tick: null,
  });

  // Load settings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dots_sound_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to parse sound settings', e);
    }
    setIsLoaded(true);
  }, []);

  // Initialize audio elements (only in browser)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    bgmRef.current = new Audio('/sounds/bgm.wav');
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.3;

    (Object.keys(sfxRefs.current) as SoundEvent[]).forEach((event) => {
      sfxRefs.current[event] = new Audio(`/sounds/${event}.wav`);
    });

    // We need user interaction to start BGM if it was playing
    const handleInteraction = () => {
      if (settings.masterEnabled && settings.musicEnabled) {
        playMusic();
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      if (bgmRef.current) {
        bgmRef.current.pause();
      }
    };
  }, []); // Only run once to create audio elements

  // Effect to handle bgm toggle when settings change
  useEffect(() => {
    if (!isLoaded || !bgmRef.current) return;
    
    if (settings.masterEnabled && settings.musicEnabled) {
      playMusic();
    } else {
      stopMusic();
    }
    
    // Save settings
    localStorage.setItem('dots_sound_settings', JSON.stringify(settings));
  }, [settings, isLoaded]);

  const updateSettings = (newSettings: Partial<SoundSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const playSound = (event: SoundEvent) => {
    if (!settings.masterEnabled || !settings.sfxEnabled) return;
    const audio = sfxRefs.current[event];
    if (audio) {
      audio.currentTime = 0; // Rewind to start
      audio.play().catch(e => console.warn('Audio play failed:', e));
    }
  };

  const playMusic = () => {
    if (!settings.masterEnabled || !settings.musicEnabled || !bgmRef.current) return;
    bgmRef.current.play().catch(e => console.warn('BGM play failed, waiting for interaction:', e));
  };

  const stopMusic = () => {
    if (bgmRef.current) {
      bgmRef.current.pause();
    }
  };

  return (
    <SoundContext.Provider value={{ settings, updateSettings, playSound, playMusic, stopMusic }}>
      {children}
    </SoundContext.Provider>
  );
}
