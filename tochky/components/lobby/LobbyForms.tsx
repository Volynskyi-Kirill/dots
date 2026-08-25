"use client";

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function LobbyForms() {
  const router = useRouter();
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
    <div className="grid gap-6 md:grid-cols-2 mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Join Room</CardTitle>
          <CardDescription>Enter a room ID to join an existing game</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-id">Room ID</Label>
              <Input 
                id="room-id" 
                placeholder="e.g. 8x9q2w" 
                value={roomId} 
                onChange={(e) => setRoomId(e.target.value)} 
              />
            </div>
            <Button type="submit" className="w-full" disabled={!roomId.trim()}>
              Join Game
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Room</CardTitle>
          <CardDescription>Start a new game and invite a friend</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="timer-enabled" 
              className="rounded border-gray-300"
              checked={timerEnabled}
              onChange={(e) => setTimerEnabled(e.target.checked)}
            />
            <Label htmlFor="timer-enabled">Enable Timer</Label>
          </div>
          
          {timerEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initial-time">Initial Time (min)</Label>
                <Input 
                  id="initial-time" 
                  type="number" 
                  min="1" 
                  max="60"
                  value={initialTimeMins} 
                  onChange={(e) => setInitialTimeMins(Number(e.target.value))} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="increment">Increment (sec)</Label>
                <Input 
                  id="increment" 
                  type="number" 
                  min="0" 
                  max="60"
                  value={incrementSecs} 
                  onChange={(e) => setIncrementSecs(Number(e.target.value))} 
                />
              </div>
            </div>
          )}
          <Button onClick={handleCreateRoom} variant="default" className="w-full">
            Create Game
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
