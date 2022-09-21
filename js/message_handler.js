// Make sure to have a MESSAGES object before calling this script.
// Also you can create MESSAGES_RESPONSES object for messages that receive responses.

const messageHandler = {
    callbacks: new Map(),
    /** @type { <K extends keyof MESSAGES>(messageId: K, callback: (message: MESSAGES[K], sender: chrome.runtime.MessageSender, sendResponse: (res: MESSAGES_RESPONSES[K]) => void) => void) => void } */
    on: function(id, callback) {
        if (!callback) {
            console.warn('Using messageHandler.on without an callback.');
            return;
        }
        
        let callbacks = this.callbacks.get(id);
        if (!callbacks) callbacks = [];
        callbacks.push(callback);
        
        this.callbacks.set(id, callbacks);
    },
    /** @type {<K extends keyof MESSAGES>(messageId: K, message: MESSAGES[K]) => void } */
    emit: function(id, message) {

        let handledMessage = {
            __id: id,
            __isHandled: true,
            __message: message
        };

        chrome.tabs.query({}, tabs => {
            tabs = tabs.filter(t => t.id);

            chrome.runtime.sendMessage(handledMessage, res => {
                chrome.runtime.lastError;
            });

            for (let tab of tabs) {
                if (!tab.id) continue;

                chrome.tabs.sendMessage(tab.id, handledMessage, res => {
                    chrome.runtime.lastError;
                });
            }
        });
    },
    /** @type {<K extends keyof MESSAGES>(messageId: K, message: MESSAGES[K], callback: (res: MESSAGES_RESPONSES[K][]) => void) => void } */
    emitToTabs: function(id, message, callback) {
        let handledMessage = {
            __id: id,
            __isHandled: true,
            __message: message
        };

        let resList = [];
        let resCount = 0;
        const checkRes = (tabs) => {
            if (resCount >= tabs.length) {
                if (callback) callback(resList);
            }
        }
        chrome.tabs.query({}, tabs => {
            tabs = tabs.filter(t => t.id);

            for (let tab of tabs) {
                if (!tab.id) continue;
                chrome.tabs.sendMessage(tab.id, handledMessage, res => {
                    chrome.runtime.lastError;
                    resCount++;

                    if (res !== undefined) {
                        resList.push(res);
                    }
                    checkRes(tabs);
                });
            }
        });
    },
    /** @type {<K extends keyof MESSAGES>(messageId: K, message: MESSAGES[K], callback: (res: MESSAGES_RESPONSES[K]) => void) => void } */
    emitToRuntime: function(id, message, callback) {
        let handledMessage = {
            __id: id,
            __isHandled: true,
            __message: message
        };

        chrome.runtime.sendMessage(handledMessage, res => {
            chrome.runtime.lastError;
            if (callback) callback(res);
        });
    },

    /** @type { {[K in keyof MESSAGES]: K} } */
    events: {}
}

if (!MESSAGES) {
    throw new Error('message_handler.js without MESSAGES.');
} else {
    // Setting up the keys.
    let events = {};
    for (let key in MESSAGES) {
        events[key] = key;
    }

    messageHandler.events = events;

    // Listening to messages and handling them.
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        chrome.runtime.lastError;

        // console.log('received unhandled message', message);
        if (!message.__isHandled) return; // is not a message emitted by the handler.

        const id = message.__id;
        // Assigning the default message values (if has).
        let msg = MESSAGES[id];
        if (message.__message !== undefined) {
            if (typeof message.__message == 'object') {
                msg = Object.assign({...MESSAGES[id]}, message.__message);
            } else {
                msg = message.__message;
            }
        }

        const callbacks = messageHandler.callbacks.get(id);
        if (!callbacks) return;

        for (const callback of callbacks) {
            // Call every callback set to this id.
            callback(msg, sender, sendResponse);
        }
    });
}

const MH = messageHandler;