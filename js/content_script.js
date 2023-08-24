devLog('content script started.');

let player = null;
/** @type {HTMLVideoElement} */
let VIDEO = null;
let listeningKeys = false;

let STARTED = false;
/** @type {HTMLElement} */
let SHORTS_PLAYER_ELEMENT = null;
let IS_LISTENING_KEYS = false;

chrome.storage.sync.get({ enabled: true, controlAlwaysVisible: false, hideVideoInfo: false }).then(items => {
    const playerEnabledAttributeName = 'cfyts-player-enabled';
    const alwaysVisibleAttrName = 'cfyts-controls-always-on';
    const hideVideoInfoAttrName = 'cfyts-hide-video-info';

    const isShortsPage = () => {
        return location.href.includes('/shorts/');
    }

    if (isShortsPage()) {
        // if already on short page, start adding the controls.
        start();
    } else {
        // if not in a short page. Listen for url changes.
        chrome.runtime.onMessage.addListener(message => {
            if (message?.type !== 'url update') return;
            if (!isShortsPage()) return;

            // user redirected to a shorts page. start!
            start();
        });
    }

    // listen to storage change
    chrome.storage.sync.onChanged.addListener(changes => {
        // update items.
        for (const key in changes) {
            items[key] = changes[key].newValue;
        }

        if (changes['enabled']) {
            if (!STARTED && isShortsPage() && changes['enabled'].newValue === true) {
                start();
            }
        }

        updateShortsPlayerAttributes();
    });

    function updateShortsPlayerAttributes() {
        if (!SHORTS_PLAYER_ELEMENT) return;

        SHORTS_PLAYER_ELEMENT.setAttribute(playerEnabledAttributeName, items.enabled);
        SHORTS_PLAYER_ELEMENT.setAttribute(alwaysVisibleAttrName, items.controlAlwaysVisible);
        SHORTS_PLAYER_ELEMENT.setAttribute(hideVideoInfoAttrName, items.hideVideoInfo);
    }

    async function start() {
        if (STARTED) return; // already started.
        if (!items.enabled) return; // extension disabled.
        STARTED = true;

        devLog('started.');

        const video = await findVideo();
        devLog('video found', video);

        player = fluidPlayer(video, {
            layoutControls: {
                playPauseAnimation: false,
                playButtonShowing: false,
                doubleclickFullscreen: false,
                keyboardControl: false,
                loop: true
            }
        });

        SHORTS_PLAYER_ELEMENT = document.querySelector('#shorts-player');
        updateShortsPlayerAttributes();

        const fluidContainer = SHORTS_PLAYER_ELEMENT.querySelector('.fluid_controls_container');
        devLog('fluid container:', fluidContainer);

        fluidContainer.addEventListener('click', e => {
            // when clicking at the video bar it can click throught it and pause/play the video.
            // the following line prevent that from happening.
            e.stopPropagation();
        });

        // click on mute button if the mute button from fluid controls was clicked.
        // this for youtube to automatically mute the next shorts. 
        const muteButton = fluidContainer.querySelector('.fluid_control_mute');
        muteButton.addEventListener('click', e => {
            clickMuteButton();
        });

        // this is handles when user unmute the video by changing it's volume
        let volume = video.volume;
        let muted = video.muted;
        video.addEventListener('volumechange', e => {
            if (video.muted) {
                volume = video.volume;
                muted = true;
            } else {
                if (muted && video.volume !== volume) clickMuteButton();
                muted = false;
            }
        });

        document.addEventListener('keydown', e => {
            if (!items.enabled) return;
            if (!isShortsPage()) return;
            if (e.target.matches('input, [contenteditable]')) return; // ignore keys on inputs.

            const preventDefault = () => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }

            if (e.shiftKey) return; // ignore shorcuts using shift key.

            // spacebar and "M" are already handled by YouTube.
            if (e.key === 'ArrowUp') {
                video.volume = Math.min(1, video.volume + 0.05);
                preventDefault();
            } else if (e.key === 'ArrowDown') {
                video.volume = Math.max(0, video.volume - 0.05);
                preventDefault();
            } else if (e.key === 'ArrowLeft') {
                video.currentTime = Math.max(video.currentTime - 5, 0);
                preventDefault();
            } else if (e.key === 'ArrowRight') {
                video.currentTime = Math.min(video.currentTime + 5, video.duration);
                preventDefault();
            } else if (e.key.match(/^[0-9]$/)) {
                const numericValue = parseInt(e.key);
                const percentage = numericValue * 10;
                const position = (video.duration * percentage) / 100;

                video.currentTime = position;
                preventDefault();
            }

        }, true);
    }

    function clickMuteButton() {
        const controlButtons = document.querySelectorAll('ytd-reel-video-renderer[is-active] ytd-shorts-player-controls button');
        const shortsMuteButton = controlButtons[1];

        if (shortsMuteButton) shortsMuteButton.click();
    }

    /** @returns {Promise<HTMLVideoElement>} */
    async function findVideo() {
        let video = document.querySelector('#shorts-container ytd-player video');
        if (video) return video;

        return new Promise(resolve => {
            // watch for the video player element.
            observer.watchElements([
                {
                    elements: ['.video-stream.html5-main-video'],
                    onElement: element => {
                        if (video) return;

                        video = document.querySelector('#shorts-container ytd-player video');
                        if (video) resolve(video);
                    }
                }
            ])
        });
    }
});

