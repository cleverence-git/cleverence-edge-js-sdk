import { ref, watch, onUnmounted, type Ref, type ShallowRef } from 'vue';
import type { CleverenceEdge } from '../core/client';
import type { RfidEvent, RfidTag, RfidInventoryOptions } from '../types';

export interface UseRfidOptions {
  /** The edge instance to use (from useEdge) */
  edge: ShallowRef<CleverenceEdge | null> | Ref<CleverenceEdge | null>;
  /** Called when a new RFID tag is read */
  onRead?: (event: RfidEvent) => void;
}

export interface UseRfidReturn {
  /** Most recent RFID read event */
  lastRead: Ref<RfidEvent | null>;
  /** Aggregated list of unique tags (by EPC) */
  tags: Ref<Map<string, RfidTag>>;
  /** Whether an inventory is currently active */
  isInventoryActive: Ref<boolean>;
  /** Start RFID inventory */
  startInventory: (options?: RfidInventoryOptions) => Promise<void>;
  /** Stop RFID inventory */
  stopInventory: () => Promise<void>;
  /** Clear the tags list */
  clearTags: () => void;
}

/**
 * Vue composable for RFID reading
 *
 * @example
 * ```vue
 * <script setup>
 * import { useEdge, useRfid } from '@cleverence-edge/js-sdk/vue';
 *
 * const { edge } = useEdge();
 * const { tags, isInventoryActive, startInventory, stopInventory } = useRfid({ edge });
 * </script>
 *
 * <template>
 *   <div>
 *     <button @click="isInventoryActive ? stopInventory() : startInventory()">
 *       {{ isInventoryActive ? 'Stop' : 'Start' }} Inventory
 *     </button>
 *     <p>{{ tags.size }} unique tags found</p>
 *     <ul>
 *       <li v-for="[epc, tag] in tags" :key="epc">
 *         {{ tag.epc }} (RSSI: {{ tag.rssi }}, Count: {{ tag.readCount }})
 *       </li>
 *     </ul>
 *   </div>
 * </template>
 * ```
 */
export function useRfid(options: UseRfidOptions): UseRfidReturn {
  const { edge, onRead } = options;

  const lastRead = ref<RfidEvent | null>(null);
  const tags = ref<Map<string, RfidTag>>(new Map());
  const isInventoryActive = ref(false);

  let currentHandler: ((event: RfidEvent) => void) | null = null;

  const handleRfid = (event: RfidEvent) => {
    lastRead.value = event;

    // Update tags map
    const newTags = new Map(tags.value);
    const existing = newTags.get(event.epc);
    const now = new Date();

    if (existing) {
      newTags.set(event.epc, {
        ...existing,
        rssi: event.rssi,
        antenna: event.antenna,
        readCount: existing.readCount + 1,
        lastSeen: now,
      });
    } else {
      newTags.set(event.epc, {
        epc: event.epc,
        rssi: event.rssi,
        antenna: event.antenna,
        readCount: 1,
        firstSeen: now,
        lastSeen: now,
      });
    }

    tags.value = newTags;
    onRead?.(event);
  };

  // Watch for edge instance changes
  const stopWatch = watch(
    edge,
    (newEdge, oldEdge) => {
      // Remove old handler
      if (oldEdge && currentHandler) {
        oldEdge.off('rfid', currentHandler);
      }

      // Add new handler
      if (newEdge) {
        currentHandler = handleRfid;
        newEdge.on('rfid', currentHandler);
      }
    },
    { immediate: true }
  );

  onUnmounted(() => {
    stopWatch();
    if (edge.value && currentHandler) {
      edge.value.off('rfid', currentHandler);
    }
  });

  const startInventory = async (inventoryOptions?: RfidInventoryOptions) => {
    if (!edge.value) throw new Error('Not connected');
    await edge.value.startRfidInventory(inventoryOptions);
    isInventoryActive.value = true;
  };

  const stopInventory = async () => {
    if (!edge.value) throw new Error('Not connected');
    await edge.value.stopRfidInventory();
    isInventoryActive.value = false;
  };

  const clearTags = () => {
    lastRead.value = null;
    tags.value = new Map();
  };

  return {
    lastRead,
    tags,
    isInventoryActive,
    startInventory,
    stopInventory,
    clearTags,
  };
}
