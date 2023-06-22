
const enabledStateText = document.querySelector('#enabled_text');
const enabledCheckBox = document.querySelector('#enabled');

chrome.storage.sync.get({ enabled: true }).then(items => {
    enabledCheckBox.checked = items.enabled;
    updateText();
});

enabledCheckBox.addEventListener('change', e => {
    chrome.storage.sync.set({ enabled: enabledCheckBox.checked });
    updateText();
});

if (i18n('ThisLanguage') === 'pt_BR') {
    // show pix only for Brazil.
    document.querySelector('#pix').classList.remove('hide');
}

function updateText() {
    enabledStateText.textContent = enabledCheckBox.checked ? i18n('Enabled') : i18n('Disabled');
}