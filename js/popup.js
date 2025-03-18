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
const hideDefaultControlsCheckbox = document.querySelector(
  '#hide_default_controls',
);
const disableInfiniteLoopCheckbox = document.querySelector(
  '#disable_inifinite_loop',
);
const showViewCountCheckbox = document.querySelector(
  '#show_view_count',
);

// Load options values.
chrome.storage.sync
  .get({
    enabled: true,
    controlAlwaysVisible: false,
    hideVideoInfo: false,
    controlVolumeWithArrows: false,
    disableInfiniteLoop: false,
    hideDefaultControls: true,
    showViewCount: true,
  })
  .then((items) => {
    enabledCheckBox.checked = items.enabled;
    alwaysVisibleCheckbox.checked = items.controlAlwaysVisible;
    hideVideoInfoCheckbox.checked = items.hideVideoInfo;
    controlVolumeArrowCheckbox.checked = items.controlVolumeWithArrows;
    hideDefaultControlsCheckbox.checked = items.hideDefaultControls;
    disableInfiniteLoopCheckbox.checked = items.disableInfiniteLoop;
    showViewCountCheckbox.checked = items.showViewCount;

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

hideDefaultControlsCheckbox.addEventListener('change', (e) => {
  chrome.storage.sync.set({
    hideDefaultControls: hideDefaultControlsCheckbox.checked,
  });
});

disableInfiniteLoopCheckbox.addEventListener('change', (e) => {
  chrome.storage.sync.set({
    disableInfiniteLoop: disableInfiniteLoopCheckbox.checked,
  });
});

showViewCountCheckbox.addEventListener('change', (e) => {
  chrome.storage.sync.set({
    showViewCount: showViewCountCheckbox.checked,
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
