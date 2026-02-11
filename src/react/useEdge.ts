import { useEdgeContext } from './EdgeContext';
import type { CleverenceEdge } from '../core/client';
import type { ConnectionState, DeviceCapabilities } from '../types';

export interface UseEdgeReturn {
  /** The CleverenceEdge instance */
  edge: CleverenceEdge | null;
  /** Whether connected to the Edge service */
  isConnected: boolean;
  /** Current connection state */
  connectionState: ConnectionState;
  /** Device capabilities (available after connect) */
  capabilities: DeviceCapabilities | null;
  /** Last error that occurred */
  error: Error | null;
}

/**
 * Hook to access the CleverenceEdge instance and connection state
 *
 * @example
 * ```tsx
 * function StatusBar() {
 *   const { isConnected, capabilities, error } = useEdge();
 *
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!isConnected) return <div>Connecting...</div>;
 *
 *   return (
 *     <div>
 *       Connected to {capabilities?.vendor} {capabilities?.deviceModel}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEdge(): UseEdgeReturn {
  return useEdgeContext();
}
