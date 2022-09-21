
class OptionHandler {
    /** @param {STORAGE_ITEMS} storage */
    constructor(storage) {
        if (!storage) throw new Error('OptionHandler without storage.');

        this.storage = storage;

        /** @type {Field[]} */
        this.fields = [];

        this.changeCallbacks = new Map();
    }

    /** @param {HTMLElement | string} element @param {string} storageKey */
    addField(element, storageKey) {
        if (typeof element == 'string') {
            element = document.querySelector(element);
        }

        if (!storageKey) throw new Error('No storageKey.');
        if (!element) throw new Error('Element not found.');
        if (typeof this.storage[storageKey] == 'undefined') {
            throw new Error(`Field with key "${storageKey}" has a undefined value on storage`);
        }

        let field = null;

        if (element.tagName == 'INPUT' && element.type !== 'text') {
            if (element.type == 'checkbox' || element.type == 'radio') {
                field = new ToggleField(element, this, storageKey);
            } else if (element.type == 'number') {
                field = new InputNumberField(element, this, storageKey);
            }
        } else if (element.tagName == 'TEXTAREA' || (element.tagName == 'INPUT' && element.type == 'text')) {
            field = new Field(element, this, storageKey);
        }

        if (!field) throw new Error('Could not create option with element.');

        this.fields.push(field);
        field.listenChange(ev => {
            this.changeCallbacks.forEach(callback => {
                callback(field, ev);
            });
        });

        return field;
    }

    /** @param {(field: Field, ev: Event) => void} callback */
    listenChange(callback) {
        let symbol = Symbol();
        this.changeCallbacks.set(symbol, callback);
        return symbol;
    }

    hasChanged() {
        return this.fields.some(f => {
            return f.hasChanged();
        });
    }

    updateStorage(storage) {
        this.storage = storage;
    }

    getStorage(storage, updateIt = true) {
        this.fields.forEach(field => {
            storage[field.storageKey] = field.getValue();
        });

        if (updateIt) this.updateStorage(storage);
        return storage;
    }
}

class Field {
    /** @param {HTMLInputElement} element @param {OptionHandler} handler @param {string} key */
    constructor(element, handler, key) {
        this.element = element;
        this.handler = handler;
        this.storageKey = key;

        this.changeCallbacks = new Map();

        this.setValue(this.handler.storage[key]);

        this._setListenChange();
    }

    /** @param { (ev: Event) => void } callback */
    listenChange(callback) {
        let symbol = Symbol();
        this.changeCallbacks.set(symbol, callback);
        return symbol;
    }

    _setListenChange() {
        this.element.addEventListener('input', ev => {
            this.changeCallbacks.forEach(callback => {
                callback(ev);
            })
        });
    }

    getValue() {
        return this.element.value;
    }

    setValue(value) {
        return this.element.value = value;
    }

    hasChanged() {
        return this.getValue() !== this.handler.storage[this.storageKey];
    }
}

class ToggleField extends Field {

    /** @param {HTMLInputElement} element @param {OptionHandler} handler @param {string} key */
    constructor(element, handler, key) {
        super(element, handler, key);
    }

    getValue() {
        return this.element.checked;
    }

    setValue(value) {
        return this.element.checked = value;
    }
}

class InputNumberField extends Field {

    /** @param {HTMLInputElement} element @param {OptionHandler} handler @param {string} key */
    constructor(element, handler, key) {
        super(element, handler, key);
    }

    getValue() {
        return parseFloat(this.element.value) || null;
    }

    setValue(value) {
        return this.element.value = value;
    }
}