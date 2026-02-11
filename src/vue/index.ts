// Composables
export { useEdge, type UseEdgeOptions, type UseEdgeReturn } from './useEdge';
export { useBarcode, type UseBarcodeOptions, type UseBarcodeReturn } from './useBarcode';
export { useRfid, type UseRfidOptions, type UseRfidReturn } from './useRfid';

// Re-export types for convenience
export type {
  ScanEvent,
  RfidEvent,
  DeviceCapabilities,
  EdgeStatus,
  EdgeConfig,
  RfidInventoryOptions,
  RfidTag,
  ConnectionState,
  EdgeOptions,
} from '../types';
