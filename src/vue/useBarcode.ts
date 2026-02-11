import { ref, watch, onUnmounted, type Ref, type ShallowRef } from 'vue';
import type { CleverenceEdge } from '../core/client';
import type { ScanEvent } from '../types';

export interface UseBarcodeOptions {
  /** The edge instance to use (from useEdge) */
  edge: ShallowRef<CleverenceEdge | null> | Ref<CleverenceEdge | null>;
  /** Maximum number of scans to keep in history. Default: 50 */
  maxHistory?: number;
  /** Called when a new scan is received */
  onScan?: (event: ScanEvent) => void;
}

export interface UseBarcodeReturn {
  /** Most recent scan event */
  lastScan: Ref<ScanEvent | null>;
  /** History of scan events (newest first) */
  scanHistory: Ref<ScanEvent[]>;
  /** Clear the scan history */
  clearHistory: () => void;
  /** Trigger a scan programmatically */
  triggerScan: () => Promise<void>;
}

/**
 * Vue composable for barcode scanning
 *
 * @example
 * ```vue
 * <script setup>
 * import { useEdge, useBarcode } from '@cleverence-edge/js-sdk/vue';
 *
 * const { edge } = useEdge();
 * const { lastScan, scanHistory, clearHistory } = useBarcode({ edge });
 * </script>
 *
 * <template>
 *   <div>
 *     <h1>Last: {{ lastScan?.data }}</h1>
 *     <button @click="clearHistory">Clear</button>
 *     <ul>
 *       <li v-for="scan in scanHistory" :key="scan.id">
 *         {{ scan.data }} ({{ scan.symbology }})
 *       </li>
 *     </ul>
 *   </div>
 * </template>
 * ```
 */
export function useBarcode(options: UseBarcodeOptions): UseBarcodeReturn {
  const { edge, maxHistory = 50, onScan } = options;

  const lastScan = ref<ScanEvent | null>(null);
  const scanHistory = ref<ScanEvent[]>([]);

  let currentHandler: ((event: ScanEvent) => void) | null = null;

  const handleScan = (event: ScanEvent) => {
    lastScan.value = event;
    scanHistory.value = [event, ...scanHistory.value].slice(0, maxHistory);
    onScan?.(event);
  };

  // Watch for edge instance changes
  const stopWatch = watch(
    edge,
    (newEdge, oldEdge) => {
      // Remove old handler
      if (oldEdge && currentHandler) {
        oldEdge.off('scan', currentHandler);
      }

      // Add new handler
      if (newEdge) {
        currentHandler = handleScan;
        newEdge.on('scan', currentHandler);
      }
    },
    { immediate: true }
  );

  onUnmounted(() => {
    stopWatch();
    if (edge.value && currentHandler) {
      edge.value.off('scan', currentHandler);
    }
  });

  const clearHistory = () => {
    lastScan.value = null;
    scanHistory.value = [];
  };

  const triggerScan = async () => {
    if (!edge.value) throw new Error('Not connected');
    await edge.value.triggerScan();
  };

  return {
    lastScan,
    scanHistory,
    clearHistory,
    triggerScan,
  };
}
