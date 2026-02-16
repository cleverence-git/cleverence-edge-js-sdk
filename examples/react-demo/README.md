# Cleverence Edge React Demo

A demo React application for testing and showcasing the Cleverence Edge SDK.

## Features

- Real-time barcode scanning with duplicate counting
- RFID inventory support (if device has RFID capability)
- Connection status display
- Mobile-first responsive design

## Activation

Before using this demo, you need to activate Cleverence Edge on your device:

1. Get an activation code from [cleverence.com/edge](https://cleverence.com/edge)
2. On your Android device, either:
   - Scan a barcode containing `CEDGE-ACT:<your-activation-code>`
   - Enter the code in the Edge app settings

The `ACTIVATION_CODE` placeholder in `src/App.tsx` is for reference only - activation is done on the device, not in the web app.

## Quick Start

```bash
# From this directory
npm install
npm run dev
```

Then open http://localhost:3000 on your Android device where Cleverence Edge is installed.

## Using on Device

1. Install Cleverence Edge on your Android device
2. Make sure both your device and development machine are on the same network
3. Run `npm run dev` - note the network URL shown (e.g., `http://192.168.1.100:3000`)
4. Open that URL in Chrome on your Android device
5. Start scanning!

## Project Structure

```
src/
  main.tsx          # Entry point
  App.tsx           # Main app component with all scanner logic
  App.css           # Mobile-first styles
```

## Customization

This demo is intentionally simple to serve as a learning resource. Key areas to customize:

- **Scan handling**: Modify the `ScanList` component to handle scans differently
- **Styling**: Edit `App.css` to match your brand
- **RFID**: The `RfidPanel` component shows how to manage RFID inventory

## SDK Usage

The app demonstrates these SDK features:

```tsx
import { EdgeProvider, useEdge, useBarcode, useRfid } from '@cleverence/edge-js-sdk/react';

// Wrap your app
<EdgeProvider>
  <YourApp />
</EdgeProvider>

// In your components
const { isConnected, capabilities } = useEdge();
const { lastScan, scanHistory, clearHistory } = useBarcode();
const { tags, startInventory, stopInventory } = useRfid();
```

See the [SDK documentation](../../README.md) for full API reference.

## License

MIT
