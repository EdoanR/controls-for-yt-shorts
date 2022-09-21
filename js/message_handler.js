// This script must run on the background.js when sending message from tab to tab.
// Make sure to have a MESSAGES object before calling this script.
// Also you can create MESSAGES_RESPONSES object for messages that receive responses.

/** 
 * @typedef {Object} UnhandledMessage
 * @property {string} __id
 * @property {boolean} __fromHandler
 * @property {any} __message
 * @property {boolean} __isRedirect
 * @property {chrome.runtime.MessageSender} [__sender]
 * @property {number} [__toTabId]
 * @property {boolean} [__ignoreOptions]
 */

const messageHandler = {

    callbacks: new Map(),
    everyMessageCallbacks: [],

    /** 
     * Listen to messages or specific message.
     * @type {{
     * <K extends keyof MESSAGES>(messageId: K, callback: (message: MESSAGES[K], sender: chrome.runtime.MessageSender) => void) => void 
     * <K extends keyof MESSAGES>(callback: (messageId: K, message: MESSAGES[K], sender: chrome.runtime.MessageSender) => void) => void 
     * }} */
    on: function(id, callback) {

        if (typeof id == 'function') {
            callback = id;
            this.everyMessageCallbacks.push(callback);
            return;
        }

        if (!callback) {
            console.warn('Using messageHandler.on without an callback.');
            return;
        }
        
        let callbacks = this.callbacks.get(id);
        if (!callbacks) callbacks = [];
        callbacks.push(callback);
        
        this.callbacks.set(id, callbacks);
    },

    /** 
     * Emit for both runtime and tabs.
     * @type {<K extends keyof MESSAGES>(messageId: K, message: MESSAGES[K]) => void } 
     * */
    emit: function(messageId, message) {
        if (messageId === undefined)  throw new Error(`sending a undefined messageId.`);
        if (message === undefined)  throw new Error(`sending a undefined message.`);

        /** @type {UnhandledMessage} */
        let unhandledMessage = {
            __id: messageId,
            __fromHandler: true,
            __message: message
        };
        
        chrome.runtime.sendMessage(unhandledMessage, res => { chrome.runtime.lastError; })

        unhandledMessage.__ignoreOptions = true;

        if (!chrome.tabs) {
            unhandledMessage.__isRedirect = true;
            chrome.runtime.sendMessage(unhandledMessage, res => { chrome.runtime.lastError; })
            return;
        }

        chrome.tabs.query({}).then(tabs => {
            for (let tab of tabs) {
                if (!tab.id) continue;

                chrome.tabs.sendMessage(tab.id, unhandledMessage, res => { chrome.runtime.lastError; });
            }
        });
    },

    /** 
     * Emit a message to all tabs.
     * @type {<K extends keyof MESSAGES>(messageId: K, message: MESSAGES[K]) => void } */
    emitToTabs: function(messageId, message) {
        if (messageId === undefined)  throw new Error(`sending a undefined messageId.`);
        if (message === undefined)  throw new Error(`sending a undefined message.`);

        /** @type {UnhandledMessage} */
        let unhandledMessage = {
            __id: messageId,
            __fromHandler: true,
            __message: message
        };

        if (!chrome.tabs) {
            unhandledMessage.__isRedirect = true;
            chrome.runtime.sendMessage(unhandledMessage, res => { 
                chrome.runtime.lastError;
                // if (res !== undefined) responseCallback(res);
            });
            return;
        }

        let count = 0;
        let responses = [];
        let check = (tabs) => {
            count++;
            // if (tabs.length == count) responseCallback(responses); 
        }
        chrome.tabs.query({}).then(tabs => {
            tabs = tabs.filter(t => t.id);
            for (let tab of tabs) {
                chrome.tabs.sendMessage(tab.id, unhandledMessage, res => { 
                    chrome.runtime.lastError;
                    if (res !== undefined) {
                        responses.push({ tabId: tab.id, response: res });
                        check(tabs);
                    }
                });
            }
        });
        
    },

    /** 
     * Emit message to an specific tab
     * @type {<K extends keyof MESSAGES>(tabId: number | chrome.tabs.Tab, messageId: K, message: MESSAGES[K]) => void } */
    emitToTab: function(tabId, messageId, message) {
        if (typeof tabId == 'object') tabId = tabId.id;
        if (typeof tabId !== 'number') throw new Error(`tabId is type "${typeof tabId}", must be a number.`);
        if (messageId === undefined)  throw new Error(`sending a undefined messageId.`);
        if (message === undefined)  throw new Error(`sending a undefined message.`);

        /** @type {UnhandledMessage} */
        let unhandledMessage = {
            __id: messageId,
            __fromHandler: true,
            __message: message,
            __toTabId: tabId
        };

        if (!chrome.tabs) {
            unhandledMessage.__isRedirect = true;
            chrome.runtime.sendMessage(unhandledMessage, res => { 
                chrome.runtime.lastError;
                // if (responseCallback) responseCallback(res);
            });
            return;
        }

        chrome.tabs.sendMessage(tabId, unhandledMessage, res => { 
            chrome.runtime.lastError;
            // if (responseCallback) responseCallback(res);
        });
    },
    /** @type {<K extends keyof MESSAGES>(messageId: K, message: MESSAGES[K]) => void } */
    emitToRuntime: function(messageId, message) {
        if (messageId === undefined)  throw new Error(`sending a undefined messageId.`);
        if (message === undefined)  throw new Error(`sending a undefined message.`);

        /** @type {UnhandledMessage} */
        let unhandledMessage = {
            __id: messageId,
            __fromHandler: true,
            __message: message,
        };

        chrome.runtime.sendMessage(unhandledMessage, res => { 
            chrome.runtime.lastError;
            // if (responseCallback) responseCallback(res);
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

    const isBackground = Boolean(!('window' in this) && chrome.tabs);

    // Listening to messages and handling them.
    chrome.runtime.onMessage.addListener((/** @type {UnhandledMessage} **/ message, sender, sendResponse) => {
        chrome.runtime.lastError;

        if (message.__isRedirect && !isBackground) return;
        if (chrome.tabs && !isBackground && message.__ignoreOptions) return;

        // console.log(indentifier, message);

        if (message.__isRedirect) {
            delete message.__isRedirect;
            message.__sender = sender;

            if (message.__toTabId) {
                chrome.tabs.sendMessage(message.__toTabId, message, res => { chrome.runtime.lastError });
                return;
            }

            chrome.tabs.query({}).then(tabs => {
                for (let tab of tabs) {
                    if (!tab.id || tab.id == sender.tab.id) continue;
                    chrome.tabs.sendMessage(tab.id, message, res => { chrome.runtime.lastError });
                }
            });
            return;
        }

        const messageId = message.__id;

        // Getting message and assigning the default values.
        let msg = MESSAGES[messageId];
        if (message.__message !== undefined) {
            if (typeof message.__message == 'object') {
                msg = Object.assign({...MESSAGES[messageId]}, message.__message);
            } else {
                msg = message.__message;
            }
        }

        let callbacks = messageHandler.callbacks.get(messageId);
        if (callbacks) {
            for (let callback of callbacks) {
                callback(msg, message.__sender || sender);
            }
        }

        for (let callback of messageHandler.everyMessageCallbacks) {
            callback(messageId, msg, message.__sender || sender)
        }
        
    });
}

const MH = messageHandler;