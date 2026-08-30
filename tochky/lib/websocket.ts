"use client";

import { STORAGE_KEYS } from '@/lib/constants';

type MessageHandler = (payload: any) => void;

// Grace period to prevent immediate disconnects during rapid remounts (e.g., when changing locale)
const DISCONNECT_GRACE_MS = 200;

export class WSService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private sessionId: string;
  private connectionCount = 0;
  private disconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastRoomId?: string;
  private lastSettings?: any;

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
    
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (this.connectionCount > 0 && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
            console.log('Tab became visible, reconnecting WS...');
            this.connect(this.lastRoomId, this.lastSettings);
          }
        }
      });
    }
  }

  /**
   * Increments the connection reference count. If not already connected,
   * establishes a new WebSocket connection. Also clears any pending disconnect timeouts.
   * This is safe to call multiple times or during React strict mode remounts.
   */
  connect(roomId?: string, settings?: any) {
    if (typeof window === 'undefined') return;

    if (roomId) this.lastRoomId = roomId;
    if (settings) this.lastSettings = settings;

    this.connectionCount++;
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (roomId) {
        this.send('join', { roomId, settings });
      } else if (this.lastRoomId) {
        this.send('join', { roomId: this.lastRoomId, settings: this.lastSettings });
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
      
      // Auto-reconnect if we still want to be connected
      if (this.connectionCount > 0) {
        console.log('Attempting to reconnect in 1s...');
        setTimeout(() => {
          if (this.connectionCount > 0 && !this.ws) {
            this.connect(this.lastRoomId, this.lastSettings);
          }
        }, 1000);
      }
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

  /**
   * Decrements the connection reference count. 
   * The underlying WebSocket is NOT closed immediately if the count reaches 0.
   * Instead, it waits for a grace period (DISCONNECT_GRACE_MS). If `connect()` 
   * is called again during this time (e.g. during a route or locale change), 
   * the disconnection is cancelled.
   */
  disconnect() {
    this.connectionCount = Math.max(0, this.connectionCount - 1);
    
    if (this.connectionCount === 0 && !this.disconnectTimeout) {
      this.disconnectTimeout = setTimeout(() => {
        if (this.connectionCount === 0 && this.ws) {
          this.ws.onclose = null;
          this.ws.close();
          this.ws = null;
        }
        this.disconnectTimeout = null;
      }, DISCONNECT_GRACE_MS);
    }
  }

  /**
   * Instantly terminates the WebSocket connection without waiting for the 
   * grace period. Use this when you are explicitly leaving the game 
   * (e.g. user clicks "Leave Room") and want the server to immediately 
   * recognize the disconnection.
   */
  forceDisconnect() {
    this.connectionCount = 0;
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export a singleton instance
export const wsService = new WSService();
