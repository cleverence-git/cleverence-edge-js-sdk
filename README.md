# @cleverence/edge-js-sdk

TypeScript SDK for [Cleverence Edge](https://cleverence.com/edge) - universal barcode scanning and RFID reading for web applications.

Connect your PWA, web app, or hybrid mobile app to enterprise barcode scanners and RFID readers from Zebra, Honeywell, Datalogic, UROVO, and more.

## Features

- **Universal Hardware Support** - Works with Zebra, Honeywell, Datalogic, UROVO, and other enterprise devices
- **Real-time Events** - Receive barcode scans and RFID reads instantly via WebSocket
- **Framework Adapters** - First-class React hooks and Vue composables
- **TypeScript** - Full type safety with comprehensive type definitions
- **Zero Dependencies** - Core SDK has no runtime dependencies
- **Auto-reconnect** - Handles connection drops gracefully with exponential backoff

## Installation

```bash
npm install @cleverence/edge-js-sdk
```

## Quick Start

### Vanilla JavaScript / TypeScript

```typescript
import { CleverenceEdge } from '@cleverence/edge-js-sdk';

const edge = new CleverenceEdge();

// Listen for barcode scans
edge.on('scan', (event) => {
  console.log(event.data);       // "012345678905"
  console.log(event.symbology);  // "ean13"
  console.log(event.source);     // "integrated-laser"
  console.log(event.vendor);     // "zebra"
});

// Listen for RFID reads
edge.on('rfid', (event) => {
  console.log(event.epc);        // "3034257BF400B7800004CB2F"
  console.log(event.rssi);       // -45
  console.log(event.antenna);    // 1
});

// Connection events
edge.on('connect', () => console.log('Connected!'));
edge.on('disconnect', () => console.log('Disconnected'));
edge.on('error', (err) => console.error('Error:', err));

// Programmatic control
await edge.triggerScan();
await edge.setSymbologies(['ean13', 'qrcode', 'code128']);
await edge.startRfidInventory({ power: 27 });
```

### React

```tsx
import { EdgeProvider, useBarcode, useEdge } from '@cleverence/edge-js-sdk/react';

function App() {
  return (
    <EdgeProvider>
      <Scanner />
    </EdgeProvider>
  );
}

function Scanner() {
  const { isConnected, capabilities } = useEdge();
  const { lastScan, scanHistory, clearHistory } = useBarcode();

  if (!isConnected) return <div>Connecting...</div>;

  return (
    <div>
      <p>Device: {capabilities?.vendor} {capabilities?.deviceModel}</p>
      <h1>Last scan: {lastScan?.data}</h1>
      <p>Symbology: {lastScan?.symbology}</p>
      <button onClick={clearHistory}>Clear History</button>
      <ul>
        {scanHistory.map(scan => (
          <li key={scan.id}>{scan.data} ({scan.symbology})</li>
        ))}
      </ul>
    </div>
  );
}
```

### Vue

```vue
<script setup>
import { useEdge, useBarcode } from '@cleverence/edge-js-sdk/vue';

const { edge, isConnected, capabilities } = useEdge();
const { lastScan, scanHistory, clearHistory } = useBarcode({ edge });
</script>

<template>
  <div v-if="!isConnected">Connecting...</div>
  <div v-else>
    <p>Device: {{ capabilities?.vendor }} {{ capabilities?.deviceModel }}</p>
    <h1>Last scan: {{ lastScan?.data }}</h1>
    <p>Symbology: {{ lastScan?.symbology }}</p>
    <button @click="clearHistory">Clear History</button>
    <ul>
      <li v-for="scan in scanHistory" :key="scan.id">
        {{ scan.data }} ({{ scan.symbology }})
      </li>
    </ul>
  </div>
</template>
```

## API Reference

### CleverenceEdge

The main SDK class.

```typescript
const edge = new CleverenceEdge(options?: EdgeOptions);
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | `'ws://localhost:8585'` | WebSocket URL of the Edge service |
| `autoConnect` | `boolean` | `true` | Auto-connect on instantiation |
| `reconnectDelay` | `number` | `1000` | Initial reconnect delay (ms) |
| `maxReconnectDelay` | `number` | `30000` | Maximum reconnect delay (ms) |
| `pingInterval` | `number` | `30000` | Keepalive ping interval (ms) |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | Whether connected to Edge service |
| `connectionState` | `ConnectionState` | Current state: `'disconnected'`, `'connecting'`, `'connected'`, `'reconnecting'` |
| `capabilities` | `DeviceCapabilities \| null` | Device capabilities (after connect) |

#### Events

```typescript
edge.on('scan', (event: ScanEvent) => { /* barcode scanned */ });
edge.on('rfid', (event: RfidEvent) => { /* RFID tag read */ });
edge.on('connect', () => { /* connected */ });
edge.on('disconnect', () => { /* disconnected */ });
edge.on('reconnecting', () => { /* attempting reconnect */ });
edge.on('error', (error: Error) => { /* error occurred */ });
edge.on('capabilities', (caps: DeviceCapabilities) => { /* capabilities received */ });
```

#### Methods

```typescript
// Connection
await edge.connect();
edge.disconnect();

// Barcode commands
await edge.triggerScan();
await edge.setSymbologies(['ean13', 'qrcode', 'code128']);

// RFID commands
await edge.startRfidInventory({ power: 27 });
await edge.stopRfidInventory();

// Queries
const status = await edge.getStatus();
const capabilities = await edge.getCapabilities();
const config = await edge.getConfig();
const tags = await edge.getRfidTags();
```

### Event Types

#### ScanEvent

```typescript
interface ScanEvent {
  type: 'scan';
  id: string;
  timestamp: Date;
  data: string;           // Decoded barcode data
  symbology: string;      // "ean13", "qrcode", "code128", etc.
  source: string;         // "integrated-laser", "camera", etc.
  vendor: string;         // "zebra", "honeywell", etc.
  raw?: {
    bytesHex: string;
    symbologyId: string;
    aimId: string;
    signalStrength: number | null;
    scanDurationMs: number;
  };
}
```

#### RfidEvent

```typescript
interface RfidEvent {
  type: 'rfid';
  id: string;
  timestamp: Date;
  epc: string;            // EPC tag ID
  rssi: number;           // Signal strength (dBm)
  antenna: number;        // Antenna port
  tid?: string;
  userData?: string;
  readCount?: number;
}
```

### React Hooks

#### useEdge

```typescript
const {
  edge,           // CleverenceEdge instance
  isConnected,    // boolean
  connectionState,// ConnectionState
  capabilities,   // DeviceCapabilities | null
  error,          // Error | null
} = useEdge();
```

#### useBarcode

```typescript
const {
  lastScan,       // ScanEvent | null
  scanHistory,    // ScanEvent[]
  clearHistory,   // () => void
  triggerScan,    // () => Promise<void>
} = useBarcode(options?: {
  maxHistory?: number;  // Default: 50
  onScan?: (event: ScanEvent) => void;
});
```

#### useRfid

```typescript
const {
  lastRead,          // RfidEvent | null
  tags,              // Map<string, RfidTag>
  isInventoryActive, // boolean
  startInventory,    // (options?) => Promise<void>
  stopInventory,     // () => Promise<void>
  clearTags,         // () => void
} = useRfid(options?: {
  onRead?: (event: RfidEvent) => void;
});
```

### Vue Composables

The Vue composables mirror the React hooks API but use Vue's reactivity system (`Ref<T>`).

```typescript
import { useEdge, useBarcode, useRfid } from '@cleverence/edge-js-sdk/vue';

const { edge, isConnected, capabilities } = useEdge();
const { lastScan, scanHistory } = useBarcode({ edge });
const { tags, startInventory, stopInventory } = useRfid({ edge });
```

## Prerequisites

This SDK requires the Cleverence Edge service to be running on the Android device. The service:

- Runs on `localhost:8585` by default
- Handles all vendor-specific hardware integration
- Broadcasts scan/RFID events via WebSocket
- Works with Chrome, WebView, Capacitor, Cordova, etc.

Visit [cleverence.com/edge](https://cleverence.com/edge) to get started with Edge.

## Browser Support

- Chrome 63+
- Firefox 58+
- Safari 11+
- Edge 79+

The SDK uses native WebSocket which is supported in all modern browsers.

## License

MIT
