/**
 * Barcode scanner capabilities
 */
export interface BarcodeCapabilities {
  /** How the scanner is connected: built-in hardware or external */
  type: 'builtIn' | 'bluetooth' | 'usb';
  /** Scanner vendor (may differ from device vendor for external scanners) */
  vendor?: string;
  /** Scanner model */
  model?: string;
  /** Can programmatically trigger a scan */
  canToggle: boolean;
  /** Scanner reports symbology type with each scan */
  canReportSymbology: boolean;
  /** Can enable/disable specific symbology types */
  canToggleSymbologies: boolean;
  /** List of supported barcode symbologies */
  supportedSymbologies: string[];
}

/**
 * RFID reader capabilities
 */
export interface RfidCapabilities {
  /** How the reader is connected: built-in or external sled/dongle */
  type: 'builtIn' | 'sled' | 'bluetooth' | 'usb';
  /** RFID reader vendor (may differ from device vendor) */
  vendor?: string;
  /** RFID reader model (e.g., "RFD40") */
  model?: string;
  /** Can programmatically start/stop inventory */
  canToggle: boolean;
  /** Can adjust transmit power */
  canConfigurePower: boolean;
  /** Can configure session (S0-S3) */
  canConfigureSession: boolean;
  /** Transmit power range in dBm */
  powerRange?: {
    min: number;
    max: number;
  };
  /** Supported memory banks for read/write operations */
  supportedMemoryBanks: string[];
}

/**
 * NFC capabilities
 */
export interface NfcCapabilities {
  /** Can programmatically toggle NFC */
  canToggle: boolean;
}

/**
 * Device capabilities reported by the Edge service on connection.
 * Capabilities are dynamic - they update when Bluetooth peripherals connect/disconnect.
 */
export interface DeviceCapabilities {
  /** Edge service version */
  edgeVersion: string;
  /** Base device vendor: "zebra", "honeywell", "urovo", "datalogic", etc. */
  vendor: string;
  /** Base device model name */
  deviceModel: string;
  /** Barcode scanner capabilities (null if no scanner available) */
  barcode: BarcodeCapabilities | null;
  /** RFID reader capabilities (null if no RFID available) */
  rfid: RfidCapabilities | null;
  /** NFC capabilities (null if no NFC available) */
  nfc: NfcCapabilities | null;
  /** Firmware version if available */
  firmwareVersion?: string;
  /** Serial number if available */
  serialNumber?: string;
}

/**
 * Edge service status information
 */
export interface EdgeStatus {
  /** Whether the service is connected to hardware */
  connected: boolean;
  /** Unique device identifier */
  deviceId: string;
  /** Edge service version */
  version: string;
  /** Service uptime in seconds */
  uptime: number;
  /** Current battery level (0-100) if available */
  batteryLevel?: number;
  /** Whether device is charging */
  isCharging?: boolean;
}

/**
 * Edge service configuration
 */
export interface EdgeConfig {
  /** Enabled barcode symbologies */
  enabledSymbologies: string[];
  /** RFID transmit power in dBm */
  rfidPower?: number;
  /** Whether to deduplicate rapid scans of same barcode */
  deduplicateScans: boolean;
  /** Deduplication window in milliseconds */
  deduplicateWindowMs: number;
  /** Whether sound feedback is enabled */
  soundEnabled: boolean;
  /** Whether vibration feedback is enabled */
  vibrationEnabled: boolean;
}

/**
 * RFID inventory options for startRfidInventory()
 */
export interface RfidInventoryOptions {
  /** Transmit power in dBm (uses device default if not specified) */
  power?: number;
  /** Which antenna ports to use (all if not specified) */
  antennas?: number[];
  /** Session (0-3, affects tag persistence behavior) */
  session?: 0 | 1 | 2 | 3;
  /** Target flag (A or B) */
  target?: 'A' | 'B';
}

/**
 * RFID tag information from inventory
 */
export interface RfidTag {
  /** EPC tag identifier */
  epc: string;
  /** Last seen RSSI */
  rssi: number;
  /** Antenna that last read the tag */
  antenna: number;
  /** Total read count during inventory */
  readCount: number;
  /** When the tag was first seen */
  firstSeen: Date;
  /** When the tag was last seen */
  lastSeen: Date;
}
