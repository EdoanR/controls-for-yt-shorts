
/**
 * @typedef {Object} ObserverWatchQuery
 * @property {string[]} elements - selector of the elements that should be watched.
 * @property {string} [elementAttributes] - attributes that should be watched, [onElement] will only trigger if this attribute was changed.
 * @property {boolean} [reparenting] - trigger onElement when the element was reparented.
 * @property {(element: HTMLElement, attributeChanged?: string, reparenting: boolean) => void} onElement - element that was found or changed.
 */

class Observer {

    /** @param {ObserverWatchQuery[]} queries */
    watchElements(queries) {
        const summaryQueries = [];

        /** @type {ObserverWatchQuery[]} */
        const observerOriginalQueries = [];

        // Creating queries for mutationSummary.
        queries.forEach(query => {
            for (let element of query.elements) {

                const q = {
                    element: element
                };

                if (query.elementAttributes) q.elementAttributes = query.elementAttributes;

                summaryQueries.push(q);
                observerOriginalQueries.push(query);
            }
        });

        new MutationSummary({
            callback: (summaries => {
                
                // devLog('summaries:', summaries);

                for (let i = 0; i < summaries.length; i++) {

                    const summary = summaries[i];
                    const queryCallback = observerOriginalQueries[i].onElement;

                    if (summary.attributeChanged) {
                        for (const [attr, elements] of Object.entries(summary.attributeChanged)) {
                            for (const element of elements) {
                                queryCallback(element, attr, false);
                            }
                        }
                    }

                    for (const element of summary.added) {
                        queryCallback(element, '', false);
                    }

                    if (observerOriginalQueries[i].reparenting) {
                        for (const element of summary.reparented) {
                            queryCallback(element, '', true);
                        }
                    }
                }

            }),
            queries: summaryQueries
        });
    }

    observeTextContentElement(element, callback) {
        const observer = new MutationObserver(callback);

        observer.observe(element, {characterData: false, childList: true, attributes: false});
        return observer;
    }

    /** @param {Node} element @param {MutationObserverInit} options */
    observeElement(element, callback, options = {}) {
        const observer = new MutationObserver(callback);

        observer.observe(element, options);
        return observer;
    }
}

const observer = new Observer();