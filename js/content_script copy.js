devLog('content script started.');

let player = null;
/** @type {HTMLVideoElement} */
let VIDEO = null;
let listeningKeys = false;

chrome.storage.sync.get({ enabled: true, controlAlwaysVisible: false, hideVideoInfo: false }).then(items => {
    const playerAttributeName = 'CFYTS-player';
    const playerEnabledAttributeName = 'CFYTS-player-enabled';
    const alwaysVisibleAttrName = 'CFYTS-controls-always-on';
    const hideVideoInfoAttrName = 'CFYTS-hide-video-info';

    let savedVolume = null;

    observer.watchElements([
        {
            elements: ['#shorts-player'],
            onElement: (element) => {
                checkPage();
            }
        }
    ])

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
        const shortsPlayer = document.querySelector('#shorts-player');
        if (shortsPlayer) shortsPlayer.setAttribute(playerEnabledAttributeName, items.enabled);

        if (!window.location.href.match(/\/shorts\//)) return;

        const video = document.querySelector('#shorts-player video');

        if (!video) return;
        if (video.hasAttribute(playerAttributeName)) return devLog('video already has controls.');

        /** @type {HTMLVideoElement} */
        video.setAttribute(playerAttributeName, '');

        VIDEO = video;

        player = fluidPlayer(video, {
            layoutControls: {
                playPauseAnimation: false,
                playButtonShowing: false,
                doubleclickFullscreen: false,
                keyboardControl: false,
                loop: true
            }
        });

        const fluidContainer = document.querySelector('.fluid_controls_container');
        if (!fluidContainer) return;

        video.addEventListener("volumechange", () => {
            // volume has changed.
            savedVolume = video.volume;
        });

        video.addEventListener('loadedmetadata', () => {
            // setting the changed volume to the new videos.
            if (savedVolume !== null && video.volume !== savedVolume) video.volume = savedVolume;
        });

        fluidContainer.addEventListener('click', e => {
            // when clicking at the video bar it can click throught it and pause/play the video.
            // the following line prevent that from happening.
            e.stopPropagation();
        });

        if (!listeningKeys) {
            listeningKeys = true;

            document.addEventListener('keydown', e => {
                if (!items.enabled) return;
                if (!location.href.includes('/shorts/')) return;
                if (e.target.matches('input, [contenteditable]')) return;

                const preventDefault = () => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }

                if (e.shiftKey) return; // ignore shorcuts using shift key.

                // spacebar and "M" are already handled by YouTube.
                if (e.key === 'ArrowUp') {
                    VIDEO.volume = Math.min(1, VIDEO.volume + 0.05);
                    preventDefault();
                } else if (e.key === 'ArrowDown') {
                    VIDEO.volume = Math.max(0, VIDEO.volume - 0.05);
                    preventDefault();
                } else if (e.key === 'ArrowLeft') {
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

    // user changed enabled option.
    chrome.storage.sync.onChanged.addListener(changes => {
        if (!changes.hasOwnProperty('enabled')) return;

        items.enabled = changes.enabled.newValue;
        checkPage();
    });
});

