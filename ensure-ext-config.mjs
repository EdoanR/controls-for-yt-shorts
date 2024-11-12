import fs from 'fs/promises'

async function createTemplateIfMissing() {
  try {
    await fs.stat('./.ext.mjs');
    return
  } catch (err) {
    console.log('".ext.js" missing. Creating new from template.')
    await fs.copyFile('./.ext-template.mjs', './.ext.mjs')
  }
}

createTemplateIfMissing();