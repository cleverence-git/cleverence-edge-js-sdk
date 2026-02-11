import type { ScanEvent, RfidEvent } from './events';
import type { DeviceCapabilities, EdgeStatus, EdgeConfig, RfidInventoryOptions, RfidTag } from './capabilities';

/**
 * Messages sent from SDK (client) to Edge service (server)
 */
export type ClientMessage =
  | { type: 'command'; command: 'trigger_scan' }
  | { type: 'command'; command: 'set_symbologies'; symbologies: string[] }
  | { type: 'command'; command: 'start_rfid_inventory'; options?: RfidInventoryOptions }
  | { type: 'command'; command: 'stop_rfid_inventory' }
  | { type: 'query'; id: string; query: 'status' }
  | { type: 'query'; id: string; query: 'capabilities' }
  | { type: 'query'; id: string; query: 'config' }
  | { type: 'query'; id: string; query: 'rfid_tags' }
  | { type: 'ping' };

/**
 * Messages received from Edge service (server) to SDK (client)
 */
export type ServerMessage =
  | { type: 'event'; event: ScanEvent | RfidEvent }
  | { type: 'capabilities'; data: DeviceCapabilities }
  | { type: 'response'; id: string; success: true; data: ResponseData }
  | { type: 'response'; id: string; success: false; error: string }
  | { type: 'error'; message: string; code?: string }
  | { type: 'pong' };

/**
 * Response data types based on query type
 */
export type ResponseData =
  | { query: 'status'; result: EdgeStatus }
  | { query: 'capabilities'; result: DeviceCapabilities }
  | { query: 'config'; result: EdgeConfig }
  | { query: 'rfid_tags'; result: RfidTag[] };

/**
 * Connection state for the WebSocket
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * Options for creating a CleverenceEdge instance
 */
export interface EdgeOptions {
  /** WebSocket URL. Default: 'ws://localhost:8585' */
  url?: string;
  /** Auto-connect on instantiation. Default: true */
  autoConnect?: boolean;
  /** Initial reconnect delay in ms. Default: 1000 */
  reconnectDelay?: number;
  /** Maximum reconnect delay in ms. Default: 30000 */
  maxReconnectDelay?: number;
  /** Ping interval for keepalive in ms. Default: 30000 */
  pingInterval?: number;
}

/**
 * Default options
 */
export const DEFAULT_OPTIONS: Required<EdgeOptions> = {
  url: 'ws://localhost:8585',
  autoConnect: true,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  pingInterval: 30000,
};
