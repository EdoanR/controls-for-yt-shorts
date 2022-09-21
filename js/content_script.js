console.log('content script injected!');

MH.on(MH.events.foo, (message, sender) => {
    console.log('Sender:', sender);
    console.log('Received message:', message);
});