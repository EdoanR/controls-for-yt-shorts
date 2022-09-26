importScripts('js/storage_handler.js', 'js/message_handler.js', 'js/handlers.js');

// Check if is not in production mode. This will be used when setting the contexts menu.
const isDevMode = !('update_url' in chrome.runtime.getManifest());

chrome.runtime.onInstalled.addListener(details => {
    CreateContextMenus();
});

// Use this to open option by clicking the extension icon. (Notice: this will not work if the extension has popup.)
// chrome.action.onClicked.addListener((tab) => {
//     chrome.runtime.openOptionsPage();
// });

//#region Context Menus

function CreateContextMenus() {
    if (!isDevMode) return; // The context menus below will be used only on dev mode.

    // Context menu to reload extension.
    chrome.contextMenus.create({
        id: 'reloadExtension',
        title: 'Reload',
        contexts: ['action'] // v3
    });
}

// Adding functionality to the context menus.
chrome.contextMenus.onClicked.addListener( (info, tab) => {
	if (info.menuItemId == 'reloadExtension') {
		
        chrome.runtime.reload();
		return;
	}
});

//#endregion