# Stem Splitter Web App

This repository contains two implementations for splitting an MP3 file into separate audio stems:

1. **Flask demo** – A Python application (`app.py`) that performs separation on the server using the original [Spleeter](https://github.com/deezer/spleeter) library. This version is useful for local experimentation.
2. **Browser/Vercel app** – A fully client‑side application found in the `browser/` directory. It runs entirely in the user's browser using a WebAssembly build of Spleeter and `ffmpeg.wasm`, making it suitable for deployment on [Vercel](https://vercel.com) without any custom backend or external APIs.

Both versions allow users to play back individual stems and download them as MP3 files.

## Browser/Vercel App

The `browser/` folder contains a static site that can be deployed directly to Vercel. The page loads the Spleeter model and ffmpeg encoder in the browser, enabling stem separation and MP3 export completely offline.

### Development

```bash
cd browser
npm test    # placeholder test command
```

Open `browser/index.html` in your browser (or deploy the repository to Vercel) and upload an MP3 file to split it into stems. Each stem can be listened to individually and downloaded as an MP3.

## Flask Demo

For the original Python-based example:

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Ensure `ffmpeg` is available in your system (required by Spleeter for MP3 output).
3. Run the application:
   ```bash
   python app.py
   ```
4. Navigate to `http://127.0.0.1:5000/` and upload an MP3 file.

All processing happens locally; no external APIs are used.
