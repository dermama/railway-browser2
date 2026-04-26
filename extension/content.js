// content.js - The Bridge
// Pattern matched with NodeMind Success Logic

const APP_SOURCE = "NODEMIND_APP";
const EXTENSION_SOURCE = "NODEMIND_EXTENSION";

console.log("NodeMind Bridge: Content Script Loaded in frame:", window.location.href);

// 1. Listen for messages from the Web App (window.postMessage)
window.addEventListener("message", (event) => {
  // Security Check: Only accept messages from the same window
  if (event.source !== window || !event.data || event.data.source !== APP_SOURCE) {
    return;
  }

  const { command, commandId, status } = event.data;

  // === BRANCH A: It's a COMMAND (PING, VIRTUAL_TRY_ON, etc.) ===
  if (command) {
    console.log("NodeMind Bridge: Command received from App", command.action);
    try {
        chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', command }, (response) => {
          if (chrome.runtime.lastError) {
              console.error("NodeMind Bridge: Extension Error", chrome.runtime.lastError);
              return;
          }
          if (response) {
              window.postMessage({
                source: EXTENSION_SOURCE,
                commandId: command.id,
                status: response.status || 'SUCCESS',
                data: response.data,
                command: response.command
              }, '*');
          }
        });
    } catch (err) {
        console.error("NodeMind Bridge Error:", err);
    }
    return;
  }

  // === BRANCH B: It's a RESULT (SUCCESS/INFO/ERROR from Gemini Engine) ===
  if (commandId && status) {
    console.log("NodeMind Bridge: Result received from App, relaying to server. Status:", status);
    chrome.runtime.sendMessage({
      type: 'FROM_PAGE',
      data: event.data
    });
    return;
  }
});

// 4. Handle ASYNC/PUSH messages from Background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TO_PAGE') {
        window.postMessage({
            source: EXTENSION_SOURCE,
            ...request.data
        }, '*');
        sendResponse({ status: 'RELAYED' });
    }
    return true;
});
