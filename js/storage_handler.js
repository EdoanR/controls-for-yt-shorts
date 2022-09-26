/** 
 * Handle chrome.storage in a more type-friendly way.
 * @template S 
 * */
class StorageHandler {
    /** @param {S} storage */
    constructor(storage) {
        if (!storage) throw new Error('Initializating StorageHandler without storage param.');

        this.storage = storage;

        /** @type {{[K in keyof S] : K}} */
        this.keys = {};
        for (let key in this.storage) {
            this.keys[key] = key;
        }

        /** 
         * @type {{
         * <K extends keyof S>(items: K[]) => Promise<{[X in K]: S[X]}>
         * <T extends Partial<S>>(items: T) => Promise<T>
         * }} */
        this.get = async (items) => {
            if (!items || (typeof items == 'object' && Object.keys(items) == 0)) items = null;
            if (Array.isArray(items)) {
                let _items = {};
                for (let key of items) {
                    if (this.storage[key] == undefined) {
                        _items[key] = null;
                    } else {
                        _items[key] = this.storage[key];
                    }
                }
                items = _items;
            }
    
            if (items == null) {
                return chrome.storage.sync.get(items).then(_items => {
                    for (let key in this.storage) {
                        if (_items[key] == undefined) _items[key] = this.storage[key];
                    }
    
                    return _items;
                });
            } else {
                return chrome.storage.sync.get(items);
            }
    
        }

        this.local = {
            /** @type { <T extends Partial<S>>(items?: T) => Promise<void> } */
            set: async function(items) {
                return chrome.storage.local.set(items);
            },
            /** 
             * @type {{
             * <T extends Partial<S>>(items: T) => Promise<T>
             * <K extends keyof S>(items: K[]) => Promise<{[X in K]: S[X]}>
             * }} */
            get: async function(items) {
                if (!items || (typeof items == 'object' && Object.keys(items) == 0)) items = null;
                if (Array.isArray(items)) {
                    let _items = {};
                    for (let key of items) {
                        if (this.storage[key] == undefined) {
                            _items[key] = null;
                        } else {
                            _items[key] = this.storage[key];
                        }
                    }
                    items = _items;
                }
        
                if (items == null) {
                    return chrome.storage.local.get(items).then(_items => {
                        for (let key in this.storage) {
                            if (_items[key] == undefined) _items[key] = this.storage[key];
                        }
        
                        return _items;
                    });
                } else {
                    return chrome.storage.local.get(items);
                }
        
            },
            /** @type {<K extends keyof S>(keys: K | K[]) => Promise<void>} */
            delete: async function(keys) {
                return chrome.storage.local.remove(keys);
            },
            clear: async function() {
                return chrome.storage.local.clear();
            }
        }
    }

    /** @type { <T extends Partial<S>>(items?: T) => Promise<void> } */
    async set(items) {
        return chrome.storage.sync.set(items);
    }

    /** @type {<K extends keyof S>(keys: K | K[]) => Promise<void>} */
    async delete(keys) {
        return chrome.storage.sync.remove(keys);
    }

    async clear() {
        return chrome.storage.sync.clear();
    }

    /** @type { (callback: (newValue: {[K in keyof S]? : S[K]}, oldValue: {[K in keyof S]? : S[K]}, areaName: "sync" | "local" | "managed")) => void } */
    onChange(callback) {
        if (!callback) return;
        chrome.storage.onChanged.addListener((changes, areaName) => {

            let newValue = {};
            let oldValue = {};
            for (let key in changes) {
                newValue[key] = changes[key].newValue;
                oldValue[key] = changes[key].oldValue;
            }

            callback(newValue, oldValue, areaName);
        });
    }
}