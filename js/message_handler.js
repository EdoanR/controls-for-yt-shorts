// This script must run on the background.js when sending message from tab to tab.

/** 
 * @typedef {Object} UnhandledMessage
 * @property {string} [__id]
 * @property {boolean} [__fromHandler]
 * @property {any} [__message]
 * 
 * @property {boolean} [__fromTab]
 * @property {boolean} [__sendToTabs]
 * @property {number} [__toTabId]
 * @property {chrome.runtime.MessageSender} [__sender]
 * @property {boolean} [__sendResponseToTab]
 */

const self = this;

/** 
 * Handle messages chrome.runtime and chrome.tabs in a more type-friendly way.
 * @template M
 * */
class MessageHandler {
    /** @param {M} messages */
    constructor(messages) {
        this.messages = messages;

        /** @private */
        this.callbacks = new Map();
        /** @private */
        this.everyMessageCallbacks = [];

        /** 
         * @private
         * @type {Map<string, (value: any) => void>} */
        this.responseCallbacks = new Map();

        /**
         * For how long the message should wait for a response. If pass that time it will responde with `null`
         * @private
         */
        this.maxResponseWait = 5 * 60 * 1000;

        /**
         * All events keys.
         * @callback
         * @type { { [K in keyof M]: K } }
         */
        this.events = {};

        for (let k in this.messages) {
            this.events[k] = k;
        }

        this.isBackground = Boolean(!('window' in self) && chrome.tabs);

        /** 
         * Listen to messages or specific message.
         * @type {{
         * <K extends keyof M>(messageId: K, callback: (message: M[K], sender: chrome.runtime.MessageSender) => void) => void 
         * <K extends keyof M>(callback: (messageId: K, message: M[K], sender: chrome.runtime.MessageSender) => void) => void 
         * }}
        * */
        this.on = (messageId, callback) => {
            if (typeof messageId == 'function') {
                callback = messageId;
                this.everyMessageCallbacks.push(callback);
                return;
            }
    
            if (!callback) {
                console.warn('Using messageHandler.on without an callback.');
                return;
            }
    
            let callbacks = this.callbacks.get(messageId);
            if (!callbacks) callbacks = [];
            callbacks.push(callback);
    
            this.callbacks.set(messageId, callbacks);
        }

        this.listenMessages();
    }

    /**
     * Generate random id.
     * @private
     */
    generateId() {
        return Math.random().toString(16).slice(2);
    }

    /** 
     * Listening to messages and handle them.
     * @param {UnhandledMessage} unhandledMessage
     * @private  */
    getMessageFromUnhandledMessage(unhandledMessage) {
        const messageId = unhandledMessage.__id;

        let msg = this.messages[messageId];
        if (unhandledMessage.__message !== undefined) {
            if (typeof unhandledMessage.__message == 'object') {
                msg = Object.assign({ ...this.messages[messageId] }, unhandledMessage.__message);
            } else {
                msg = unhandledMessage.__message;
            }
        }
        return msg;
    }

    /** 
     * Listening to messages and handle them.
     * @private  */
    listenMessages() {
        chrome.runtime.onMessage.addListener((/** @type {UnhandledMessage} **/ __message, sender, sendResponse) => {
            chrome.runtime.lastError;

            if (!__message.__fromHandler) return; // Message was not sended by the handler, so ignore it.
            if (__message.__isEmitAll && __message.__ignoreOptions && chrome.tabs) return; 

            if (__message.__sendToTabs) {
                if (!this.isBackground) return;

                __message.__sender = sender;
                delete __message.__sendToTabs;

                if (__message.__toTabId) {
                    return chrome.tabs.sendMessage(__message.__toTabId, __message, res => {
                        chrome.runtime.lastError;
                    });
                }

                __message.__ignoreOptions = true;
                return chrome.tabs.query({}).then(tabs => {
                    tabs = tabs.filter(tab => tab.id && tab.id !== sender.tab.id);
                    
                    for (const tab of tabs) {
                        chrome.tabs.sendMessage(tab.id, __message, res => {
                            chrome.runtime.lastError;
                        });
                    }
                });
            }

            this.receiveMessage(__message, __message.__sender || sender, sendResponse);
        });
    }

    /** 
     * Execute the `on` callback of the received message.
     * @param {UnhandledMessage} __message
     * @param {chrome.runtime.MessageSender} sender
     * @param {(response?: any) => void} sendResponse
     * @private  */
    receiveMessage(__message, sender, sendResponse) {
        const messageId = __message.__id;
        const message = this.getMessageFromUnhandledMessage(__message);

        const callbacks = this.callbacks.get(messageId);
        if (callbacks) {
            for (let callback of callbacks) {
                callback(message, sender);
            }
        }

        for (let callback of this.everyMessageCallbacks) {
            callback(messageId, message, sender);
        }
    }

    /** 
     * Emit for both runtime and tabs.
     * @type {<K extends keyof M>(messageId: K, message: M[K]) => Promise<void> } 
     * */
    emit(messageId, message) {
        return new Promise((resolve, reject) => {

            if (messageId === undefined) return reject(`sending an undefined messageId.`);
    
            /** @type {UnhandledMessage} */
            let unhandledMessage = {
                __id: messageId,
                __fromHandler: true,
                __message: message,
                __isEmitAll: true
            };

            chrome.runtime.sendMessage(unhandledMessage, res => { 
                chrome.runtime.lastError;
                resolve();
            });

            if (!chrome.tabs) {
                unhandledMessage.__sendToTabs = true;
                chrome.runtime.sendMessage(unhandledMessage, res => { chrome.runtime.lastError; });
                return;
            }
            
            unhandledMessage.__ignoreOptions = true;
            chrome.tabs.query({}).then(tabs => {
                tabs = tabs.filter(tab => tab.id);
                for (const tab of tabs) {
                    chrome.tabs.sendMessage(tab.id, unhandledMessage, res => { chrome.runtime.lastError; });
                }
            });
        });
    }

    /** 
     * Emit a message to all tabs.
     * @type {<K extends keyof M>(messageId: K, message: M[K]) => Promise<void> } 
     * */
    emitToTabs(messageId, message) {
        return new Promise((resolve, reject) => {

            if (messageId === undefined) return reject(`sending an undefined messageId.`);
    
            /** @type {UnhandledMessage} */
            let unhandledMessage = {
                __id: messageId,
                __fromHandler: true,
                __message: message,
            };

            if (!chrome.tabs) {
                unhandledMessage.__sendToTabs = true;
                return chrome.runtime.sendMessage(unhandledMessage, res => { 
                    chrome.runtime.lastError;
                    resolve();
                });
            }
            
            chrome.tabs.query({}).then(tabs => {
                tabs = tabs.filter(tab => tab.id);
                for (const tab of tabs) {
                    chrome.tabs.sendMessage(tab.id, unhandledMessage, res => { chrome.runtime.lastError; });
                }
            });
        });
    }

    /** 
     * Emit message to an specific tab
     * @type {<K extends keyof M>(tabId: number | chrome.tabs.Tab, messageId: K, message: M[K]) => Promise<void> } 
     * */
    emitToTab(tabId, messageId, message) {
        return new Promise((resolve, reject) => {

            if (typeof tabId == 'object') tabId = tabId.id;
            if (tabId == null) return reject(`tabId is not a number.`);
            if (messageId === undefined) return reject(`sending an undefined messageId.`);
    
            /** @type {UnhandledMessage} */
            let unhandledMessage = {
                __id: messageId,
                __fromHandler: true,
                __message: message
            };

            if (!chrome.tabs) {
                unhandledMessage.__sendToTabs = true;
                unhandledMessage.__toTabId = tabId;
                chrome.runtime.sendMessage(unhandledMessage, res => { 
                    chrome.runtime.lastError;
                    resolve();
                });
                return;
            }
            
            chrome.tabs.sendMessage(tabId, unhandledMessage, res => { 
                chrome.runtime.lastError;
                resolve();
            });
        });
    }

    /** 
     * Emit to runtime. (background, options, popup...)
     * @type {<K extends keyof M>(messageId: K, message: M[K]) => Promise<void> } */
    async emitToRuntime(messageId, message) {
        return new Promise((resolve, reject) => {

            if (messageId === undefined) return reject(`sending an undefined messageId.`);
    
            /** @type {UnhandledMessage} */
            let unhandledMessage = {
                __id: messageId,
                __fromHandler: true,
                __message: message
            };

            chrome.runtime.sendMessage(unhandledMessage, res => { 
                chrome.runtime.lastError;
                resolve();
            });
        });
    }
}