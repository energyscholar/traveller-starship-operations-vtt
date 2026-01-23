/**
 * Roll20 Claude Extension - Background Service Worker
 *
 * Manages WebSocket connection to bridge service.
 * Routes messages between Roll20 content script and Claude bridge.
 */

const BRIDGE_URL = 'ws://localhost:3001/roll20';
const RECONNECT_DELAY = 5000;

let bridgeSocket = null;
let bridgeConnected = false;

/**
 * Connect to the Claude bridge service
 */
function connectBridge() {
  if (bridgeSocket && bridgeSocket.readyState === WebSocket.OPEN) {
    return;
  }

  console.log('[Roll20 Claude] Connecting to bridge...');

  try {
    bridgeSocket = new WebSocket(BRIDGE_URL);

    bridgeSocket.onopen = () => {
      bridgeConnected = true;
      console.log('[Roll20 Claude] Bridge connected');
    };

    bridgeSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleBridgeMessage(message);
      } catch (err) {
        console.error('[Roll20 Claude] Failed to parse bridge message:', err);
      }
    };

    bridgeSocket.onclose = () => {
      bridgeConnected = false;
      console.log('[Roll20 Claude] Bridge disconnected, reconnecting in 5s...');
      setTimeout(connectBridge, RECONNECT_DELAY);
    };

    bridgeSocket.onerror = (error) => {
      console.error('[Roll20 Claude] Bridge error:', error);
    };

  } catch (err) {
    console.error('[Roll20 Claude] Failed to connect:', err);
    setTimeout(connectBridge, RECONNECT_DELAY);
  }
}

/**
 * Handle messages from the bridge service
 * @param {Object} message - Parsed message from bridge
 */
function handleBridgeMessage(message) {
  if (message.type === 'SEND_CHAT') {
    // Forward to all Roll20 tabs
    forwardToRoll20Tabs(message);
  }
}

/**
 * Forward message to all Roll20 editor tabs
 * @param {Object} message - Message to forward
 */
async function forwardToRoll20Tabs(message) {
  try {
    const tabs = await chrome.tabs.query({
      url: '*://app.roll20.net/editor/*'
    });

    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch (err) {
        console.error(`[Roll20 Claude] Failed to send to tab ${tab.id}:`, err);
      }
    }
  } catch (err) {
    console.error('[Roll20 Claude] Failed to query tabs:', err);
  }
}

/**
 * Send message to bridge service
 * @param {Object} message - Message to send
 */
function sendToBridge(message) {
  if (!bridgeConnected || !bridgeSocket) {
    console.warn('[Roll20 Claude] Bridge not connected');
    return;
  }

  try {
    bridgeSocket.send(JSON.stringify(message));
  } catch (err) {
    console.error('[Roll20 Claude] Failed to send to bridge:', err);
  }
}

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHAT_UPDATE') {
    // Forward chat updates to bridge
    sendToBridge(message);
    sendResponse({ success: true, bridgeConnected });
  }
  return true;
});

// Initialize connection on startup
connectBridge();

console.log('[Roll20 Claude] Background service worker started');
