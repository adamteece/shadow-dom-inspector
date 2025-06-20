# Shadow DOM Inspector Extension

A powerful browser extension designed to help debug Pendo tracking issues by inspecting elements and their Shadow DOM details.

## 🎯 Purpose

This extension is specifically designed to help identify why Pendo might not be tracking clicks on certain elements. Often, clicks that appear to be on a regular DOM element are actually happening on Shadow DOM elements, which can cause tracking issues.

## ✨ Features

- **Element Inspection**: Click on any element to see detailed information
- **Shadow DOM Detection**: Automatically detects and displays Shadow DOM details
- **Comprehensive Element Info**: Shows tag names, IDs, classes, attributes, and key CSS properties
- **Shadow DOM Children**: Lists all child elements within Shadow DOM
- **Visual Highlighting**: Highlights inspected elements for easy identification
- **Pendo-Specific Insights**: Provides context about why elements might not be tracked

## 🚀 Installation

### For Chrome/Edge:

1. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the folder containing this extension
5. The extension should now appear in your extensions list

### For Firefox:

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this folder
5. The extension will be loaded temporarily

## 📖 How to Use

1. **Activate Inspector**: Click the extension icon in your browser toolbar and click "Start Inspecting"
2. **Inspect Elements**: Click on any element on the webpage you want to inspect
3. **View Details**: A detailed inspector panel will appear showing:
   - Element tag, ID, classes, and attributes
   - Key CSS properties that affect visibility and interaction
   - Shadow DOM information (if present)
   - All Shadow DOM child elements
4. **Understand Tracking Issues**: The extension provides specific insights about why Pendo might not track certain elements

## 🔍 Understanding the Results

### Regular DOM Elements
- Shows standard HTML attributes and properties
- Displays computed styles that affect element interaction

### Shadow DOM Elements
- **Shadow Root Mode**: Shows if it's "open" or "closed"
- **Child Elements**: Lists all elements inside the Shadow DOM
- **Tracking Insight**: Explains why these elements might not be tracked by Pendo

## 🛠️ Common Pendo Tracking Issues

This extension helps identify these common scenarios:

1. **Shadow DOM Clicks**: The actual click target is inside a Shadow DOM, not the visible element
2. **Pointer Events**: Elements with `pointer-events: none` won't receive clicks
3. **Invisible Elements**: Elements with `opacity: 0` or `visibility: hidden`
4. **Layered Elements**: Elements covered by other elements with higher z-index

## 🎨 Features Highlights

- **Real-time Inspection**: Hover over elements to see them highlighted
- **Comprehensive Data**: Shows all relevant information for debugging
- **Clean Interface**: Easy-to-read inspector panel
- **Shadow DOM Visualization**: Clear display of Shadow DOM structure
- **Pendo-Specific Tips**: Contextual help for tracking issues

## 📝 Tips for Pendo Users

1. **Check Shadow DOM**: If an element isn't being tracked, check if it has Shadow DOM children
2. **Verify Pointer Events**: Ensure the element can receive pointer events
3. **Check Element Hierarchy**: Sometimes the trackable element is a parent or child
4. **Test Click Targets**: Use the extension to see exactly which element receives clicks

## 🔧 Technical Details

- **Manifest Version**: 3 (Chrome Extension Manifest V3)
- **Permissions**: Only requires `activeTab` and `scripting` permissions
- **Compatibility**: Works with all modern browsers that support Manifest V3
- **Performance**: Lightweight with minimal impact on page performance

## 🚨 Troubleshooting

If the extension doesn't work:

1. Make sure you've enabled "Developer mode" in your browser's extension settings
2. Check that the extension is loaded and enabled
3. Refresh the webpage after installing the extension
4. Try clicking the extension icon to activate the inspector

## 🔄 Updates

To update the extension:
1. Make changes to the files
2. Go to your browser's extensions page
3. Click the refresh icon next to the extension
4. The updated version will be loaded

---

**Perfect for debugging Pendo tracking issues and understanding Shadow DOM behavior!** 🎯
