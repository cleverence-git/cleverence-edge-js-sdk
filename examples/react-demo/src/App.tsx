import { useState } from 'react';
import { EdgeProvider, useEdge, useBarcode, useRfid } from '@cleverence/edge-js-sdk/react';

// ============================================================================
// ACTIVATION CODE
// ============================================================================
// Replace with your activation code from the Cleverence Edge dashboard.
// Get yours at: https://cleverence.com/edge
//
// The activation code is entered in the Edge app on the device, not in this web app.
// You can activate by:
//   1. Scanning a barcode: CEDGE-ACT:<your-activation-code>
//   2. Entering the code in the Edge app settings
//
// Example activation code format:
export const ACTIVATION_CODE = '<insert-your-activation-code>';
// ============================================================================

// Types for grouped scans
interface GroupedScan {
  data: string;
  symbology: string;
  count: number;
  lastSeen: Date;
  source: string;
}

function ConnectionStatus() {
  const { isConnected, connectionState, capabilities, error } = useEdge();

  const statusColor = isConnected 
    ? '#22c55e' 
    : connectionState === 'reconnecting' 
      ? '#eab308' 
      : '#ef4444';

  const statusText = isConnected
    ? `Connected to ${capabilities?.deviceModel || 'Device'} (${capabilities?.vendor || 'Unknown'})`
    : connectionState === 'reconnecting'
      ? 'Reconnecting...'
      : connectionState === 'connecting'
        ? 'Connecting...'
        : 'Disconnected';

  return (
    <div className="connection-status">
      <span className="status-dot" style={{ backgroundColor: statusColor }} />
      <span className="status-text">{statusText}</span>
      {error && <span className="status-error">{error.message}</span>}
    </div>
  );
}

function ScanList() {
  const { scanHistory, clearHistory } = useBarcode();
  
  // Group scans by barcode data
  const groupedScans = scanHistory.reduce<Map<string, GroupedScan>>((acc, scan) => {
    const existing = acc.get(scan.data);
    if (existing) {
      existing.count += 1;
      if (scan.timestamp > existing.lastSeen) {
        existing.lastSeen = scan.timestamp;
      }
    } else {
      acc.set(scan.data, {
        data: scan.data,
        symbology: scan.symbology,
        count: 1,
        lastSeen: scan.timestamp,
        source: scan.source,
      });
    }
    return acc;
  }, new Map());

  // Convert to array and sort by lastSeen (most recent first)
  const sortedScans = Array.from(groupedScans.values())
    .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());

  const totalScans = scanHistory.length;
  const uniqueScans = sortedScans.length;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="scan-panel">
      <div className="scan-header">
        <div className="scan-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="7" y1="8" x2="13" y2="8" />
            <line x1="7" y1="16" x2="15" y2="16" />
          </svg>
        </div>
        <span>Scan barcode</span>
      </div>

      <div className="scan-summary">
        <span>Scanned: {totalScans} total, {uniqueScans} unique</span>
        {totalScans > 0 && (
          <button className="clear-btn" onClick={clearHistory}>Clear</button>
        )}
      </div>

      <div className="scan-list">
        {sortedScans.length === 0 ? (
          <div className="empty-state">
            <p>No scans yet</p>
            <p className="hint">Use the hardware scanner to scan a barcode</p>
          </div>
        ) : (
          sortedScans.map((scan) => (
            <div key={scan.data} className="scan-item">
              <div className="scan-item-main">
                <span className="scan-data">{scan.data}</span>
                <span className="scan-count">x{scan.count}</span>
              </div>
              <div className="scan-item-meta">
                <span className="scan-symbology">{scan.symbology}</span>
                <span className="scan-time">last: {formatTime(scan.lastSeen)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RfidPanel() {
  const { isConnected, capabilities } = useEdge();
  const { tags, isInventoryActive, startInventory, stopInventory, clearTags } = useRfid();

  // Don't show if device doesn't have RFID
  if (!capabilities?.hasRfid) {
    return null;
  }

  const tagList = Array.from(tags.values())
    .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="rfid-panel">
      <div className="rfid-header">
        <div className="rfid-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
            <path d="M5 19.5C5.5 18 6 15 6 12c0-2 .5-4 1.5-5.5" />
            <path d="M8.5 22c.5-1.5 1-4 1-7" />
            <circle cx="12" cy="12" r="2" />
            <path d="M18 12h.01" />
            <path d="M22 12a10 10 0 0 1-4 8" />
          </svg>
        </div>
        <span>RFID Inventory</span>
      </div>

      <div className="rfid-controls">
        <button 
          className={`inventory-btn ${isInventoryActive ? 'active' : ''}`}
          onClick={() => isInventoryActive ? stopInventory() : startInventory()}
          disabled={!isConnected}
        >
          {isInventoryActive ? 'Stop Inventory' : 'Start Inventory'}
        </button>
        {tags.size > 0 && (
          <button className="clear-btn" onClick={clearTags}>Clear</button>
        )}
      </div>

      <div className="rfid-summary">
        <span>{tags.size} unique tags</span>
      </div>

      <div className="tag-list">
        {tagList.length === 0 ? (
          <div className="empty-state">
            <p>No tags read</p>
            <p className="hint">Start inventory and bring tags near the reader</p>
          </div>
        ) : (
          tagList.map((tag) => (
            <div key={tag.epc} className="tag-item">
              <div className="tag-item-main">
                <span className="tag-epc">{tag.epc}</span>
                <span className="tag-count">x{tag.readCount}</span>
              </div>
              <div className="tag-item-meta">
                <span className="tag-rssi">RSSI: {tag.rssi} dBm</span>
                <span className="tag-time">last: {formatTime(tag.lastSeen)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Scanner() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'rfid'>('scanner');
  const { capabilities } = useEdge();

  const hasRfid = capabilities?.hasRfid;

  return (
    <div className="scanner-container">
      <ConnectionStatus />
      
      <div className="tab-content">
        {activeTab === 'scanner' && <ScanList />}
        {activeTab === 'rfid' && hasRfid && <RfidPanel />}
      </div>

      {hasRfid && (
        <div className="tab-bar">
          <button 
            className={`tab-btn ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveTab('scanner')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <line x1="7" y1="12" x2="17" y2="12" />
            </svg>
            Scanner
          </button>
          <button 
            className={`tab-btn ${activeTab === 'rfid' ? 'active' : ''}`}
            onClick={() => setActiveTab('rfid')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
              <circle cx="12" cy="12" r="2" />
              <path d="M22 12a10 10 0 0 1-4 8" />
            </svg>
            RFID
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <EdgeProvider>
      <Scanner />
    </EdgeProvider>
  );
}
