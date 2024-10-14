addContentScriptToTabs();

// dinamically add content scripts on install.
async function addContentScriptToTabs() {
  const youtubeUrlPattern = '*://*.youtube.com/*';
  const contentScripts = chrome.runtime.getManifest().content_scripts;
  if (!contentScripts || !contentScripts.length) return;

  const ytContentScript = contentScripts.find((cs) =>
    cs.matches.includes(youtubeUrlPattern),
  );

  if (!ytContentScript) return;

  const cssFiles = ytContentScript.css || [];
  const jsFiles = ytContentScript.js || [];

  try {
    const tabs = await chrome.tabs.query({ url: youtubeUrlPattern });

    for (const tab of tabs) {
      // check if already has content script.
      const isTabConnected = await chrome.tabs
        .sendMessage(tab.id, 'connected')
        .catch((err) => false);

      if (isTabConnected) continue; // tab has content script, skip it.

      if (cssFiles.length) {
        // add css.
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: cssFiles,
        });
      }

      if (jsFiles.length) {
        // add js.
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: jsFiles,
        });
      }
    }
  } catch (err) {
    console.log('Could not inject script into youtube tabs', err);
  }
}

// Send a message for a tab when it's url update.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;

  chrome.tabs
    .sendMessage(tabId, {
      type: 'url update',
      newUrl: changeInfo.url,
    })
    .catch((err) => {});
});

chrome.storage.sync.get({ enabled: true }).then((items) => {
  updateAllTabIcons(items.enabled);
});

chrome.storage.sync.onChanged.addListener((changes) => {
  if (!changes.enabled) return;

  updateAllTabIcons(changes.enabled.newValue);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;

  chrome.storage.sync.get({ enabled: true }).then((items) => {
    updateTabIcon(tab, items.enabled);
  });
});

function updateAllTabIcons(enabled) {
  chrome.tabs
    .query({})
    .then((tabs) => {
      for (const tab of tabs) {
        updateTabIcon(tab, enabled);
      }
    })
    .catch((err) => {
      console.log('Could not query tabs', err);
    });
}

/** @param {chrome.tabs.Tab} tab @param {boolean} enabled */
function updateTabIcon(tab, enabled = true) {
  if (!tab || !tab.id) return;

  const tabId = tab.id;
  const setIcon = (iconName) => {
    chrome.action
      .setIcon({
        path: {
          16: `images/icons/${iconName}-16.png`,
          48: `images/icons/${iconName}-48.png`,
          128: `images/icons/${iconName}-128.png`,
        },
        tabId,
      })
      .catch((err) => {
        console.log(`Could not add icon to the tab ${tabId}`, err);
      });
  };

  setIcon(enabled ? 'normal/icon' : 'paused/icon_pause');
}
