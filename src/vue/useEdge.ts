import { ref, shallowRef, onMounted, onUnmounted, type Ref, type ShallowRef } from 'vue';
import { CleverenceEdge } from '../core/client';
import type { ConnectionState, DeviceCapabilities, EdgeOptions } from '../types';

// Shared instance for the app
let sharedEdge: CleverenceEdge | null = null;
let refCount = 0;

export interface UseEdgeOptions extends EdgeOptions {
  /** Use a shared instance across components. Default: true */
  shared?: boolean;
}

export interface UseEdgeReturn {
  /** The CleverenceEdge instance */
  edge: ShallowRef<CleverenceEdge | null>;
  /** Whether connected to the Edge service */
  isConnected: Ref<boolean>;
  /** Current connection state */
  connectionState: Ref<ConnectionState>;
  /** Device capabilities (available after connect) */
  capabilities: Ref<DeviceCapabilities | null>;
  /** Last error that occurred */
  error: Ref<Error | null>;
  /** Manually connect */
  connect: () => Promise<void>;
  /** Manually disconnect */
  disconnect: () => void;
}

/**
 * Vue composable to access the CleverenceEdge instance and connection state
 *
 * @example
 * ```vue
 * <script setup>
 * import { useEdge } from '@cleverence-edge/js-sdk/vue';
 *
 * const { isConnected, capabilities, error } = useEdge();
 * </script>
 *
 * <template>
 *   <div v-if="error">Error: {{ error.message }}</div>
 *   <div v-else-if="!isConnected">Connecting...</div>
 *   <div v-else>
 *     Connected to {{ capabilities?.vendor }} {{ capabilities?.deviceModel }}
 *   </div>
 * </template>
 * ```
 */
export function useEdge(options: UseEdgeOptions = {}): UseEdgeReturn {
  const { shared = true, ...edgeOptions } = options;

  const edge = shallowRef<CleverenceEdge | null>(null);
  const isConnected = ref(false);
  const connectionState = ref<ConnectionState>('disconnected');
  const capabilities = ref<DeviceCapabilities | null>(null);
  const error = ref<Error | null>(null);

  const handleConnect = () => {
    connectionState.value = 'connected';
    isConnected.value = true;
    error.value = null;
  };

  const handleDisconnect = () => {
    connectionState.value = 'disconnected';
    isConnected.value = false;
  };

  const handleReconnecting = () => {
    connectionState.value = 'reconnecting';
    isConnected.value = false;
  };

  const handleError = (err: Error) => {
    error.value = err;
  };

  const handleCapabilities = (caps: DeviceCapabilities) => {
    capabilities.value = caps;
  };

  const setupListeners = (instance: CleverenceEdge) => {
    instance.on('connect', handleConnect);
    instance.on('disconnect', handleDisconnect);
    instance.on('reconnecting', handleReconnecting);
    instance.on('error', handleError);
    instance.on('capabilities', handleCapabilities);
  };

  const removeListeners = (instance: CleverenceEdge) => {
    instance.off('connect', handleConnect);
    instance.off('disconnect', handleDisconnect);
    instance.off('reconnecting', handleReconnecting);
    instance.off('error', handleError);
    instance.off('capabilities', handleCapabilities);
  };

  onMounted(() => {
    let instance: CleverenceEdge;

    if (shared) {
      if (!sharedEdge) {
        sharedEdge = new CleverenceEdge(edgeOptions);
      }
      instance = sharedEdge;
      refCount++;
    } else {
      instance = new CleverenceEdge(edgeOptions);
    }

    edge.value = instance;
    connectionState.value = instance.connectionState;
    isConnected.value = instance.isConnected;
    capabilities.value = instance.capabilities;

    setupListeners(instance);
  });

  onUnmounted(() => {
    const instance = edge.value;
    if (!instance) return;

    removeListeners(instance);

    if (shared) {
      refCount--;
      if (refCount === 0 && sharedEdge) {
        sharedEdge.disconnect();
        sharedEdge = null;
      }
    } else {
      instance.disconnect();
    }

    edge.value = null;
  });

  const connect = async () => {
    if (edge.value) {
      await edge.value.connect();
    }
  };

  const disconnect = () => {
    if (edge.value) {
      edge.value.disconnect();
    }
  };

  return {
    edge,
    isConnected,
    connectionState,
    capabilities,
    error,
    connect,
    disconnect,
  };
}
