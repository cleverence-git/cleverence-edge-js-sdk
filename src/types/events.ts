/**
 * Barcode scan event - simplified API surface for easy consumption
 */
export interface ScanEvent {
  /** Event type discriminator */
  type: 'scan';
  /** Unique event identifier */
  id: string;
  /** When the scan occurred */
  timestamp: Date;

  // Primary fields (flat for easy access)
  /** Decoded barcode data string */
  data: string;
  /** Human-readable symbology name: "ean13", "qrcode", "code128", etc. */
  symbology: string;
  /** Scanner source: "integrated-laser", "camera", "bluetooth-ring" */
  source: string;
  /** Device vendor: "zebra", "honeywell", "urovo", "datalogic" */
  vendor: string;

  /** Extended raw data (optional, for advanced use cases) */
  raw?: {
    /** Raw barcode bytes as hex string */
    bytesHex: string;
    /** Vendor-specific symbology identifier */
    symbologyId: string;
    /** AIM identifier for the symbology */
    aimId: string;
    /** Signal strength if available */
    signalStrength: number | null;
    /** How long the scan took in milliseconds */
    scanDurationMs: number;
  };
}

/**
 * RFID read event - simplified API surface for easy consumption
 */
export interface RfidEvent {
  /** Event type discriminator */
  type: 'rfid';
  /** Unique event identifier */
  id: string;
  /** When the read occurred */
  timestamp: Date;

  // Primary fields (flat for easy access)
  /** EPC (Electronic Product Code) tag identifier */
  epc: string;
  /** Received Signal Strength Indicator in dBm */
  rssi: number;
  /** Antenna port number that read the tag */
  antenna: number;

  // Extended data (optional)
  /** Tag Identifier (TID) memory bank data */
  tid?: string | null;
  /** User memory bank data */
  userData?: string | null;
  /** RF phase angle */
  phase?: number;
  /** RF channel frequency */
  channel?: number;
  /** Number of times this tag was read in current inventory */
  readCount?: number;
  /** Protocol Control (PC) bits */
  pc?: string;
  /** CRC checksum */
  crc?: string;
  /** Inventory session identifier */
  inventorySession?: string;
  /** Transmit power used for this read in dBm */
  transmitPowerDbm?: number;
}

/**
 * Union type for all events
 */
export type EdgeEvent = ScanEvent | RfidEvent;
