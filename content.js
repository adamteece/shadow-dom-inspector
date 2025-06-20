// Shadow DOM Inspector Content Script

let isInspecting = false;
let overlayElement = null;
let highlightedElement = null;
let currentElementInfo = null; // Store current element info for copying

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'startInspecting':
            startInspecting();
            break;
        case 'stopInspecting':
            stopInspecting();
            break;
        case 'clearHighlight':
            clearHighlight();
            break;
    }
});

function startInspecting() {
    if (isInspecting) return;
    
    isInspecting = true;
    document.addEventListener('click', handleElementClick, true);
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    
    // Add cursor style
    document.body.style.cursor = 'crosshair';
    
    showMessage('Inspector active! Click on any element to inspect it.');
}

function stopInspecting() {
    if (!isInspecting) return;
    
    isInspecting = false;
    document.removeEventListener('click', handleElementClick, true);
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    
    document.body.style.cursor = '';
    clearHighlight();
    
    // Notify popup that inspector stopped
    chrome.runtime.sendMessage({ action: 'inspectorStopped' });
}

function handleElementClick(event) {
    if (!isInspecting) return;
    
    // Don't inspect if clicking inside the inspector overlay
    if (overlayElement && (event.target === overlayElement || overlayElement.contains(event.target))) {
        return; // Allow normal click behavior in the overlay
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.target;
    inspectElement(element);
}

function handleMouseOver(event) {
    if (!isInspecting) return;
    
    const element = event.target;
    // Don't highlight elements inside the inspector overlay
    if (element !== overlayElement && !overlayElement?.contains(element)) {
        highlightElement(element);
    }
}

function handleMouseOut(event) {
    if (!isInspecting) return;
    
    clearTemporaryHighlight();
}

function highlightElement(element) {
    clearTemporaryHighlight();
    
    if (element && element !== document.body && element !== document.documentElement) {
        element.classList.add('shadow-inspector-highlight');
        highlightedElement = element;
    }
}

function clearTemporaryHighlight() {
    if (highlightedElement) {
        highlightedElement.classList.remove('shadow-inspector-highlight');
        highlightedElement = null;
    }
}

function clearHighlight() {
    clearTemporaryHighlight();
    
    // Remove all highlights
    const highlighted = document.querySelectorAll('.shadow-inspector-highlight');
    highlighted.forEach(el => el.classList.remove('shadow-inspector-highlight'));
}

function inspectElement(element) {
    // Keep the element highlighted
    clearTemporaryHighlight();
    highlightElement(element);
    
    const elementInfo = getElementInfo(element);
    currentElementInfo = elementInfo; // Store for copying
    showInspectorOverlay(elementInfo);
}

function getElementInfo(element) {
    const info = {
        tagName: element.tagName.toLowerCase(),
        id: element.id || 'none',
        classes: element.className ? Array.from(element.classList).join(', ') : 'none',
        attributes: getElementAttributes(element),
        hasShadowRoot: !!element.shadowRoot,
        shadowRootInfo: null,
        textContent: element.textContent ? element.textContent.substring(0, 100) + (element.textContent.length > 100 ? '...' : '') : 'none',
        computedStyles: getRelevantStyles(element)
    };
    
    if (info.hasShadowRoot) {
        info.shadowRootInfo = getShadowRootInfo(element.shadowRoot);
    }
    
    return info;
}

function getElementAttributes(element) {
    const attrs = [];
    for (let attr of element.attributes) {
        attrs.push(`${attr.name}="${attr.value}"`);
    }
    return attrs.length > 0 ? attrs : ['none'];
}

function getRelevantStyles(element) {
    const computed = window.getComputedStyle(element);
    return {
        display: computed.display,
        position: computed.position,
        zIndex: computed.zIndex,
        pointerEvents: computed.pointerEvents,
        visibility: computed.visibility,
        opacity: computed.opacity
    };
}

function getShadowRootInfo(shadowRoot) {
    const info = {
        mode: shadowRoot.mode,
        children: [],
        childCount: shadowRoot.children.length
    };
    
    // Get info about shadow DOM children
    for (let child of shadowRoot.children) {
        info.children.push({
            tagName: child.tagName.toLowerCase(),
            id: child.id || 'none',
            classes: child.className ? Array.from(child.classList).join(', ') : 'none',
            textContent: child.textContent ? child.textContent.substring(0, 50) + (child.textContent.length > 50 ? '...' : '') : 'none'
        });
    }
    
    return info;
}

function showInspectorOverlay(elementInfo) {
    // Remove existing overlay
    if (overlayElement) {
        overlayElement.remove();
    }
    
    overlayElement = document.createElement('div');
    overlayElement.className = 'shadow-inspector-overlay';
    overlayElement.innerHTML = createOverlayContent(elementInfo);
    
    document.body.appendChild(overlayElement);
    
    // Add close button functionality
    const closeBtn = overlayElement.querySelector('.shadow-inspector-close');
    closeBtn.addEventListener('click', () => {
        overlayElement.remove();
        overlayElement = null;
        clearHighlight();
    });
    
    // Add copy button functionality
    const copyButtons = overlayElement.querySelectorAll('.shadow-inspector-copy-btn');
    copyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent any other click handlers
            // The onclick attributes in the HTML will handle the actual copy
        });
    });
}

function createOverlayContent(info) {
    let content = `
        <div class="shadow-inspector-header">
            <span>🔍 Element Inspector</span>
            <button class="shadow-inspector-close">×</button>
        </div>
        <div class="shadow-inspector-content">
            <div class="shadow-inspector-section">
                <h3>📋 Element Details <button class="shadow-inspector-copy-btn" onclick="copyElementDetails()">Copy</button></h3>
                <div class="shadow-inspector-property"><strong>Tag:</strong> &lt;${info.tagName}&gt;</div>
                <div class="shadow-inspector-property"><strong>ID:</strong> ${info.id}</div>
                <div class="shadow-inspector-property"><strong>Classes:</strong> ${info.classes}</div>
                <div class="shadow-inspector-property"><strong>Text:</strong> ${info.textContent}</div>
            </div>
            
            <div class="shadow-inspector-section">
                <h3>🏷️ Attributes <button class="shadow-inspector-copy-btn" onclick="copyAttributes()">Copy</button></h3>
                ${info.attributes.map(attr => `<div class="shadow-inspector-property">${attr}</div>`).join('')}
            </div>
            
            <div class="shadow-inspector-section">
                <h3>🎨 Key Styles <button class="shadow-inspector-copy-btn" onclick="copyStyles()">Copy</button></h3>
                <div class="shadow-inspector-property"><strong>display:</strong> ${info.computedStyles.display}</div>
                <div class="shadow-inspector-property"><strong>position:</strong> ${info.computedStyles.position}</div>
                <div class="shadow-inspector-property"><strong>pointer-events:</strong> ${info.computedStyles.pointerEvents}</div>
                <div class="shadow-inspector-property"><strong>visibility:</strong> ${info.computedStyles.visibility}</div>
                <div class="shadow-inspector-property"><strong>opacity:</strong> ${info.computedStyles.opacity}</div>
            </div>
    `;
    
    if (info.hasShadowRoot) {
        content += `
            <div class="shadow-inspector-section">
                <h3>🌑 Shadow DOM Details <button class="shadow-inspector-copy-btn" onclick="copyShadowDOM()">Copy</button></h3>
                <div class="shadow-inspector-shadow-info">
                    <div class="shadow-inspector-property"><strong>Shadow Root Mode:</strong> ${info.shadowRootInfo.mode}</div>
                    <div class="shadow-inspector-property"><strong>Child Elements:</strong> ${info.shadowRootInfo.childCount}</div>
                </div>
                
                <h4 style="margin: 15px 0 10px 0; color: #28a745; font-size: 13px;">Shadow DOM Children:</h4>
                ${info.shadowRootInfo.children.map(child => `
                    <div class="shadow-inspector-shadow-child">
                        <div><strong>&lt;${child.tagName}&gt;</strong></div>
                        <div>ID: ${child.id}</div>
                        <div>Classes: ${child.classes}</div>
                        <div>Text: ${child.textContent}</div>
                    </div>
                `).join('')}
                
                <div style="margin-top: 15px; padding: 10px; background: #e8f5e8; border-radius: 5px; font-size: 11px;">
                    💡 <strong>For Pendo:</strong> If clicks aren't being tracked, they might be happening on these Shadow DOM elements instead of the main element.
                </div>
            </div>
        `;
    } else {
        content += `
            <div class="shadow-inspector-section">
                <h3>🌑 Shadow DOM Details</h3>
                <div class="shadow-inspector-no-shadow">
                    This element does not have a Shadow DOM
                </div>
            </div>
        `;
    }
    
    content += `
        </div>
    `;
    
    return content;
}

function showMessage(text, duration = 3000) {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        background: #1a73e8 !important;
        color: white !important;
        padding: 10px 20px !important;
        border-radius: 5px !important;
        z-index: 999999 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 14px !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
    `;
    message.textContent = text;
    document.body.appendChild(message);
    
    setTimeout(() => {
        if (message.parentNode) {
            message.remove();
        }
    }, duration);
}

// Initialize
console.log('Shadow DOM Inspector loaded');

// Copy functions for the inspector overlay
window.copyElementDetails = function() {
    if (!currentElementInfo) return;
    
    const text = `Element Details:
Tag: <${currentElementInfo.tagName}>
ID: ${currentElementInfo.id}
Classes: ${currentElementInfo.classes}
Text: ${currentElementInfo.textContent}`;
    
    copyToClipboard(text);
};

window.copyAttributes = function() {
    if (!currentElementInfo) return;
    
    const text = `Attributes:
${currentElementInfo.attributes.join('\n')}`;
    
    copyToClipboard(text);
};

window.copyStyles = function() {
    if (!currentElementInfo) return;
    
    const styles = currentElementInfo.computedStyles;
    const text = `Key Styles:
display: ${styles.display}
position: ${styles.position}
pointer-events: ${styles.pointerEvents}
visibility: ${styles.visibility}
opacity: ${styles.opacity}`;
    
    copyToClipboard(text);
};

window.copyShadowDOM = function() {
    if (!currentElementInfo || !currentElementInfo.hasShadowRoot) return;
    
    const shadow = currentElementInfo.shadowRootInfo;
    let text = `Shadow DOM Details:
Shadow Root Mode: ${shadow.mode}
Child Elements: ${shadow.childCount}

Shadow DOM Children:`;
    
    shadow.children.forEach(child => {
        text += `
<${child.tagName}>
  ID: ${child.id}
  Classes: ${child.classes}
  Text: ${child.textContent}`;
    });
    
    copyToClipboard(text);
};

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showMessage('✅ Copied to clipboard!', 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showMessage('✅ Copied to clipboard!', 2000);
    });
}
