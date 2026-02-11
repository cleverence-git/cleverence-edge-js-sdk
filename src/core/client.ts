import { EventEmitter } from './events';
import { WebSocketManager } from './websocket';
import type {
  ScanEvent,
  RfidEvent,
  DeviceCapabilities,
  EdgeStatus,
  EdgeConfig,
  RfidInventoryOptions,
  RfidTag,
  ConnectionState,
  EdgeOptions,
  ServerMessage,
} from '../types';
import { DEFAULT_OPTIONS } from '../types';

/**
 * Events emitted by CleverenceEdge
 */
interface CleverenceEdgeEvents {
  scan: ScanEvent;
  rfid: RfidEvent;
  connect: void;
  disconnect: void;
  reconnecting: void;
  error: Error;
  capabilities: DeviceCapabilities;
}

/**
 * CleverenceEdge SDK - Connect to barcode scanners and RFID readers
 *
 * @example
 * ```typescript
 * const edge = new CleverenceEdge();
 *
 * edge.on('scan', (event) => {
 *   console.log(event.data);       // "012345678905"
 *   console.log(event.symbology);  // "ean13"
 * });
 *
 * edge.on('rfid', (event) => {
 *   console.log(event.epc);        // "3034257BF400B7800004CB2F"
 *   console.log(event.rssi);       // -45
 * });
 *
 * await edge.connect();
 * ```
 */
export class CleverenceEdge extends EventEmitter<CleverenceEdgeEvents> {
  private ws: WebSocketManager;
  private options: Required<EdgeOptions>;
  private _capabilities: DeviceCapabilities | null = null;

  constructor(options: EdgeOptions = {}) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.ws = new WebSocketManager(this.options.url, {
      reconnect: true,
      reconnectDelay: this.options.reconnectDelay,
      maxReconnectDelay: this.options.maxReconnectDelay,
      pingInterval: this.options.pingInterval,
    });

    this.setupWebSocketHandlers();

    if (this.options.autoConnect) {
      // Auto-connect on next tick to allow event handlers to be set up
      setTimeout(() => this.connect().catch(() => {}), 0);
    }
  }

  /**
   * Current connection state
   */
  get connectionState(): ConnectionState {
    return this.ws.state;
  }

  /**
   * Whether currently connected to the Edge service
   */
  get isConnected(): boolean {
    return this.ws.isConnected;
  }

  /**
   * Cached device capabilities (available after connect)
   */
  get capabilities(): DeviceCapabilities | null {
    return this._capabilities;
  }

  /**
   * Connect to the Edge service
   */
  async connect(): Promise<void> {
    await this.ws.connect();
  }

  /**
   * Disconnect from the Edge service
   */
  disconnect(): void {
    this.ws.disconnect();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Commands
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Trigger a barcode scan programmatically
   */
  async triggerScan(): Promise<void> {
    this.ensureConnected();
    this.ws.command({ type: 'command', command: 'trigger_scan' });
  }

  /**
   * Set enabled barcode symbologies
   */
  async setSymbologies(symbologies: string[]): Promise<void> {
    this.ensureConnected();
    this.ws.command({ type: 'command', command: 'set_symbologies', symbologies });
  }

  /**
   * Start RFID inventory (continuous reading)
   */
  async startRfidInventory(options?: RfidInventoryOptions): Promise<void> {
    this.ensureConnected();
    this.ws.command({ type: 'command', command: 'start_rfid_inventory', options });
  }

  /**
   * Stop RFID inventory
   */
  async stopRfidInventory(): Promise<void> {
    this.ensureConnected();
    this.ws.command({ type: 'command', command: 'stop_rfid_inventory' });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get current Edge service status
   */
  async getStatus(): Promise<EdgeStatus> {
    this.ensureConnected();
    return this.ws.request<EdgeStatus>('status');
  }

  /**
   * Get device capabilities
   */
  async getCapabilities(): Promise<DeviceCapabilities> {
    this.ensureConnected();
    return this.ws.request<DeviceCapabilities>('capabilities');
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<EdgeConfig> {
    this.ensureConnected();
    return this.ws.request<EdgeConfig>('config');
  }

  /**
   * Get RFID tags from current/last inventory
   */
  async getRfidTags(): Promise<RfidTag[]> {
    this.ensureConnected();
    return this.ws.request<RfidTag[]>('rfid_tags');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Static factory
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new CleverenceEdge instance
   */
  static create(options?: EdgeOptions): CleverenceEdge {
    return new CleverenceEdge(options);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private methods
  // ─────────────────────────────────────────────────────────────────────────────

  private setupWebSocketHandlers(): void {
    this.ws.on('open', () => {
      this.emit('connect', undefined);
      // Fetch capabilities on connect
      this.getCapabilities()
        .then((caps) => {
          this._capabilities = caps;
          this.emit('capabilities', caps);
        })
        .catch(() => {});
    });

    this.ws.on('close', () => {
      this.emit('disconnect', undefined);
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
    });

    this.ws.on('statechange', (state) => {
      if (state === 'reconnecting') {
        this.emit('reconnecting', undefined);
      }
    });

    this.ws.on('message', (message) => {
      this.handleServerMessage(message);
    });
  }

  private handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'event':
        this.handleEvent(message.event);
        break;
      case 'capabilities':
        this._capabilities = message.data;
        this.emit('capabilities', message.data);
        break;
      case 'error':
        this.emit('error', new Error(message.message));
        break;
    }
  }

  private handleEvent(event: ScanEvent | RfidEvent): void {
    // Parse timestamp if it's a string
    const parsedEvent = {
      ...event,
      timestamp: typeof event.timestamp === 'string' 
        ? new Date(event.timestamp) 
        : event.timestamp,
    };

    if (event.type === 'scan') {
      this.emit('scan', parsedEvent as ScanEvent);
    } else if (event.type === 'rfid') {
      this.emit('rfid', parsedEvent as RfidEvent);
    }
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('Not connected to Edge service. Call connect() first.');
    }
  }
}
