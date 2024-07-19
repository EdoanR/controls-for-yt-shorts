chrome.runtime.onInstalled.addListener(addContentScriptToTabs);

function addContentScriptToTabs() {
  // dinamically add content scripts on install.
  chrome.tabs
    .query({})
    .then((tabs) => {
      for (const tab of tabs) {
        // only for youtube urls.
        if (!tab.url || !tab.url.match(/https:\/\/(www\.)?youtube\.com\//))
          continue;

        // add css first.
        chrome.scripting
          .insertCSS({
            target: { tabId: tab.id },
            files: ['css/content_script.css'],
          })
          .then(() => {
            // add js files.

            chrome.scripting
              .executeScript({
                target: { tabId: tab.id },
                files: [
                  'libs/mutation_summary.js',
                  'libs/fluidplayer.min.js',
                  'js/observer.js',
                  'js/utils.js',
                  'js/content_script.js',
                ],
              })
              .catch((err) => {
                console.log(
                  `Could not add content scripts to the tab ${tab.id}`,
                  err,
                );
              });
          })
          .catch((err) => {
            console.log(`Could not add css files to the tab ${tab.id}`, err);
          });
      }
    })
    .catch((err) => {
      console.log('Could not query tabs', err);
    });
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
