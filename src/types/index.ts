// Event types
export type { ScanEvent, RfidEvent, EdgeEvent } from './events';

// Capability and status types
export type {
  DeviceCapabilities,
  EdgeStatus,
  EdgeConfig,
  RfidInventoryOptions,
  RfidTag,
} from './capabilities';

// Message types (WebSocket protocol)
export type {
  ClientMessage,
  ServerMessage,
  ResponseData,
  ConnectionState,
  EdgeOptions,
} from './messages';

export { DEFAULT_OPTIONS } from './messages';
