/**
 * NodeMind Protocol Background Script
 * Multi-Worker Edition - Each extension has a unique stable ID
 */

const SERVER_URL = "https://baibanaro-virtual-stylist-server.hf.space";

let EXTENSION_ID = null;
let activeSessionId = null;
let isServerOnline = false;

// ─── Step 1: Load or Generate a stable unique ID ─────────────
function initExtensionId(callback) {
    chrome.storage.local.get('extensionId', (data) => {
        if (data.extensionId) {
            EXTENSION_ID = data.extensionId;
        } else {
            // Generate a new short unique ID
            EXTENSION_ID = 'EXT_' + Math.random().toString(36).substr(2, 6).toUpperCase();
            chrome.storage.local.set({ extensionId: EXTENSION_ID });
        }
        console.log("[BRIDGE] Extension ID:", EXTENSION_ID);
        if (callback) callback();
    });
}

// ─── Step 2: Server Polling ───────────────────────────────────
async function monitorServer() {
    if (!EXTENSION_ID) return; // Wait until ID is ready
    try {
        const response = await fetch(
            `${SERVER_URL}/api/tasks?extId=${EXTENSION_ID}&t=${Date.now()}`,
            { method: 'GET', mode: 'cors', cache: 'no-cache' }
        );

        isServerOnline = response.ok;

        if (response.status === 200) {
            const task = await response.json();
            console.log("[BRIDGE] New Task received:", task.taskId, "from worker pool");
            handleIncomingTask(task);
        }
        // 204 = No task available (queue empty OR this worker is at max capacity)
    } catch (e) {
        console.error("[BRIDGE] Monitor Error:", e.message);
        isServerOnline = false;
    }
}

// ─── Step 3: Lifecycle (MV3 Stability) ───────────────────────
chrome.runtime.onInstalled.addListener(() => {
    initExtensionId(setupAlarms);
});

chrome.runtime.onStartup.addListener(() => {
    initExtensionId(setupAlarms);
});

// Fallback: if neither event fires (e.g. service worker woke up mid-session)
initExtensionId(() => {
    setupAlarms();
});

function setupAlarms() {
    chrome.alarms.create("POLL_ALARM", { periodInMinutes: 1 });
    monitorServer(); // Run immediately
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "POLL_ALARM") {
        monitorServer();
    }
});

// Fast 2-second polling for responsiveness
setInterval(monitorServer, 2000);

// ─── Step 4: Handle incoming task ────────────────────────────
function handleIncomingTask(task) {
    console.log("[BRIDGE] Broadcasting task to AI Studio frames...");
    broadcastToAllFrames({
        command: {
            id: task.taskId,
            action: "VIRTUAL_TRY_ON",
            payload: {
                personImage: task.personImage,
                clothingImage: task.clothingImage,
                personMime: task.personMime || 'image/jpeg',
                clothingMime: task.clothingMime || 'image/jpeg'
            },
            sessionId: activeSessionId
        }
    });
}

// ─── Step 5: Message Router ───────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "EXECUTE_COMMAND") {
        const { command } = request;
        if (command.action === "PING") {
            activeSessionId = command.sessionId;
            console.log("[BRIDGE] Handshake OK. Session:", activeSessionId, "| Worker:", EXTENSION_ID);
            sendResponse({
                status: "SUCCESS",
                command: {
                    action: "PONG",
                    payload: { serverOnline: isServerOnline, workerId: EXTENSION_ID }
                }
            });
            return;
        }
        sendResponse({ status: "UNKNOWN_ACTION" });
    }

    if (request.type === "FROM_PAGE") {
        const payload = request.data;
        if (payload.status === "SUCCESS" || payload.status === "INFO") {
            console.log("[BRIDGE] Result received for Task:", payload.commandId);
            relayResultToServer(payload.commandId, payload.data);
        }
    }
    return true;
});

// ─── Step 6: Send result back to server (with this worker's ID) ──
async function relayResultToServer(taskId, result) {
    if (!EXTENSION_ID) {
        console.error("[BRIDGE] Cannot relay: EXTENSION_ID not ready");
        return;
    }
    try {
        await fetch(`${SERVER_URL}/api/result`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, extId: EXTENSION_ID, result })
        });
        console.log("[BRIDGE] Result sent to server. Task:", taskId, "Worker:", EXTENSION_ID);
    } catch (e) {
        console.error("[BRIDGE] Relay ERROR:", e);
    }
}

// ─── Step 7: Broadcast to AI Studio frames ────────────────────
function broadcastToAllFrames(message) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.id) {
                chrome.tabs.sendMessage(tab.id, {
                    type: "TO_PAGE",
                    data: message
                }).catch(() => {});
            }
        });
    });
}
