# Audible to Jelu Importer

A browser extension that imports audiobooks from Audible to your self-hosted [Jelu](https://github.com/bayang/jelu) library.

## Features

✨ **Smart Auto-Detection**: Automatically scrapes book data when you visit Audible book pages
🔍 **Duplicate Prevention**: Checks if books already exist in your library before importing
🔐 **Persistent Sessions**: Remembers your Jelu credentials using secure token authentication

## Installation

### From Source (Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jachin/audible-jelu-plugin
   cd audible-jelu-plugin
   ```

2. **Load in Firefox**:
   - Open Firefox and navigate to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file

3. **Load in Chrome/Edge**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the plugin directory

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
