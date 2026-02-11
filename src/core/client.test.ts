import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CleverenceEdge } from './client';

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
    // Auto-connect after a tick
    setTimeout(() => this.simulateOpen(), 0);
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
    // Parse and handle queries
    const msg = JSON.parse(data);
    if (msg.type === 'query') {
      setTimeout(() => {
        this.emit('message', {
          data: JSON.stringify({
            type: 'response',
            id: msg.id,
            success: true,
            data: {
              query: msg.query,
              result: getMockResult(msg.query),
            },
          }),
        });
      }, 5);
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close', {});
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.emit('open', {});
  }

  simulateMessage(data: unknown) {
    this.emit('message', { data: JSON.stringify(data) });
  }

  private emit(event: string, data: unknown) {
    this.eventHandlers.get(event)?.forEach((handler) => handler(data));
  }
}

function getMockResult(query: string): unknown {
  switch (query) {
    case 'capabilities':
      return {
        vendor: 'zebra',
        deviceModel: 'TC52',
        hasBarcode: true,
        hasRfid: false,
        supportedSymbologies: ['ean13', 'qrcode'],
      };
    case 'status':
      return {
        connected: true,
        deviceId: 'test-device',
        version: '1.0.0',
        uptime: 3600,
      };
    case 'config':
      return {
        enabledSymbologies: ['ean13'],
        deduplicateScans: true,
        deduplicateWindowMs: 500,
        soundEnabled: true,
        vibrationEnabled: true,
      };
    default:
      return {};
  }
}

let mockInstance: MockWebSocket | null = null;

beforeEach(() => {
  mockInstance = null;
  vi.stubGlobal('WebSocket', class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      mockInstance = this;
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CleverenceEdge', () => {
  it('should create instance with default options', () => {
    const edge = new CleverenceEdge({ autoConnect: false });
    expect(edge).toBeInstanceOf(CleverenceEdge);
    expect(edge.isConnected).toBe(false);
  });

  it('should auto-connect by default', async () => {
    const edge = new CleverenceEdge();
    
    // Wait for auto-connect
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    expect(edge.isConnected).toBe(true);
    edge.disconnect();
  });

  it('should emit connect event', async () => {
    const connectHandler = vi.fn();
    const edge = new CleverenceEdge({ autoConnect: false });
    
    edge.on('connect', connectHandler);
    
    await edge.connect();
    
    expect(connectHandler).toHaveBeenCalled();
    edge.disconnect();
  });

  it('should emit disconnect event', async () => {
    const disconnectHandler = vi.fn();
    const edge = new CleverenceEdge({ autoConnect: false });
    
    edge.on('disconnect', disconnectHandler);
    
    await edge.connect();
    edge.disconnect();
    
    expect(disconnectHandler).toHaveBeenCalled();
  });

  it('should emit scan events', async () => {
    const scanHandler = vi.fn();
    const edge = new CleverenceEdge({ autoConnect: false });
    
    edge.on('scan', scanHandler);
    
    await edge.connect();
    
    // Simulate scan event
    mockInstance?.simulateMessage({
      type: 'event',
      event: {
        type: 'scan',
        id: 'scan-123',
        timestamp: '2024-01-15T10:30:00Z',
        data: '012345678905',
        symbology: 'ean13',
        source: 'integrated-laser',
        vendor: 'zebra',
      },
    });
    
    expect(scanHandler).toHaveBeenCalled();
    expect(scanHandler.mock.calls[0][0]).toMatchObject({
      type: 'scan',
      data: '012345678905',
      symbology: 'ean13',
    });
    
    edge.disconnect();
  });

  it('should emit rfid events', async () => {
    const rfidHandler = vi.fn();
    const edge = new CleverenceEdge({ autoConnect: false });
    
    edge.on('rfid', rfidHandler);
    
    await edge.connect();
    
    // Simulate RFID event
    mockInstance?.simulateMessage({
      type: 'event',
      event: {
        type: 'rfid',
        id: 'rfid-123',
        timestamp: '2024-01-15T10:30:00Z',
        epc: '3034257BF400B7800004CB2F',
        rssi: -45,
        antenna: 1,
      },
    });
    
    expect(rfidHandler).toHaveBeenCalled();
    expect(rfidHandler.mock.calls[0][0]).toMatchObject({
      type: 'rfid',
      epc: '3034257BF400B7800004CB2F',
      rssi: -45,
    });
    
    edge.disconnect();
  });

  it('should fetch capabilities', async () => {
    const edge = new CleverenceEdge({ autoConnect: false });
    
    await edge.connect();
    
    const caps = await edge.getCapabilities();
    
    expect(caps).toMatchObject({
      vendor: 'zebra',
      deviceModel: 'TC52',
      hasBarcode: true,
    });
    
    edge.disconnect();
  });

  it('should fetch status', async () => {
    const edge = new CleverenceEdge({ autoConnect: false });
    
    await edge.connect();
    
    const status = await edge.getStatus();
    
    expect(status).toMatchObject({
      connected: true,
      deviceId: 'test-device',
    });
    
    edge.disconnect();
  });

  it('should throw when calling methods while disconnected', async () => {
    const edge = new CleverenceEdge({ autoConnect: false });
    
    await expect(edge.triggerScan()).rejects.toThrow('Not connected');
    await expect(edge.getStatus()).rejects.toThrow('Not connected');
  });

  it('should use static create factory', () => {
    const edge = CleverenceEdge.create({ autoConnect: false });
    expect(edge).toBeInstanceOf(CleverenceEdge);
  });
});
