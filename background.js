
// Send a message for a tab when it's url update.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!changeInfo.url) return;

    chrome.tabs.sendMessage(tabId, { 
        type: 'url update', 
        newUrl: changeInfo.url 
    }).catch(err => {}); 

});

chrome.storage.sync.get({ enabled: true }).then(items => {
    updateAllTabIcons(items.enabled);
});

chrome.storage.sync.onChanged.addListener(changes => {
    if (!changes.enabled) return;

    updateAllTabIcons(changes.enabled.newValue);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!changeInfo.url) return;

    chrome.storage.sync.get({ enabled: true }).then(items => {
        updateTabIcon(tab, items.enabled);
    })
});

function updateAllTabIcons(enabled) {
    chrome.tabs.query({}).then(tabs => {
        for (const tab of tabs) {
            updateTabIcon(tab, enabled);
        }
    }).catch(err => {
        console.log('Could not query tabs', err);
    });
}

/** @param {chrome.tabs.Tab} tab @param {boolean} enabled */
function updateTabIcon(tab, enabled = true) {
    if (!tab || !tab.id) return;

    const tabId = tab.id;
    const setIcon = (iconName) => {
        chrome.action.setIcon({
            path: {
                '16': `images/icons/${iconName}-16.png`,
                '48': `images/icons/${iconName}-48.png`,
                '128': `images/icons/${iconName}-128.png`
            }, 
            tabId
        }).catch(err => {
            console.log(`Could not add icon to the tab ${tabId}`, err);
        });
    }

    if (tab.url && /\/shorts\//.test(tab.url)) {
        setIcon(enabled ? 'normal/icon' : 'paused/icon_pause');
    } else {
        setIcon(enabled ? 'normal/icon2' : 'paused/icon_pause2');
    }

}