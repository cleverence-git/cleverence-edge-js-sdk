import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { CleverenceEdge } from '../core/client';
import type { ConnectionState, DeviceCapabilities, EdgeOptions } from '../types';

interface EdgeContextValue {
  edge: CleverenceEdge | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  capabilities: DeviceCapabilities | null;
  error: Error | null;
}

const EdgeContext = createContext<EdgeContextValue | null>(null);

export interface EdgeProviderProps {
  children: ReactNode;
  /** Edge connection options */
  options?: EdgeOptions;
  /** Custom CleverenceEdge instance (if you want to manage it yourself) */
  instance?: CleverenceEdge;
}

/**
 * React context provider for CleverenceEdge
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <EdgeProvider>
 *       <Scanner />
 *     </EdgeProvider>
 *   );
 * }
 * ```
 */
export function EdgeProvider({ children, options, instance }: EdgeProviderProps) {
  const [edge] = useState<CleverenceEdge>(() => instance ?? new CleverenceEdge(options));
  const [connectionState, setConnectionState] = useState<ConnectionState>(edge.connectionState);
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(edge.capabilities);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleConnect = () => {
      setConnectionState('connected');
      setError(null);
    };

    const handleDisconnect = () => {
      setConnectionState('disconnected');
    };

    const handleReconnecting = () => {
      setConnectionState('reconnecting');
    };

    const handleError = (err: Error) => {
      setError(err);
    };

    const handleCapabilities = (caps: DeviceCapabilities) => {
      setCapabilities(caps);
    };

    edge.on('connect', handleConnect);
    edge.on('disconnect', handleDisconnect);
    edge.on('reconnecting', handleReconnecting);
    edge.on('error', handleError);
    edge.on('capabilities', handleCapabilities);

    // Sync initial state
    setConnectionState(edge.connectionState);
    setCapabilities(edge.capabilities);

    return () => {
      edge.off('connect', handleConnect);
      edge.off('disconnect', handleDisconnect);
      edge.off('reconnecting', handleReconnecting);
      edge.off('error', handleError);
      edge.off('capabilities', handleCapabilities);
      
      // Only disconnect if we created the instance
      if (!instance) {
        edge.disconnect();
      }
    };
  }, [edge, instance]);

  const value = useMemo<EdgeContextValue>(
    () => ({
      edge,
      isConnected: connectionState === 'connected',
      connectionState,
      capabilities,
      error,
    }),
    [edge, connectionState, capabilities, error]
  );

  return <EdgeContext.Provider value={value}>{children}</EdgeContext.Provider>;
}

/**
 * Hook to access the Edge context
 * @internal
 */
export function useEdgeContext(): EdgeContextValue {
  const context = useContext(EdgeContext);
  if (!context) {
    throw new Error('useEdgeContext must be used within an EdgeProvider');
  }
  return context;
}
