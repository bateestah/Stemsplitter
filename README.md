# Stem Splitter Web App

A simple Flask-based web application that allows users to upload an MP3 file and split it into four stems (vocals, drums, bass, other) locally using [Spleeter](https://github.com/deezer/spleeter). The resulting stems can be played back individually in the browser or downloaded as MP3 files.

## Usage

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Ensure `ffmpeg` is available in your system (required by Spleeter for MP3 output).

3. Run the application:

```bash
python app.py
```

4. Open your browser and navigate to `http://127.0.0.1:5000/`. Upload an MP3 file to split it into stems.

All processing happens locally; no external APIs are used.
