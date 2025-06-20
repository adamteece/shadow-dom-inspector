let isInspecting = false;

document.getElementById('toggleInspector').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (isInspecting) {
        // Stop inspecting
        await chrome.tabs.sendMessage(tab.id, { action: 'stopInspecting' });
        updateUI(false);
    } else {
        // Start inspecting
        await chrome.tabs.sendMessage(tab.id, { action: 'startInspecting' });
        updateUI(true);
    }
});

document.getElementById('clearHighlight').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { action: 'clearHighlight' });
});

function updateUI(inspecting) {
    isInspecting = inspecting;
    const button = document.getElementById('toggleInspector');
    const status = document.getElementById('status');
    
    if (inspecting) {
        button.textContent = 'Stop Inspecting';
        status.textContent = 'Inspector active - Click elements to inspect';
        status.className = 'status active';
    } else {
        button.textContent = 'Start Inspecting';
        status.textContent = 'Inspector inactive';
        status.className = 'status inactive';
    }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'inspectorStopped') {
        updateUI(false);
    }
});
