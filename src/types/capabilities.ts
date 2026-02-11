/**
 * Device capabilities reported by the Edge service on connection
 */
export interface DeviceCapabilities {
  /** Device vendor: "zebra", "honeywell", "urovo", "datalogic", etc. */
  vendor: string;
  /** Device model name */
  deviceModel: string;
  /** Whether device has barcode scanning capability */
  hasBarcode: boolean;
  /** Whether device has RFID reading capability */
  hasRfid: boolean;
  /** List of supported barcode symbologies */
  supportedSymbologies: string[];
  /** RFID transmit power range in dBm (if RFID capable) */
  rfidPowerRange?: {
    min: number;
    max: number;
  };
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
