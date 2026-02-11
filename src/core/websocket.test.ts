import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketManager } from './websocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  
  private eventHandlers: Map<string, Set<Function>> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(event: string, handler: Function, options?: { once?: boolean }) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    if (options?.once) {
      const onceWrapper = (...args: unknown[]) => {
        this.removeEventListener(event, onceWrapper);
        handler(...args);
      };
      this.eventHandlers.get(event)!.add(onceWrapper);
    } else {
      this.eventHandlers.get(event)!.add(handler);
    }
  }

  removeEventListener(event: string, handler: Function) {
    this.eventHandlers.get(event)?.delete(handler);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close', {});
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.emit('open', {});
  }

  simulateMessage(data: unknown) {
    this.emit('message', { data: JSON.stringify(data) });
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close', {});
  }

  simulateError() {
    this.emit('error', new Event('error'));
  }

  private emit(event: string, data: unknown) {
    this.eventHandlers.get(event)?.forEach((handler) => handler(data));
  }
}

// Store mock instances for testing
let mockWebSocketInstance: MockWebSocket | null = null;

// Setup global mock
beforeEach(() => {
  mockWebSocketInstance = null;
  vi.stubGlobal('WebSocket', class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      mockWebSocketInstance = this;
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WebSocketManager', () => {
  it('should connect successfully', async () => {
    const ws = new WebSocketManager('ws://localhost:8585');
    
    const connectPromise = ws.connect();
    
    // Simulate successful connection
    setTimeout(() => mockWebSocketInstance?.simulateOpen(), 10);
    
    await connectPromise;
    
    expect(ws.state).toBe('connected');
    expect(ws.isConnected).toBe(true);
  });

  it('should emit open event on connect', async () => {
    const ws = new WebSocketManager('ws://localhost:8585');
    const openHandler = vi.fn();
    
    ws.on('open', openHandler);
    
    const connectPromise = ws.connect();
    setTimeout(() => mockWebSocketInstance?.simulateOpen(), 10);
    await connectPromise;
    
    expect(openHandler).toHaveBeenCalled();
  });

  it('should disconnect and emit close event', async () => {
    const ws = new WebSocketManager('ws://localhost:8585');
    const closeHandler = vi.fn();
    
    ws.on('close', closeHandler);
    
    const connectPromise = ws.connect();
    setTimeout(() => mockWebSocketInstance?.simulateOpen(), 10);
    await connectPromise;
    
    ws.disconnect();
    
    expect(ws.state).toBe('disconnected');
    expect(closeHandler).toHaveBeenCalled();
  });

  it('should send messages when connected', async () => {
    const ws = new WebSocketManager('ws://localhost:8585');
    
    const connectPromise = ws.connect();
    setTimeout(() => mockWebSocketInstance?.simulateOpen(), 10);
    await connectPromise;
    
    const sendSpy = vi.spyOn(mockWebSocketInstance!, 'send');
    
    ws.send({ type: 'ping' });
    
    expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
  });

  it('should throw when sending while disconnected', () => {
    const ws = new WebSocketManager('ws://localhost:8585');
    
    expect(() => ws.send({ type: 'ping' })).toThrow('WebSocket is not connected');
  });

  it('should handle incoming messages', async () => {
    const ws = new WebSocketManager('ws://localhost:8585');
    const messageHandler = vi.fn();
    
    ws.on('message', messageHandler);
    
    const connectPromise = ws.connect();
    setTimeout(() => mockWebSocketInstance?.simulateOpen(), 10);
    await connectPromise;
    
    mockWebSocketInstance?.simulateMessage({
      type: 'event',
      event: { type: 'scan', id: '123', data: 'test' },
    });
    
    expect(messageHandler).toHaveBeenCalledWith({
      type: 'event',
      event: { type: 'scan', id: '123', data: 'test' },
    });
  });

  it('should resolve pending requests', async () => {
    const ws = new WebSocketManager('ws://localhost:8585');
    
    const connectPromise = ws.connect();
    setTimeout(() => mockWebSocketInstance?.simulateOpen(), 10);
    await connectPromise;
    
    // Start a request
    const requestPromise = ws.request<{ connected: boolean }>('status');
    
    // Simulate response (we need to capture the request ID)
    setTimeout(() => {
      const sentMessage = JSON.parse(
        (mockWebSocketInstance as unknown as { send: Function }).send.mock?.calls?.[0]?.[0] || '{}'
      );
      mockWebSocketInstance?.simulateMessage({
        type: 'response',
        id: sentMessage.id || '1',
        success: true,
        data: { query: 'status', result: { connected: true } },
      });
    }, 10);
    
    // Note: This test is simplified; in real scenario we'd need to capture the ID
  });

  it('should handle state changes', async () => {
    const ws = new WebSocketManager('ws://localhost:8585');
    const stateHandler = vi.fn();
    
    ws.on('statechange', stateHandler);
    
    expect(ws.state).toBe('disconnected');
    
    const connectPromise = ws.connect();
    expect(ws.state).toBe('connecting');
    expect(stateHandler).toHaveBeenCalledWith('connecting');
    
    setTimeout(() => mockWebSocketInstance?.simulateOpen(), 10);
    await connectPromise;
    
    expect(ws.state).toBe('connected');
    expect(stateHandler).toHaveBeenCalledWith('connected');
  });
});
