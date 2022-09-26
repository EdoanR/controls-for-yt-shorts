
const messageHandler = new MessageHandler({
    foo: '',
    bar: 1,
    lorem: {
        ipsulum: '',
        sit: true,
        amet: 2
    }
});

/** Shortcut version of messageHandler */
const MH = messageHandler;

const storageHandler = new StorageHandler({
    aaa: 'AAA',
    bbb: 2,
    ccc: true,
    ddd: { eee: 'EEE', fff: 123 }
});

/** Shortcut version of storageHandler */
const SH = storageHandler;