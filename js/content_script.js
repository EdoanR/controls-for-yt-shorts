devLog('content script started.');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // background script is checking connection with content script.
  if (message === 'connected') sendResponse(true);
});

chrome.storage.sync
  .get({
    enabled: true,
    controlAlwaysVisible: false,
    hideVideoInfo: false,
    controlVolumeWithArrows: false,
    disableInfiniteLoop: false,
    hideDefaultControls: true,
  })
  .then((items) => {
    /** @type {YTShortsPlayer | null} */
    let player = null;

    const shortVideoSelector = '#shorts-container video';
    const shortsVolumeControlClassName = 'desktop-shorts-volume-controls';
    const shortsVolumeSliderClassName =
      'YtdDesktopShortsVolumeControlsNativeSlider';
    const shortsMuteButtonClassName =
      'YtdDesktopShortsVolumeControlsMuteIconButton';
    const ytShortsPageTagName = 'ytd-shorts';

    /** @type {HTMLVideoElement | null} */
    let shortsVideo = null;
    /** @type {HTMLElement | null} */
    let shortVideoContainer = null;
    /** @type {HTMLInputElement | null} */
    let shortsVolumeSlider = null;
    /** @type {HTMLButtonElement | null} */
    let shortsMuteButton = null;

    let ytShortsPageElement = document.querySelector(ytShortsPageTagName);
    if (ytShortsPageElement) applyConfig();

    const observableElement =
      document.querySelector(
        '#shorts-container, ytd-shorts, ytd-page-manager',
      ) || document.body;

    checkForMuteButton();
    checkForVolumeSlider();
    checkForVideoAndContainer();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const addedNode of mutation.addedNodes) {
          if (!addedNode.tagName) continue;

          /** @type {HTMLElement} */
          const element = addedNode;

          if (element.tagName === shortsVolumeControlClassName.toUpperCase()) {
            shortsVolumeSlider = null;
            shortsMuteButton = null;
            devLog('controls reset');
          }

          if (element.tagName === ytShortsPageTagName.toUpperCase()) {
            ytShortsPageElement = element;
            devLog('yt shorts page element found');
            applyConfig();
          }

          checkForVideoAndContainer(element);
          checkForMuteButton(element);
          checkForVolumeSlider(element);
        }
      }
    });

    observer.observe(observableElement, {
      subtree: true,
      childList: true,
    });

    devLog('observing element...', observableElement);

    chrome.storage.sync.onChanged.addListener((changes) => {
      for (const key in changes) {
        items[key] = changes[key].newValue;
      }

      applyConfig();
    });

    function applyConfig() {
      if (player) {
        player.controlVolumeWithArrows = items.controlVolumeWithArrows;
        player.enabled = items.enabled;
        if (player.disableInfiniteLoop !== items.disableInfiniteLoop) {
          player.disableInfiniteLoop = items.disableInfiniteLoop;
          player.applyLoopingSetting()
        }
      }

      if (!ytShortsPageElement) return;

      ytShortsPageElement.setAttribute(
        'cfyts-enabled',
        items.enabled.toString(),
      );

      ytShortsPageElement.setAttribute(
        'cfyts-always-visible',
        items.controlAlwaysVisible.toString(),
      );

      ytShortsPageElement.setAttribute(
        'cfyts-hide-info',
        items.hideVideoInfo.toString(),
      );

      ytShortsPageElement.setAttribute(
        'cfyts-hide-default-controls',
        items.hideDefaultControls.toString(),
      );
    }

    /** @param {HTMLElement} [ element ] */
    function checkForVideoAndContainer(element) {
      const video = element
        ? element.querySelector('video')
        : document.querySelector(shortVideoSelector);

      if (!video) return;
      shortsVideo = video;

      if (player) {
        devLog('looping disabled for new video element', video);
        player.disableLoopingIfNeeded(video);
        return;
      }
      const container = document.querySelector(
        '#shorts-container ytd-player #container .html5-video-player',
      );

      devLog('video found?', video, container);
      if (!video || !container) return;

      shortVideoContainer = container;

      createPlayerWhenAllElementFound();
    }

    /** @param {HTMLElement} [ element ] */
    function checkForMuteButton(element) {
      if (!element)
        element = document.querySelector(`.${shortsMuteButtonClassName}`);
      if (!element) return;
      if (shortsMuteButton) return;
      if (element.className !== shortsMuteButtonClassName) return;

      shortsMuteButton = element;
      devLog('mute button found', shortsMuteButton);

      if (player && shortsVolumeSlider) {
        // update volume controls.
        player.setNewShortVolumeControls(shortsMuteButton, shortsVolumeSlider);
      } else {
        // try to create player.
        createPlayerWhenAllElementFound();
      }
    }

    /** @param {HTMLElement} [ element ] */
    function checkForVolumeSlider(element) {
      if (!element)
        element = document.querySelector(`.${shortsVolumeSliderClassName}`);
      if (!element) return;
      if (shortsVolumeSlider) return;
      if (element.className !== shortsVolumeSliderClassName) return;

      const attrObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.attributeName === 'style' && !mutation.oldValue) {
            if (!player) return;

            const styleAttr = element.getAttribute('style');
            const percentMatch = styleAttr.match(/\d+%/);
            const percent = percentMatch ? parseInt(percentMatch[0]) : null;

            if (percent === null)
              return devLog(
                'could not get gradient percent from shorts volume slider.',
              );

            player.setVolumeSliderInitialVolumeChange(percent);
            attrObserver.disconnect();
          }
        }
      });

      shortsVolumeSlider = element;
      devLog('volume slider found', shortsVolumeSlider);

      attrObserver.observe(element, {
        childList: false,
        subtree: false,
        attributes: true,
        attributeFilter: ['style'],
        attributeOldValue: true,
      });

      if (player && shortsMuteButton) {
        // update volume controls.
        player.setNewShortVolumeControls(shortsMuteButton, shortsVolumeSlider);
      } else {
        // try to create player.
        createPlayerWhenAllElementFound();
      }
    }

    function createPlayerWhenAllElementFound() {
      if (!shortsVideo) return;
      if (!shortVideoContainer) return;
      if (!shortsMuteButton) return;
      if (!shortsVolumeSlider) return;

      player = new YTShortsPlayer(
        shortsVideo,
        shortVideoContainer,
        shortsMuteButton,
        shortsVolumeSlider,
        items.controlVolumeWithArrows,
        items.enabled,
        items.disableInfiniteLoop,
      );

      devLog('player added.');
    }
  });
