import { useState, useEffect, useCallback } from 'react';
import { useEdgeContext } from './EdgeContext';
import type { RfidEvent, RfidTag, RfidInventoryOptions } from '../types';

export interface UseRfidOptions {
  /** Called when a new RFID tag is read */
  onRead?: (event: RfidEvent) => void;
}

export interface UseRfidReturn {
  /** Most recent RFID read event */
  lastRead: RfidEvent | null;
  /** Aggregated list of unique tags (by EPC) */
  tags: Map<string, RfidTag>;
  /** Whether an inventory is currently active */
  isInventoryActive: boolean;
  /** Start RFID inventory */
  startInventory: (options?: RfidInventoryOptions) => Promise<void>;
  /** Stop RFID inventory */
  stopInventory: () => Promise<void>;
  /** Clear the tags list */
  clearTags: () => void;
}

/**
 * Hook for RFID reading
 *
 * @example
 * ```tsx
 * function RfidReader() {
 *   const { tags, isInventoryActive, startInventory, stopInventory } = useRfid();
 *
 *   return (
 *     <div>
 *       <button onClick={() => isInventoryActive ? stopInventory() : startInventory()}>
 *         {isInventoryActive ? 'Stop' : 'Start'} Inventory
 *       </button>
 *       <p>{tags.size} unique tags found</p>
 *       <ul>
 *         {Array.from(tags.values()).map(tag => (
 *           <li key={tag.epc}>
 *             {tag.epc} (RSSI: {tag.rssi}, Count: {tag.readCount})
 *           </li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRfid(options: UseRfidOptions = {}): UseRfidReturn {
  const { onRead } = options;
  const { edge } = useEdgeContext();
  const [lastRead, setLastRead] = useState<RfidEvent | null>(null);
  const [tags, setTags] = useState<Map<string, RfidTag>>(new Map());
  const [isInventoryActive, setIsInventoryActive] = useState(false);

  useEffect(() => {
    if (!edge) return;

    const handleRfid = (event: RfidEvent) => {
      setLastRead(event);
      
      // Update tags map
      setTags((prev) => {
        const newTags = new Map(prev);
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
        
        return newTags;
      });
      
      onRead?.(event);
    };

    edge.on('rfid', handleRfid);
    return () => {
      edge.off('rfid', handleRfid);
    };
  }, [edge, onRead]);

  const startInventory = useCallback(async (inventoryOptions?: RfidInventoryOptions) => {
    if (!edge) throw new Error('Not connected');
    await edge.startRfidInventory(inventoryOptions);
    setIsInventoryActive(true);
  }, [edge]);

  const stopInventory = useCallback(async () => {
    if (!edge) throw new Error('Not connected');
    await edge.stopRfidInventory();
    setIsInventoryActive(false);
  }, [edge]);

  const clearTags = useCallback(() => {
    setLastRead(null);
    setTags(new Map());
  }, []);

  return {
    lastRead,
    tags,
    isInventoryActive,
    startInventory,
    stopInventory,
    clearTags,
  };
}
