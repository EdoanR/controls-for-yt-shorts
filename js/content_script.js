devLog('content script started.');

let PLAYER = null;
/** @type {HTMLVideoElement} */
let VIDEO = null;
let LISTENING_KEYS = false;

let VOLUME_SAVE_TIMEOUT = null;
let EXPECT_USER_VOLUME_CHANGE = false;
let MOUSE_SLIDER_DOWN = false;
let SLIDER_CLICK_TIMEOUT = null;

chrome.storage.sync.get({ 
    enabled: true, 
    controlAlwaysVisible: false, 
    hideVideoInfo: false, 
    controlVolumeWithArrows: false,
    savedVolumeValue: null
}).then(items => {
    const playerAttributeName = 'cfyts-player';
    const playerEnabledAttributeName = 'cfyts-player-enabled';
    const alwaysVisibleAttrName = 'cfyts-controls-always-on';
    const hideVideoInfoAttrName = 'cfyts-hide-video-info';

    const isShortsPage = () => {
        return location.href.includes('/shorts/');
    }

    observer.watchElements([
        {
            elements: ['#shorts-player'],
            onElement: (element) => {
                checkPage();
            }
        }
    ]);

    // listen to storage change
    chrome.storage.sync.onChanged.addListener(changes => {
        // update items.
        for (const key in changes) {
            items[key] = changes[key].newValue;
        }
        
        updateShortsPlayerAttributes();
        
        if (changes['enabled']) {
            checkPage();
        }

    });

    // the current page that the script was inject could be a shorts page, so let's check it.
    checkPage();

    chrome.runtime.onMessage.addListener(message => {
        if (message?.type !== 'url update') return;
        // the url of the page changed, let's check if there's any youtube shorts.
        // this is in case the observer fail on us.

        setTimeout(() => {
            checkPage();
        }, 5000);
    });

    function checkPage() {
        updateShortsPlayerAttributes();

        if (!isShortsPage()) {
            if (PLAYER) PLAYER.destroy();
            return;
        }

        const video = document.querySelector('#shorts-player video');

        if (!video) return;
        if (video.hasAttribute(playerAttributeName)) return devLog('video already has controls.');

        /** @type {HTMLVideoElement} */
        video.setAttribute(playerAttributeName, '');

        VIDEO = video;

        PLAYER = fluidPlayer(video, {
            layoutControls: {
                playPauseAnimation: false,
                playButtonShowing: false,
                doubleclickFullscreen: false,
                keyboardControl: false,
                loop: true
            }
        });

        const fluidContainer = document.querySelector('.fluid_controls_container');

        fluidContainer.addEventListener('click', e => {
            // when clicking at the video bar it can click throught it and pause/play the video.
            // the following line prevent that from happening.
            e.stopPropagation();
        });

        // click on mute button if the mute button from fluid controls was clicked.
        // this for youtube to automatically mute the next shorts. 
        const muteButton = fluidContainer.querySelector('.fluid_control_mute');
        muteButton.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();

            clickMuteButton();
        }, true);

        // this will keep track if the user is changing the volume by changing the slider.
        /** @type {HTMLDivElement} */
        const volumeSlider = fluidContainer.querySelector('.fluid_control_volume_container');
        volumeSlider.addEventListener('mousedown', e => {
            MOUSE_SLIDER_DOWN = true;
            EXPECT_USER_VOLUME_CHANGE = true;
        });

        volumeSlider.addEventListener('mouseup', e => {
            MOUSE_SLIDER_DOWN = false;

            clearTimeout(SLIDER_CLICK_TIMEOUT);
            SLIDER_CLICK_TIMEOUT = setTimeout(() => {
                // this prevent expecting user volume change when the user simply click on the volume slider without dragging.
                if (EXPECT_USER_VOLUME_CHANGE && !MOUSE_SLIDER_DOWN) EXPECT_USER_VOLUME_CHANGE = false;
            }, 500);
        });

        let muted = VIDEO.muted;

        VIDEO.addEventListener('loadeddata', e => {
            if (!muted && VIDEO.muted) VIDEO.muted = false; // this is for when the user change the volume while the video is muted.
            if (items.savedVolumeValue !== null) VIDEO.volume = items.savedVolumeValue;
        });

        VIDEO.addEventListener('volumechange', e => {
            muted = VIDEO.muted;

            if (EXPECT_USER_VOLUME_CHANGE || MOUSE_SLIDER_DOWN) {
                items.savedVolumeValue = VIDEO.volume;

                EXPECT_USER_VOLUME_CHANGE = false;

                // as this can be called multiple times while changing the volume slider.
                // it should use a timeout to save the volume to prevent exceeding chrome storage calls.

                clearTimeout(VOLUME_SAVE_TIMEOUT);
                VOLUME_SAVE_TIMEOUT = null;

                VOLUME_SAVE_TIMEOUT = setTimeout(() => {
                    chrome.storage.sync.set({ savedVolumeValue: items.savedVolumeValue }).then(() => {
                        devLog('volume saved:', items.savedVolumeValue);
                    });
                }, 500);
            } else if (items.savedVolumeValue !== null) {
                VIDEO.volume = items.savedVolumeValue;
            }

        });

        if (!LISTENING_KEYS) {
            LISTENING_KEYS = true;
            
            document.addEventListener('keydown', e => {
                if (!items.enabled) return;
                if (!isShortsPage()) return;
                if (e.target.matches('input, [contenteditable]')) return;
    
                const preventDefault = () => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }

                // spacebar and "M" are already handled by YouTube.

                if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && (items.controlVolumeWithArrows || e.shiftKey)) {
                    if (e.key === 'ArrowUp') {
                        VIDEO.volume = Math.min(1, VIDEO.volume + 0.05);
                        EXPECT_USER_VOLUME_CHANGE = true;
                    } else if (e.key === 'ArrowDown') {
                        VIDEO.volume = Math.max(0, VIDEO.volume - 0.05);
                        EXPECT_USER_VOLUME_CHANGE = true;
                    }
                    preventDefault();
                }

                if (e.shiftKey) return; // ignore shortcuts below when using shift key.
                
                if (e.key === 'ArrowLeft') {
                    VIDEO.currentTime = Math.max(VIDEO.currentTime - 5, 0);
                    preventDefault();
                } else if (e.key === 'ArrowRight') {
                    VIDEO.currentTime = Math.min(VIDEO.currentTime + 5, VIDEO.duration);
                    preventDefault();
                } else if (e.key.match(/^[0-9]$/)) {
                    const numericValue = parseInt(e.key);
                    const percentage = numericValue * 10;
                    const position = (VIDEO.duration * percentage) / 100;
    
                    VIDEO.currentTime = position;
                    preventDefault();
                }
    
            }, true);
        }

    }

    function updateShortsPlayerAttributes() {
        const shortsPlayer = document.querySelector('#shorts-player');
        if (!shortsPlayer) return;

        shortsPlayer.setAttribute(playerEnabledAttributeName, items.enabled);
        shortsPlayer.setAttribute(alwaysVisibleAttrName, items.controlAlwaysVisible);
        shortsPlayer.setAttribute(hideVideoInfoAttrName, items.hideVideoInfo);
    }

    function clickMuteButton() {
        const controlButtons = document.querySelectorAll('ytd-reel-video-renderer[is-active] ytd-shorts-player-controls button');
        const shortsMuteButton = controlButtons[1];

        if (shortsMuteButton) shortsMuteButton.click();
    }
});

