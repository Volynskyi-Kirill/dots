type MessageHandler = (payload: any) => void;

export class WSService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private sessionId: string;

  constructor() {
    let storedId = localStorage.getItem('dots_session_id');
    if (!storedId) {
      storedId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('dots_session_id', storedId);
    }
    this.sessionId = storedId;
  }

  connect(roomId?: string) {
    if (this.ws) return;
    
    // Динамически определяем URL, чтобы запросы шли на тот же домен (localhost или Ngrok)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const proxyWsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Если VITE_WS_URL задан жестко (и это не дефолтный localhost), используем его, иначе прокси
    let wsUrl = import.meta.env.VITE_WS_URL;
    if (!wsUrl || wsUrl.includes('localhost:8080')) {
      wsUrl = proxyWsUrl;
    }
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to WS server');
      if (roomId) {
        this.send('join', { roomId });
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
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new WSService();
