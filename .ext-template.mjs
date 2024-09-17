import webExt from 'web-ext';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://extensionworkshop.com/documentation/develop/web-ext-command-reference/
webExt.cmd.run({
  target: 'chromium',
  startUrl: 'https://www.youtube.com/shorts/',
  sourceDir: __dirname,
});
