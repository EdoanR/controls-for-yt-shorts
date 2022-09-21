// Make sure to create STORAGE_ITEMS object before calling this script.

const storageHandler = {
    /** @type { <T extends Partial<STORAGE_ITEMS>>(items?: T) => Promise<void> } */
    set: async function(items) {
        return chrome.storage.sync.set(items);
    },
    /** 
     * @type {{
     * <T extends Partial<STORAGE_ITEMS>>(items: T) => Promise<T>
     * <K extends keyof STORAGE_ITEMS>(items: K[]) => Promise<{[X in K]: STORAGE_ITEMS[X]}>
     * }} */
    get: async function(items) {
        if (!items || (typeof items == 'object' && Object.keys(items) == 0)) items = null;
        if (Array.isArray(items)) {
            let _items = {};
            for (let key of items) {
                if (STORAGE_ITEMS[key] == undefined) {
                    _items[key] = null;
                } else {
                    _items[key] = STORAGE_ITEMS[key];
                }
            }
            items = _items;
        }

        if (items == null) {
            return chrome.storage.sync.get(items).then(_items => {
                for (let key in STORAGE_ITEMS) {
                    if (_items[key] == undefined) _items[key] = STORAGE_ITEMS[key];
                }

                return _items;
            });
        } else {
            return chrome.storage.sync.get(items);
        }

    },
    /** @type {<K extends keyof STORAGE_ITEMS>(keys: K | K[]) => Promise<void>} */
    delete: async function(keys) {
        return chrome.storage.sync.remove(keys);
    },
    clear: async function() {
        return chrome.storage.sync.clear();
    },
    /** @type {{[K in keyof STORAGE_ITEMS] : K}} */
    keys: {},
    local: {
        /** @type { <T extends Partial<STORAGE_ITEMS>>(items?: T) => Promise<void> } */
        set: async function(items) {
            return chrome.storage.local.set(items);
        },
        /** 
         * @type {{
         * <T extends Partial<STORAGE_ITEMS>>(items: T) => Promise<T>
         * <K extends keyof STORAGE_ITEMS>(items: K[]) => Promise<{[X in K]: STORAGE_ITEMS[X]}>
         * }} */
        get: async function(items) {
            if (!items || (typeof items == 'object' && Object.keys(items) == 0)) items = null;
            if (Array.isArray(items)) {
                let _items = {};
                for (let key of items) {
                    if (STORAGE_ITEMS[key] == undefined) {
                        _items[key] = null;
                    } else {
                        _items[key] = STORAGE_ITEMS[key];
                    }
                }
                items = _items;
            }
    
            if (items == null) {
                return chrome.storage.local.get(items).then(_items => {
                    for (let key in STORAGE_ITEMS) {
                        if (_items[key] == undefined) _items[key] = STORAGE_ITEMS[key];
                    }
    
                    return _items;
                });
            } else {
                return chrome.storage.local.get(items);
            }
    
        },
        /** @type {<K extends keyof STORAGE_ITEMS>(keys: K | K[]) => Promise<void>} */
        delete: async function(keys) {
            return chrome.storage.local.remove(keys);
        },
        clear: async function() {
            return chrome.storage.local.clear();
        }
    }
}

/** Shortcut version of storageHandler */
const SH = storageHandler;

if (!STORAGE_ITEMS) {
    throw new Error('storageHandler without setting an STORAGE_ITEMS object first');
} else {
    for (let key in STORAGE_ITEMS) {
        storageHandler.keys[key] = key;
    }
}