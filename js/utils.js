
const APP_SHORT_NAME = 'CFYTS';
const IS_DEV = !('update_url' in chrome.runtime.getManifest());

function debugLog(...messages) {
    if (!IS_DEV) return;
    console.log(`[${APP_SHORT_NAME}]`, ...messages);
}

function log(...messages) {
    console.log(`[${APP_SHORT_NAME}]`, ...messages);
}