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
    if (overlayElement) {
        // If overlay already exists, just update its content and preserve position
        const contentDiv = overlayElement.querySelector('.shadow-inspector-content');
        if (contentDiv) {
            // Update only the content, keeping the header with drag functionality
            contentDiv.innerHTML = createOverlayContentBody(elementInfo);
            
            // Re-attach copy button functionality to new buttons
            const copyButtons = overlayElement.querySelectorAll('.shadow-inspector-copy-btn');
            copyButtons.forEach(btn => {
                // Remove any existing listeners to avoid duplicates
                btn.replaceWith(btn.cloneNode(true));
            });
            
            // Re-add copy button functionality
            const newCopyButtons = overlayElement.querySelectorAll('.shadow-inspector-copy-btn');
            newCopyButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const copyType = btn.getAttribute('data-copy-type');
                    handleCopy(copyType);
                });
            });
            
            return; // Exit early, don't create new overlay
        }
    }
    
    // Create new overlay (first time or if something went wrong)
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
            const copyType = btn.getAttribute('data-copy-type');
            handleCopy(copyType);
        });
    });
    
    // Add drag functionality
    makeDraggable(overlayElement);
}

function createOverlayContent(info) {
    let content = `
        <div class="shadow-inspector-header">
            <div class="shadow-inspector-drag-handle">
                <span class="shadow-inspector-drag-icon">⋮⋮</span>
                <span>🔍 Element Inspector</span>
            </div>
            <button class="shadow-inspector-close">×</button>
        </div>
        <div class="shadow-inspector-content">
            ${createOverlayContentBody(info)}
        </div>
    `;
    
    return content;
}

function createOverlayContentBody(info) {
    let content = `
        <div class="shadow-inspector-section">
            <h3>📋 Element Details <button class="shadow-inspector-copy-btn" data-copy-type="element" aria-label="Copy element details">Copy</button></h3>
            <div class="shadow-inspector-property"><strong>Tag:</strong> &lt;${info.tagName}&gt;</div>
            <div class="shadow-inspector-property"><strong>ID:</strong> ${info.id}</div>
            <div class="shadow-inspector-property"><strong>Classes:</strong> ${info.classes}</div>
            <div class="shadow-inspector-property"><strong>Text:</strong> ${info.textContent}</div>
        </div>
        
        <div class="shadow-inspector-section">
            <h3>🏷️ Attributes <button class="shadow-inspector-copy-btn" data-copy-type="attributes">Copy</button></h3>
            ${info.attributes.map(attr => `<div class="shadow-inspector-property">${attr}</div>`).join('')}
        </div>
        
        <div class="shadow-inspector-section">
            <h3>🎨 Key Styles <button class="shadow-inspector-copy-btn" data-copy-type="styles">Copy</button></h3>
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
                <h3>🌑 Shadow DOM Details <button class="shadow-inspector-copy-btn" data-copy-type="shadow">Copy</button></h3>
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

// Handle copy functionality
function handleCopy(copyType) {
    if (!currentElementInfo) return;
    
    let text = '';
    
    switch (copyType) {
        case 'element':
            text = `Element Details:
Tag: <${currentElementInfo.tagName}>
ID: ${currentElementInfo.id}
Classes: ${currentElementInfo.classes}
Text: ${currentElementInfo.textContent}`;
            break;
            
        case 'attributes':
            text = `Attributes:
${currentElementInfo.attributes.join('\n')}`;
            break;
            
        case 'styles':
            const styles = currentElementInfo.computedStyles;
            text = `Key Styles:
display: ${styles.display}
position: ${styles.position}
pointer-events: ${styles.pointerEvents}
visibility: ${styles.visibility}
opacity: ${styles.opacity}`;
            break;
            
        case 'shadow':
            if (currentElementInfo.hasShadowRoot) {
                const shadow = currentElementInfo.shadowRootInfo;
                text = `Shadow DOM Details:
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
            } else {
                text = 'This element does not have a Shadow DOM';
            }
            break;
    }
    
    copyToClipboard(text);
}

function copyToClipboard(text) {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showMessage('✅ Copied to clipboard!', 2000);
        }).catch((err) => {
            console.error('Clipboard write failed:', err);
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            showMessage('✅ Copied to clipboard!', 2000);
        } else {
            showMessage('❌ Copy failed - please select text manually', 3000);
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showMessage('❌ Copy failed - please select text manually', 3000);
    }
}

// Make the inspector overlay draggable
function makeDraggable(element) {
    const header = element.querySelector('.shadow-inspector-header');
    const dragHandle = element.querySelector('.shadow-inspector-drag-handle');
    
    if (!header || !dragHandle) return;
    
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    // Prevent text selection during drag
    const preventSelection = (e) => {
        e.preventDefault();
        return false;
    };
    
    dragHandle.addEventListener('mousedown', (e) => {
        // Don't start drag if clicking on close button
        if (e.target.closest('.shadow-inspector-close')) return;
        
        isDragging = true;
        element.classList.add('dragging');
        
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = element.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        
        // Prevent text selection during drag
        document.addEventListener('selectstart', preventSelection);
        document.addEventListener('dragstart', preventSelection);
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        e.preventDefault();
    });
    
    function handleMouseMove(e) {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        let newLeft = startLeft + deltaX;
        let newTop = startTop + deltaY;
        
        // Keep the overlay within viewport bounds
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const elementWidth = element.offsetWidth;
        const elementHeight = element.offsetHeight;
        
        // Constrain to viewport
        newLeft = Math.max(10, Math.min(newLeft, viewportWidth - elementWidth - 10));
        newTop = Math.max(10, Math.min(newTop, viewportHeight - elementHeight - 10));
        
        element.style.left = newLeft + 'px';
        element.style.top = newTop + 'px';
        element.style.right = 'auto'; // Remove right positioning
        
        e.preventDefault();
    }
    
    function handleMouseUp(e) {
        if (!isDragging) return;
        
        isDragging = false;
        element.classList.remove('dragging');
        
        // Remove event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('selectstart', preventSelection);
        document.removeEventListener('dragstart', preventSelection);
        
        e.preventDefault();
    }
    
    // Also handle touch events for mobile devices
    dragHandle.addEventListener('touchstart', (e) => {
        if (e.target.closest('.shadow-inspector-close')) return;
        
        const touch = e.touches[0];
        isDragging = true;
        element.classList.add('dragging');
        
        startX = touch.clientX;
        startY = touch.clientY;
        const rect = element.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        
        e.preventDefault();
    });
    
    function handleTouchMove(e) {
        if (!isDragging) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        let newLeft = startLeft + deltaX;
        let newTop = startTop + deltaY;
        
        // Keep within viewport bounds
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const elementWidth = element.offsetWidth;
        const elementHeight = element.offsetHeight;
        
        newLeft = Math.max(10, Math.min(newLeft, viewportWidth - elementWidth - 10));
        newTop = Math.max(10, Math.min(newTop, viewportHeight - elementHeight - 10));
        
        element.style.left = newLeft + 'px';
        element.style.top = newTop + 'px';
        element.style.right = 'auto';
        
        e.preventDefault();
    }
    
    function handleTouchEnd(e) {
        if (!isDragging) return;
        
        isDragging = false;
        element.classList.remove('dragging');
        
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        
        e.preventDefault();
    }
}
