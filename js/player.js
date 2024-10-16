class YTShortsPlayer {
  /**
   * @param {HTMLVideoElement} video
   * @param {HTMLElement} container
   * @param {HTMLButtonElement} shortsMuteButton
   * @param {HTMLInputElement} shortsVolumeSlider
   * */
  constructor(
    video,
    container,
    shortsMuteButton,
    shortsVolumeSlider,
    controlVolumeWithArrows = false,
    enabled = true,
  ) {
    this.video = video;
    this.container = container;
    this.shortsMuteButton = shortsMuteButton;
    this.shortsVolumeSlider = shortsVolumeSlider;
    this.controlVolumeWithArrows = controlVolumeWithArrows;
    this.enabled = enabled;

    /** @type {(muteButton: HTMLButtonElement, volumeSlider: HTMLInputElement) => void | null} */
    this.onNewShortVolumeControls = null;

    /** @type {(volumePercent: number) => void | null} */
    this.onInitialVolumePercent = null;

    this.initialize();
  }

  initialize() {
    if (!this.video) throw new Error('no video was set to the player');
    if (!this.container) throw new Error('no container was set to the player');

    const playerControls = this.createPlayerControls();

    if (this.container.querySelector('.cfyts-player-controls')) return;

    this.container.appendChild(playerControls);
  }

  createPlayerControls() {
    let controls = this.container.querySelector('.cfyts-player-controls');
    let created = false;
    if (!controls) {
      controls = document.createElement('div');
      created = true;
    }

    const scrubber = this.createScrubber(controls);
    if (created) controls.appendChild(scrubber);

    let controlButtons = controls.querySelector('.control-buttons');
    if (!controlButtons) {
      controlButtons = document.createElement('div');
      controls.appendChild(controlButtons);
      controlButtons.classList.add('control-buttons');
    }

    const playButton = this.createPlayButton(controls);
    const volumeControl = this.createVolumeControl(controls);
    const timeDisplay = this.createTimeDisplay(controls);

    if (created) {
      controlButtons.appendChild(playButton);
      controlButtons.appendChild(volumeControl);
      controlButtons.appendChild(timeDisplay);

      controls.classList.add('cfyts-player-controls');
    }

    return controls;
  }

  createPlayButton() {
    const playButton = document.createElement('button');
    playButton.classList.add('play-button');
    playButton.innerHTML = `
      <svg class="play-icon" viewBox="6 5 24 24" width="100%">
        <path class="ytp-svg-fill" d="M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z"></path>
      </svg>
      <svg class="pause-icon" viewBox="6 5 24 24" width="100%">
        <path class="ytp-svg-fill" d="M 12,26 16,26 16,10 12,10 z M 21,26 25,26 25,10 21,10 z"></path>
      </svg>
    `;

    const updateButtonIcon = () => {
      if (this.video.paused) {
        playButton.setAttribute('playing', 'false');
      } else {
        playButton.setAttribute('playing', 'true');
      }
    };

    updateButtonIcon();

    this.video.addEventListener('play', (e) => {
      updateButtonIcon();
    });

    this.video.addEventListener('pause', (e) => {
      updateButtonIcon();
    });

    playButton.addEventListener('click', (e) => {
      if (this.video.paused) {
        this.video.play();
      } else {
        this.video.pause();
      }
    });

    return playButton;
  }

  /** @param {HTMLDivElement} controls */
  createScrubber(controls) {
    let scrubber = controls.querySelector('.progress-bar');

    if (!scrubber) {
      scrubber = document.createElement('div');
      scrubber.classList.add('progress-bar');
      scrubber.innerHTML = `
        <div class="progress-bar-wrapper">
          <input class="slider" type="range" value="0" min="0" max="100"/>
        </div>
      `;
    }

    const slider = scrubber.querySelector('input');

    document.addEventListener('keydown', (e) => {
      if (!chrome.runtime.id) return;
      if (!this.enabled) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (!isShortsPage()) return;
      if (isUserTyping()) return;

      const goFoward = e.key === 'ArrowRight';

      const currentTime = this.video.currentTime;
      const duration = this.video.duration;

      const newTime = goFoward
        ? Math.min(currentTime + 5, duration)
        : Math.max(currentTime - 5, 0);

      this.video.currentTime = newTime;
    });

    const updateSliderProgressBackground = () => {
      const percent = slider.value;
      slider.style.background = `linear-gradient(to right, red, red ${percent}%, rgba(255, 255, 255, 0.35) ${percent}%)`;
    };

    const updateSliderValueWithVideoTime = () => {
      const duration = this.video.duration;
      const currentTime = this.video.currentTime;
      const percent = (currentTime / duration) * 100;
      slider.value = percent;
    };

    updateSliderValueWithVideoTime();
    updateSliderProgressBackground();

    // Handle video progress updating the slider
    this.video.addEventListener('timeupdate', (e) => {
      if (!chrome.runtime.id) return;
      updateSliderValueWithVideoTime();
      updateSliderProgressBackground();
    });

    let isDragging = false;
    let wasPlayingBeforeDrag = false;

    // Handle slider drag start (user interaction)
    slider.addEventListener('input', (e) => {
      if (!chrome.runtime.id) return;
      if (!isDragging) {
        isDragging = true; // Mark as dragging
        wasPlayingBeforeDrag = !this.video.paused; // Check if the video was playing

        this.video.pause(); // Pause the video while dragging
      }

      // Calculate new time based on the slider position
      const value = slider.value;
      const duration = this.video.duration;
      const newTime = (value / 100) * duration;
      this.video.currentTime = newTime; // Update video time as user drags

      updateSliderProgressBackground();
    });

    // Handle drag end (when the user releases the slider)
    slider.addEventListener('change', (e) => {
      if (!chrome.runtime.id) return;
      isDragging = false; // Stop dragging

      // If the video was playing before dragging, play it again
      if (wasPlayingBeforeDrag) {
        this.video.play();
      }
    });

    return scrubber;
  }

  /** @param {HTMLDivElement} controls */
  createTimeDisplay(controls) {
    let timeDisplay = controls.querySelector('.time-display');

    if (!timeDisplay) {
      timeDisplay = document.createElement('div');
      timeDisplay.classList.add('time-display');
    }

    const updateTimeDisplay = () => {
      const duration = this.video.duration;
      const currentTime = this.video.currentTime;

      // format current time as mm:ss
      const currentTimeFormatted = formatTime(currentTime);
      const durationFormatted = formatTime(duration);

      timeDisplay.textContent = `${currentTimeFormatted} / ${durationFormatted}`;
    };

    updateTimeDisplay();
    this.video.addEventListener('timeupdate', (e) => {
      if (!chrome.runtime.id) return;
      updateTimeDisplay();
    });

    return timeDisplay;
  }

  /** @param {HTMLDivElement} controls */
  createVolumeControl(controls) {
    let volumeControl = controls.querySelector('.volume-control');

    if (!volumeControl) {
      volumeControl = document.createElement('div');
      volumeControl.classList.add('volume-control');

      volumeControl.innerHTML = `
        <button class="mute-button">
          <svg class="high-volume-icon" viewBox="6 5 24 24" width="100%">
            <path class="ytp-svg-fill" d="M8,21 L12,21 L17,26 L17,10 L12,15 L8,15 L8,21 Z M19,14 L19,22 C20.48,21.32 21.5,19.77 21.5,18 C21.5,16.26 20.48,14.74 19,14 ZM19,11.29 C21.89,12.15 24,14.83 24,18 C24,21.17 21.89,23.85 19,24.71 L19,26.77 C23.01,25.86 26,22.28 26,18 C26,13.72 23.01,10.14 19,9.23 L19,11.29 Z" fill="#fff"></path>
          </svg>
          <svg class="low-volume-icon" viewBox="6 5 24 24" width="100%">
            <path class="ytp-svg-fill" d="M8,21 L12,21 L17,26 L17,10 L12,15 L8,15 L8,21 Z M19,14 L19,22 C20.48,21.32 21.5,19.77 21.5,18 C21.5,16.26 20.48,14.74 19,14 Z" fill="#fff"></path>
          </svg>
          <svg class="muted-volume-icon" viewBox="6 5 24 24" width="100%">
            <path class="ytp-svg-fill" d="m 21.48,17.98 c 0,-1.77 -1.02,-3.29 -2.5,-4.03 v 2.21 l 2.45,2.45 c .03,-0.2 .05,-0.41 .05,-0.63 z m 2.5,0 c 0,.94 -0.2,1.82 -0.54,2.64 l 1.51,1.51 c .66,-1.24 1.03,-2.65 1.03,-4.15 0,-4.28 -2.99,-7.86 -7,-8.76 v 2.05 c 2.89,.86 5,3.54 5,6.71 z M 9.25,8.98 l -1.27,1.26 4.72,4.73 H 7.98 v 6 H 11.98 l 5,5 v -6.73 l 4.25,4.25 c -0.67,.52 -1.42,.93 -2.25,1.18 v 2.06 c 1.38,-0.31 2.63,-0.95 3.69,-1.81 l 2.04,2.05 1.27,-1.27 -9,-9 -7.72,-7.72 z m 7.72,.99 -2.09,2.08 2.09,2.09 V 9.98 z"></path>
          </svg>
        </button>
        <div class="volume-slider">
          <input class="slider" type="range" value="0" min="0" max="100"/>
        </div>
      `;
    }

    const muteButton = volumeControl.querySelector('.mute-button');

    muteButton.addEventListener('click', (e) => {
      this.shortsMuteButton.click();
    });

    const volumeSlider = volumeControl.querySelector(
      '.volume-slider input[type="range"]',
    );

    volumeSlider.value = this.shortsVolumeSlider.value;

    const updateIcon = () => {
      if (this.video.muted || this.video.volume === 0) {
        muteButton.setAttribute('icon', 'muted');
      } else if (this.video.volume <= 0.5) {
        muteButton.setAttribute('icon', 'low-volume');
      } else {
        muteButton.setAttribute('icon', 'high-volume');
      }
    };

    updateIcon();
    this.video.addEventListener('volumechange', (e) => {
      if (!chrome.runtime.id) return;
      updateIcon();
    });

    document.addEventListener(
      'keydown',
      (e) => {
        if (!chrome.runtime.id) return;
        if (!this.enabled) return;
        if (
          (!this.controlVolumeWithArrows && !e.shiftKey) ||
          (this.controlVolumeWithArrows && e.shiftKey)
        ) {
          // if controlling volume with arrows is disabled, you can still control using shift + arrow keys.
          // or the reverse otherwise.
          return;
        }

        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        if (!isShortsPage()) return;
        if (isUserTyping()) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const volumeUp = e.key === 'ArrowUp';
        const percent = parseInt(this.shortsVolumeSlider.value);
        const newPercent = volumeUp
          ? Math.min(percent + 5, 100)
          : Math.max(percent - 5, 0);

        this.shortsVolumeSlider.value = newPercent;
        this.shortsVolumeSlider.dispatchEvent(new Event('input'));

        volumeSlider.value = this.shortsVolumeSlider.value;
        updateVolumeSliderBackground();
      },
      true,
    );

    const updateVolumeSliderBackground = () => {
      const percent = volumeSlider.value;
      volumeSlider.style.background = `linear-gradient(to right, white, white ${percent}%, rgba(255, 255, 255, 0.25) ${percent}%)`;
    };

    volumeSlider.addEventListener('input', (e) => {
      if (!chrome.runtime.id) return;
      this.shortsVolumeSlider.value = volumeSlider.value;
      this.shortsVolumeSlider.dispatchEvent(new Event('input'));
      updateVolumeSliderBackground();
    });

    const shortsVolumeSliderChangeCallback = (e) => {
      if (!chrome.runtime.id) return;
      volumeSlider.value = this.shortsVolumeSlider.value;
      updateVolumeSliderBackground();
    };

    const addListenersToShortsVolumeControls = () => {
      if (!chrome.runtime.id) return;
      this.shortsVolumeSlider.addEventListener(
        'change',
        shortsVolumeSliderChangeCallback,
      );
    };

    const removeListenersFromShortsVolumeControls = () => {
      this.shortsVolumeSlider.removeEventListener(
        'change',
        shortsVolumeSliderChangeCallback,
      );
    };

    this.onNewShortVolumeControls = (newMuteButton, newVolumeSlider) => {
      addListenersToShortsVolumeControls();

      this.shortsMuteButton = newMuteButton;
      this.shortsVolumeSlider = newVolumeSlider;

      removeListenersFromShortsVolumeControls();
    };

    this.onInitialVolumePercent = (initialVolumePercent) => {
      devLog('updating initial volume percent:', initialVolumePercent);
      volumeSlider.value = initialVolumePercent;
      updateVolumeSliderBackground();
    };

    updateVolumeSliderBackground();
    addListenersToShortsVolumeControls();

    return volumeControl;
  }

  /** @param {HTMLButtonElement} muteButton @param {HTMLInputElement} volumeSlider */
  setNewShortVolumeControls(muteButton, volumeSlider) {
    if (!this.onNewShortVolumeControls) return;
    this.onNewShortVolumeControls(muteButton, volumeSlider);
  }

  /** @param {number} volumePercent */
  setVolumeSliderInitialVolumeChange(volumePercent) {
    this.onInitialVolumePercent(volumePercent);
  }
}
