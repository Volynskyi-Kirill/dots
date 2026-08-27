"use client";

import { STORAGE_KEYS } from '@/lib/constants';

type MessageHandler = (payload: any) => void;

export class WSService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private sessionId: string;

  constructor() {
    if (typeof window !== 'undefined') {
      let storedId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
      if (!storedId) {
        storedId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(STORAGE_KEYS.SESSION_ID, storedId);
      }
      this.sessionId = storedId;
    } else {
      this.sessionId = '';
    }
  }

  connect(roomId?: string, settings?: any) {
    if (typeof window === 'undefined') return;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (roomId) {
        this.send('join', { roomId, settings });
      }
      return;
    }

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    
    // Connect directly to the Next.js rewrite /ws
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl || wsUrl === 'undefined') {
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to WS server');
      if (roomId) {
        this.send('join', { roomId, settings });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const callbacks = this.handlers.get(msg.type);
        if (callbacks) {
          callbacks.forEach(cb => cb(msg.payload));
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from WS server');
      this.ws = null;
    };
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: string, handler: MessageHandler) {
    const callbacks = this.handlers.get(type);
    if (callbacks) {
      this.handlers.set(type, callbacks.filter(cb => cb !== handler));
    }
  }

  send(type: string, payload: any) {
    if (type === 'join') {
      payload = { ...payload, sessionId: this.sessionId };
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export a singleton instance
export const wsService = new WSService();
