/**
 * NodeMind Protocol Background Script
 * Central Hub for Server <-> Extension <-> Page communication
 * Uses Alarms + Heartbeat for MV3 Service Worker Stability
 */

let activeSessionId = null;
let isServerOnline = false;
const SERVER_URL = "https://baibanaro-virtual-stylist-server.hf.space"; 

console.log("NodeMind Bridge: Background Service Worker Active");

// 1. Connection & Task Monitoring
async function monitorServer() {
    const timestamp = Date.now();
    try {
        const response = await fetch(`${SERVER_URL}/api/tasks?t=${timestamp}`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        isServerOnline = response.ok;
        
        if (response.status === 200) {
            const task = await response.json();
            console.log("[BRIDGE] New Task Found:", task.taskId);
            handleIncomingTask(task);
        }
    } catch (e) {
        console.error("[BRIDGE] Monitor Error:", e.message);
        isServerOnline = false;
    }
}

// 2. Lifecycle Management (MV3)
chrome.runtime.onInstalled.addListener(() => {
    console.log("[BRIDGE] Extension Installed. Setting up alarms...");
    setupAlarms();
});

chrome.runtime.onStartup.addListener(() => {
    console.log("[BRIDGE] Browser Startup. Setting up alarms...");
    setupAlarms();
});

function setupAlarms() {
    // Create an alarm to wake up the service worker every minute (fallback)
    chrome.alarms.create("POLL_ALARM", { periodInMinutes: 1 });
    // Run the monitor immediately
    monitorServer();
}

// Listen for the alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "POLL_ALARM") {
        console.log("[BRIDGE] Alarm Triggered - Keeping Bridge Alive");
        monitorServer();
    }
});

// For high responsiveness, we still use a fast interval when active
setInterval(monitorServer, 2000); 

function handleIncomingTask(task) {
    console.log("[BRIDGE] Broadcasting task...");
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

// 3. Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "EXECUTE_COMMAND") {
        const { command } = request;
        if (command.action === "PING") {
            activeSessionId = command.sessionId;
            console.log("[BRIDGE] Handshake for Session:", activeSessionId);
            sendResponse({
                status: "SUCCESS",
                command: {
                    action: "PONG",
                    payload: { serverOnline: isServerOnline }
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

async function relayResultToServer(taskId, result) {
    try {
        await fetch(`${SERVER_URL}/api/result`, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, result })
        });
        console.log("[BRIDGE] Result sent to server");
    } catch (e) {
        console.error("[BRIDGE] Relay ERROR:", e);
    }
}

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
