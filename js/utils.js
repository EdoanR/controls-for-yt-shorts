const APP_SHORT_NAME = 'CFYTS';
const IS_DEV = !('update_url' in chrome.runtime.getManifest());

function devLog(...messages) {
  if (!IS_DEV) return;
  console.log(`[${APP_SHORT_NAME}]`, ...messages);
}

function log(...messages) {
  console.log(`[${APP_SHORT_NAME}]`, ...messages);
}

function isShortsPage() {
  return location.href.includes('/shorts/');
}

function isUserTyping() {
  return (
    (document.activeElement.tagName === 'INPUT' &&
      document.activeElement.type === 'text') ||
    document.activeElement.tagName === 'TEXTAREA' ||
    document.activeElement.tagName === 'SELECT' ||
    document.activeElement.getAttribute('contenteditable') === 'true'
  );
}

function isExtensionDisabledOrReloaded() {
  return !chrome.runtime.id;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  const minutesFormatted = minutes.toString().padStart(2, '0');
  const secondsFormatted = seconds.toString().padStart(2, '0');

  return `${minutesFormatted}:${secondsFormatted}`;
}
