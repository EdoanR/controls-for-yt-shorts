const localizeGetLanguage = function () {
  let lang = chrome.i18n.getMessage('@@ui_locale');
  let hasTranslation =
    chrome.i18n.getMessage('ThisLanguage') !== lang ? false : true;

  if (!hasTranslation) return 'en';
  return lang;
};

const localizeHtmlPage = function () {
  const prefix = 'data-i18n';
  const attributes = [
    '',
    'placeholder',
    'title',
    'value',
    'innerHTML',
    'aria-label',
  ];

  for (let at of attributes) {
    let attribute = `${prefix}-${at}`;

    if (!at) attribute = prefix;

    let elements = document.querySelectorAll(`[${attribute}]`);
    for (let element of elements) {
      let messageName = element.getAttribute(attribute);
      let message = chrome.i18n.getMessage(messageName);

      if (!message) {
        console.log(`Message i18n "${messageName}" not found.`, element);
        continue;
      }

      if (at == 'innerHTML') {
        element.innerHTML = message;
      } else if (!at) {
        for (let childNode of element.childNodes) {
          if (childNode.nodeType === Node.TEXT_NODE) {
            childNode.nodeValue = message;
          }
        }
      } else {
        element.setAttribute(at, message);
      }
    }
  }

  // Data urls

  let lang = localizeGetLanguage();
  if (lang == 'en') return;

  let urlElements = document.querySelectorAll('[data-i18n-url]');

  for (let element of urlElements) {
    let attType = element.getAttribute('data-i18n-url');
    if (!attType) {
      console.log(
        '[localize.js] Element with data-i18n-url without provinding the attribute data-i18n-type',
        element,
      );
      continue;
    }

    let url = element.getAttribute(attType);
    if (!url) {
      console.log(
        `[localize.js] Attribute provided by data-i18n-type ("${attType}"), dont exist on the element`,
        element,
      );
      continue;
    }

    let newUrl = url.replace(/en\//g, `${lang}/`);

    element.setAttribute(attType, newUrl);
  }
};

const i18n = (messageName) => {
  if (!messageName) return '';
  return chrome.i18n.getMessage(messageName);
};

localizeHtmlPage();
