// Get options elements.
const enabledStateText = document.querySelector('#enabled_text');
const enabledCheckBox = document.querySelector('#enabled');

const alwaysVisibleCheckbox = document.querySelector(
  '#controls_always_visible',
);
const hideVideoInfoCheckbox = document.querySelector('#hide_video_info');
const controlVolumeArrowCheckbox = document.querySelector(
  '#control_volume_arrow',
);

// Load options values.
chrome.storage.sync
  .get({
    enabled: true,
    controlAlwaysVisible: false,
    hideVideoInfo: false,
    controlVolumeWithArrows: false,
  })
  .then((items) => {
    enabledCheckBox.checked = items.enabled;
    alwaysVisibleCheckbox.checked = items.controlAlwaysVisible;
    hideVideoInfoCheckbox.checked = items.hideVideoInfo;
    controlVolumeArrowCheckbox.checked = items.controlVolumeWithArrows;

    updateText();
  });

// listen for options changes and save it.
enabledCheckBox.addEventListener('change', (e) => {
  chrome.storage.sync.set({ enabled: enabledCheckBox.checked });
  updateText();
});

alwaysVisibleCheckbox.addEventListener('change', (e) => {
  chrome.storage.sync.set({
    controlAlwaysVisible: alwaysVisibleCheckbox.checked,
  });
});

hideVideoInfoCheckbox.addEventListener('change', (e) => {
  chrome.storage.sync.set({ hideVideoInfo: hideVideoInfoCheckbox.checked });
});

controlVolumeArrowCheckbox.addEventListener('change', (e) => {
  chrome.storage.sync.set({
    controlVolumeWithArrows: controlVolumeArrowCheckbox.checked,
  });
});

if (i18n('ThisLanguage') === 'pt_BR') {
  // show pix only for Brazil.
  document.querySelector('#pix').classList.remove('hide');
}

// update enabled/disabled text.
function updateText() {
  enabledStateText.textContent = enabledCheckBox.checked
    ? i18n('Enabled')
    : i18n('Disabled');
}
