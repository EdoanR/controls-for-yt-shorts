# Contributing Guide

Contributions are welcome! If you want to help improve this extension, follow these steps to set up the project locally.

## Project Philosophy & Scope

> [!IMPORTANT]
> This extension is built to be simple, lightweight, and highly focused. It is designed purely to add a simple control bar and shortcuts for YouTube Shorts. To avoid bloating the extension, we aim to keep the feature set minimal.
> 
> Because of this:
> - **Prioritize bug fixes** as YouTube always is changing and breaking the extension.
> - **Some pull requests may be declined** if they introduce complex or out-of-scope features.
> - Before starting work on a new feature or major change, please **open an issue to discuss it first** so we can align on whether it fits the project or not.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/)

## Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/EdoanR/controls-for-yt-shorts.git
   cd controls-for-yt-shorts
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   *Note: This will automatically generate a `.ext.mjs` config file from the template `.ext-template.mjs` if it doesn't already exist.*

## Development Workflow

1. **Start the development server:**
   ```bash
   npm run dev
   ```
   This command compiles and watches SCSS files (`sass --watch scss:css`) and starts a Chromium instance using `web-ext` pointing to YouTube Shorts.

2. **Customizing the environment:**
   If you want to use a specific Chrome profile (to persist logins, settings, extensions, etc.), edit `.ext.mjs` and specify the `chromiumProfile` path and `keepProfileChanges: true`. For example:
   ```javascript
   webExt.cmd.run({
     target: 'chromium',
     startUrl: 'https://www.youtube.com/shorts/',
     sourceDir: __dirname,
     keepProfileChanges: true,
     chromiumProfile: 'C:\\Users\\yourusername\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1',
   });
   ```

## Code Quality & Formatting

Before committing your changes, make sure to format the code to keep it consistent:
```bash
npm run format
```
This uses Prettier to auto-format all code in the workspace according to the project's formatting rules.

## Packaging & Building

To build the extension into a zip file for distribution, run:
```bash
npm run zip
```
The packaged file will be generated in the `.output` folder.

## Submitting a Pull Request

1. Fork the repository and create a new branch from `main`.
2. Implement your feature or bug fix.
3. Test your changes locally to ensure everything works correctly.
4. Run `npm run format` to clean up the code.
5. Commit your changes with clear, descriptive commit messages.
6. Push to your fork and submit a Pull Request!
