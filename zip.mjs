import path from 'node:path';
import fs from 'fs-extra';
import JSZip from 'jszip';
import { glob } from 'glob';

async function zipProject() {
  try {
    // Read package.json and manifest.json for name and version
    const packageJson = await fs.readJson('./package.json');
    const manifestJson = await fs.readJson('./manifest.json');

    const outputDir = path.join(process.cwd(), '.output');
    const zipFileName = `${packageJson.name}-${manifestJson.version}.zip`;
    const zipFilePath = path.join(outputDir, zipFileName);

    // Ensure output directory exists
    await fs.ensureDir(outputDir);

    // Define exclusion rules
    const excludePatterns = [
      '**/node_modules/**',
      '**/scss/**',
      'zip.mjs',
      '.ext-template.mjs',
      '.prettierignore',
      '.gitignore',
      'jsconfig.json',
      'package.json',
      'package-lock.json',
      'prettier.config.mjs',
      'ensure-ext-config.mjs',
    ];

    // Read .gitignore to get additional exclusions
    let gitignorePatterns = [];
    try {
      const gitignore = await fs.readFile('.gitignore', 'utf-8');
      gitignorePatterns = gitignore
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);
    } catch (err) {
      console.log('.gitignore not found or unreadable, skipping...');
    }

    // Combine exclusion patterns
    const allExcludePatterns = [...excludePatterns, ...gitignorePatterns];

    // Find all files that are not excluded
    const files = await glob(['**/*'], {
      ignore: allExcludePatterns,
      nodir: true,
    });

    if (files.length === 0) {
      console.log('No files to zip, exiting...');
      return;
    }

    // Create the zip file
    const zip = new JSZip();
    for (const file of files) {
      const content = await fs.readFile(file);
      zip.file(file, content);
    }

    // Write the zip file
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
    await fs.writeFile(zipFilePath, zipContent);

    console.log(`Zip file created: ${zipFilePath}`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Run the zip function
zipProject();
