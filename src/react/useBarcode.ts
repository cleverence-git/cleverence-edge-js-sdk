import { useState, useEffect, useCallback } from 'react';
import { useEdgeContext } from './EdgeContext';
import type { ScanEvent } from '../types';

export interface UseBarcodeOptions {
  /** Maximum number of scans to keep in history. Default: 50 */
  maxHistory?: number;
  /** Called when a new scan is received */
  onScan?: (event: ScanEvent) => void;
}

export interface UseBarcodeReturn {
  /** Most recent scan event */
  lastScan: ScanEvent | null;
  /** History of scan events (newest first) */
  scanHistory: ScanEvent[];
  /** Clear the scan history */
  clearHistory: () => void;
  /** Trigger a scan programmatically */
  triggerScan: () => Promise<void>;
}

/**
 * Hook for barcode scanning
 *
 * @example
 * ```tsx
 * function Scanner() {
 *   const { lastScan, scanHistory, clearHistory } = useBarcode({
 *     onScan: (scan) => console.log('Scanned:', scan.data),
 *   });
 *
 *   return (
 *     <div>
 *       <h1>Last: {lastScan?.data}</h1>
 *       <button onClick={clearHistory}>Clear</button>
 *       <ul>
 *         {scanHistory.map(scan => (
 *           <li key={scan.id}>{scan.data} ({scan.symbology})</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBarcode(options: UseBarcodeOptions = {}): UseBarcodeReturn {
  const { maxHistory = 50, onScan } = options;
  const { edge } = useEdgeContext();
  const [lastScan, setLastScan] = useState<ScanEvent | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanEvent[]>([]);

  useEffect(() => {
    if (!edge) return;

    const handleScan = (event: ScanEvent) => {
      setLastScan(event);
      setScanHistory((prev) => {
        const newHistory = [event, ...prev];
        return newHistory.slice(0, maxHistory);
      });
      onScan?.(event);
    };

    edge.on('scan', handleScan);
    return () => {
      edge.off('scan', handleScan);
    };
  }, [edge, maxHistory, onScan]);

  const clearHistory = useCallback(() => {
    setLastScan(null);
    setScanHistory([]);
  }, []);

  const triggerScan = useCallback(async () => {
    if (!edge) throw new Error('Not connected');
    await edge.triggerScan();
  }, [edge]);

  return {
    lastScan,
    scanHistory,
    clearHistory,
    triggerScan,
  };
}
