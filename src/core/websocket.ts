import { EventEmitter } from './events';
import type { ClientMessage, ServerMessage, ConnectionState } from '../types';

interface WSManagerEvents {
  message: ServerMessage;
  open: void;
  close: void;
  error: Error;
  statechange: ConnectionState;
}

interface WSManagerOptions {
  reconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  pingInterval?: number;
}

const DEFAULT_WS_OPTIONS: Required<WSManagerOptions> = {
  reconnect: true,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  pingInterval: 30000,
};

/**
 * WebSocket connection manager with auto-reconnect and request/response correlation
 */
export class WebSocketManager extends EventEmitter<WSManagerEvents> {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<WSManagerOptions>;
  private _state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pendingRequests: Map<string, {
    resolve: (data: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  private intentionalClose = false;

  constructor(url: string, options: WSManagerOptions = {}) {
    super();
    this.url = url;
    this.options = { ...DEFAULT_WS_OPTIONS, ...options };
  }

  /**
   * Current connection state
   */
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Whether currently connected
   */
  get isConnected(): boolean {
    return this._state === 'connected';
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._state === 'connected' || this._state === 'connecting') {
        resolve();
        return;
      }

      this.intentionalClose = false;
      this.setState('connecting');

      try {
        this.ws = new WebSocket(this.url);

        const onOpen = () => {
          this.ws?.removeEventListener('error', onError);
          this.reconnectAttempts = 0;
          this.setState('connected');
          this.startPing();
          this.emit('open', undefined);
          resolve();
        };

        const onError = (_event: Event) => {
          this.ws?.removeEventListener('open', onOpen);
          const error = new Error('WebSocket connection failed');
          reject(error);
        };

        this.ws.addEventListener('open', onOpen, { once: true });
        this.ws.addEventListener('error', onError, { once: true });

        this.ws.addEventListener('message', this.handleMessage.bind(this));
        this.ws.addEventListener('close', this.handleClose.bind(this));
        this.ws.addEventListener('error', this.handleError.bind(this));
      } catch (err) {
        this.setState('disconnected');
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.intentionalClose = true;
    this.cleanup();
    this.setState('disconnected');
    this.emit('close', undefined);
  }

  /**
   * Send a message to the server
   */
  send(message: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send a query and wait for response (request/response pattern)
   */
  request<T>(query: 'status' | 'capabilities' | 'config' | 'rfid_tags', timeoutMs = 10000): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = this.generateId();
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${query}`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: resolve as (data: unknown) => void,
        reject,
        timeout,
      });

      try {
        this.send({ type: 'query', id, query });
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  /**
   * Send a command (fire and forget, but throws if not connected)
   */
  command(message: Exclude<ClientMessage, { type: 'query' } | { type: 'ping' }>): void {
    this.send(message);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as ServerMessage;

      // Handle response to pending request
      if (message.type === 'response') {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.id);
          
          if (message.success) {
            pending.resolve(message.data.result);
          } else {
            pending.reject(new Error(message.error));
          }
          return;
        }
      }

      // Handle pong
      if (message.type === 'pong') {
        return; // Keepalive response, no action needed
      }

      // Emit for other handlers
      this.emit('message', message);
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  }

  private handleClose(): void {
    this.cleanup();
    
    if (this.intentionalClose) {
      this.setState('disconnected');
      return;
    }

    this.emit('close', undefined);

    if (this.options.reconnect) {
      this.scheduleReconnect();
    } else {
      this.setState('disconnected');
    }
  }

  private handleError(_event: Event): void {
    const error = new Error('WebSocket error');
    this.emit('error', error);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.setState('reconnecting');

    // Exponential backoff
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.options.maxReconnectDelay
    );

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      
      try {
        await this.connect();
      } catch {
        // connect() will trigger handleClose which schedules another reconnect
      }
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.send({ type: 'ping' });
        } catch {
          // Ignore ping errors
        }
      }
    }, this.options.pingInterval);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private cleanup(): void {
    this.stopPing();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Reject all pending requests
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('WebSocket disconnected'));
    });
    this.pendingRequests.clear();

    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      // Only close if not already closed/closing
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
  }

  private setState(state: ConnectionState): void {
    if (this._state !== state) {
      this._state = state;
      this.emit('statechange', state);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
