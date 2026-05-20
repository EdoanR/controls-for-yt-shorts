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

    const shortsVolumeControlClassName = 'desktop-shorts-volume-controls';
    const shortsVolumeSliderClasses = [
      'ytdDesktopShortsVolumeControlsNativeSlider',
      'ytdVolumeControlsNativeSlider',
    ];
    const shortsMuteButtonClasses = [
      'ytdDesktopShortsVolumeControlsMuteIconButton',
      'ytdVolumeControlsMuteIconButton',
    ];
    const shortsFullscreenButtonContainerId = 'fullscreen-button-shape';
    const ytShortsPageTagName = 'ytd-shorts';

    /** @type {HTMLVideoElement | null} */
    let shortsVideo = null;
    /** @type {HTMLElement | null} */
    let shortVideoContainer = null;
    /** @type {HTMLInputElement | null} */
    let shortsVolumeSlider = null;
    /** @type {HTMLButtonElement | null} */
    let shortsMuteButton = null;
    /** @type {HTMLButtonElement | null} */
    let shortsFullScreenButton = null;

    let addedMenuButtonClickListener = false;

    let ytShortsPageElement = document.querySelector(ytShortsPageTagName);
    if (ytShortsPageElement) applyConfig();

    const observableElement =
      document.querySelector(
        '#shorts-container, ytd-shorts, ytd-page-manager',
      ) || document.body;

    checkForMuteButton();
    checkForVolumeSlider();
    checkForFullScreenButton();
    checkForVideoAndContainer();
    addMenuButton();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const addedNode of mutation.addedNodes) {
          if (!addedNode.tagName) continue;

          /** @type {HTMLElement} */
          const element = addedNode;

          if (IS_DEV) element.setAttribute('node-added', '');

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

          if (
            element.id === 'button-bar' ||
            element.tagName.toLowerCase() === 'ytd-reel-video-renderer' ||
            element.tagName.toLowerCase() === 'reel-action-bar-view-model' ||
            (element.querySelector && element.querySelector('reel-action-bar-view-model'))
          ) {
            addMenuButton();
          }

          checkForMuteButton();
          checkForVolumeSlider();
          checkForFullScreenButton(element);
          checkForVideoAndContainer(element);
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

        const disableInfiniteLoop = items.enabled && items.disableInfiniteLoop;

        if (player.disableInfiniteLoop !== disableInfiniteLoop) {
          player.disableInfiniteLoop = disableInfiniteLoop;
          player.applyLoopingSetting();
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

    function checkForVideoAndContainer() {
      if (player || (shortsVideo && shortVideoContainer)) return;

      const container = document.querySelector(
        '#shorts-container ytd-player #container .html5-video-player',
      );
      if (!container) return;

      const video = container.querySelector('video');
      if (!video) return;

      shortsVideo = video;
      shortVideoContainer = container;

      devLog('video and container found', video, container);

      createPlayerWhenAllElementFound();
    }

    function checkForMuteButton() {
      const element = document.querySelector(
        `.${shortsMuteButtonClasses.join(', .')}`,
      );
      if (!element || element.hasAttribute('cfyts-mute-button')) return;

      shortsMuteButton = element;
      // add attribute so we can check if is the same element later.
      shortsMuteButton.setAttribute('cfyts-mute-button', '');
      devLog('mute button found', shortsMuteButton);

      if (player) {
        // update volume controls.
        player.setNewShortVolumeControls(shortsMuteButton, shortsVolumeSlider);
      } else {
        // try to create player.
        createPlayerWhenAllElementFound();
      }
    }

    function checkForVolumeSlider() {
      const element = document.querySelector(
        `.${shortsVolumeSliderClasses.join(', .')}`,
      );
      if (!element || element.hasAttribute('cfyts-volume-slider')) return;

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
      // add attribute so we can check if is the same element later.
      shortsVolumeSlider.setAttribute('cfyts-volume-slider', '');
      devLog('volume slider found', shortsVolumeSlider);

      attrObserver.observe(element, {
        childList: false,
        subtree: false,
        attributes: true,
        attributeFilter: ['style'],
        attributeOldValue: true,
      });

      if (
        player &&
        shortsMuteButton &&
        shortsMuteButton.hasAttribute('cfyts-mute-button')
      ) {
        // update volume controls.
        player.setNewShortVolumeControls(shortsMuteButton, shortsVolumeSlider);
      } else {
        // try to create player.
        createPlayerWhenAllElementFound();
      }
    }

    function checkForFullScreenButton() {
      const element = document.querySelector(
        `#${shortsFullscreenButtonContainerId} button`,
      );
      if (!element || element.hasAttribute('cfyts-full-screen-button')) return;

      shortsFullScreenButton = element;
      // add attribute so we can check if is the same element later.
      shortsFullScreenButton.setAttribute('cfyts-full-screen-button', '');

      // new full screen button found, update the one from the player.
      if (player) {
        player.setYTShortsFullscreenButton(shortsFullScreenButton);
      } else {
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
        shortsFullScreenButton,
        items.controlVolumeWithArrows,
        items.enabled,
        items.disableInfiniteLoop,
      );

      devLog('player added.');
    }

    function addMenuButton() {
      const allActionBars = document.querySelectorAll(
        'ytd-reel-video-renderer reel-action-bar-view-model, ytd-reel-video-renderer #button-bar',
      );

      allActionBars.forEach((actionButtons) => {
        let menuButton = actionButtons.querySelector('.cfyts-menu-button');

        if (!menuButton) {
          menuButton = document.createElement('button');
          menuButton.textContent = 'Menu';
          menuButton.className =
            'cfyts-menu-button ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeL ytSpecButtonShapeNextIconButton ytSpecButtonShapeNextEnableBackdropFilterExperiment';

          // add the three dots icon.
          menuButton.innerHTML = `
          <div aria-hidden="true" class="yt-spec-button-shape-next__icon" ><span class="ytIconWrapperHost" style="width: 24px; height: 24px;"><span class="yt-icon-shape ytSpecIconShapeHost"><div style="width: 100%; height: 100%; display: block; filter: drop-shadow(0px 1px 4px rgba(0, 0, 0, 0.3)); fill: currentcolor;" ><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: inherit; width: 100%; height: 100%;"><path d="M12 4a2 2 0 100 4 2 2 0 000-4Zm0 6a2 2 0 100 4 2 2 0 000-4Zm0 6a2 2 0 100 4 2 2 0 000-4Z"></path></svg></div></span></span></div>
          `;

          // Depending on the DOM structure, wrap it if necessary to maintain layout.
          if (
            actionButtons.tagName.toLowerCase() === 'reel-action-bar-view-model'
          ) {
            const wrapper = document.createElement('button-view-model');
            wrapper.className =
              'ytSpecButtonViewModelHost ytwReelActionBarViewModelHostDesktopActionButton cfyts-menu-button-wrapper';
            const label = document.createElement('label');
            label.className = 'ytSpecButtonShapeWithLabelHost';
            label.appendChild(menuButton);
            wrapper.appendChild(label);
            actionButtons.insertAdjacentElement('afterbegin', wrapper);
          } else {
            actionButtons.insertAdjacentElement('afterbegin', menuButton);
          }

          menuButton.addEventListener('click', () => {
            if (isExtensionDisabledOrReloaded()) return;
            const originalMenuButton = actionButtons
              .closest('ytd-reel-video-renderer')
              .querySelector(
                '#menu-button button, ytd-shorts-player-controls #menu-button button',
              );

            if (!originalMenuButton) return alert('Something went wrong!');
            originalMenuButton.click();
          });
        }
      });
    }
  });
