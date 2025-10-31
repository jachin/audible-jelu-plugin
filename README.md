# Audible to Jelu Importer

A browser extension that imports audiobooks from Audible to your self-hosted [Jelu](https://github.com/bayang/jelu) library.

## Features

✨ **Smart Auto-Detection**: Automatically scrapes book data when you visit Audible book pages
🔍 **Duplicate Prevention**: Checks if books already exist in your library before importing
🔐 **Persistent Sessions**: Remembers your Jelu credentials using secure token authentication

## Installation

### From Pre-built Package (Recommended)

Download the latest release package for your browser from the [Releases](https://github.com/jachin/audible-jelu-plugin/releases) page.

#### Firefox

1. **Download** `audible-jelu-plugin-firefox-v*.zip` from the releases page
2. **Open Firefox** and navigate to `about:addons`
3. **Click the gear icon** ⚙️ and select "Install Add-on From File..."
4. **Select** the downloaded `.zip` file
5. **Note**: Firefox may show a warning that the extension is not signed. You'll need to:
   - Navigate to `about:config`
   - Search for `xpinstall.signatures.required`
   - Set it to `false` (this allows unsigned extensions)
   - Or use [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/) or [Firefox Nightly](https://www.mozilla.org/en-US/firefox/channel/desktop/#nightly) which allow unsigned extensions by default

#### Chrome/Edge

1. **Download** `audible-jelu-plugin-chrome-v*.zip` from the releases page
2. **Extract** the zip file to a permanent location (don't delete it!)
3. **Open Chrome/Edge** and navigate to `chrome://extensions/` (or `edge://extensions/`)
4. **Enable "Developer mode"** (toggle in the top right)
5. **Click "Load unpacked"**
6. **Select** the extracted folder
7. **Note**: Chrome will show a warning about developer mode extensions on each startup

### From Source (Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jachin/audible-jelu-plugin
   cd audible-jelu-plugin
   ```

2. **Install dependencies** (requires [Devbox](https://www.jetify.com/devbox)):
   ```bash
   devbox shell
   ```

3. **Build the extension** (optional):
   ```bash
   devbox run build:all
   ```
   This creates distributable packages in the `dist/` directory.

4. **Load in Firefox**:
   - Open Firefox and navigate to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from the project directory

5. **Load in Chrome/Edge**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory

### Building

If you want to build the extension packages yourself:

```bash
# Build both Firefox and Chrome packages
devbox run build:all

# Build only Firefox
devbox run build:firefox

# Build only Chrome
devbox run build:chrome

# Lint the extension code
devbox run lint
```

Build artifacts will be created in the `dist/` directory.

## Development

### Creating a Release

Releases are automatically built and published via GitHub Actions when you push a version tag:

1. **Update the version** in `package.json`:
   ```bash
   # Edit package.json and update the version field
   ```

2. **Commit the version change**:
   ```bash
   git add package.json
   git commit -m "Bump version to 1.0.1"
   ```

3. **Create and push a version tag**:
   ```bash
   git tag v1.0.1
   git push origin master
   git push origin v1.0.1
   ```

4. **GitHub Actions will automatically**:
   - Build both Firefox and Chrome packages
   - Create a new release on GitHub
   - Upload the built artifacts to the release

The release will be available at: `https://github.com/jachin/audible-jelu-plugin/releases`

## Usage

### Initial Setup

1. **Install the extension** and navigate to any Audible book page
2. **Click the extension icon** in your browser toolbar
3. **Configure Jelu connection**:
   - Enter your Jelu server URL (e.g., `https://books.example.com`)
   - Enter your Jelu username and password
   - Click "Connect to Jelu"

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Jelu](https://github.com/bayang/jelu) - The amazing self-hosted reading tracker
- [Audible](https://audible.com) - For the audiobook metadata
