# Stem Splitter

A simple Next.js web app for uploading an MP3 file, splitting it into stems using [Demucs](https://github.com/facebookresearch/demucs), previewing each stem, and downloading them as MP3s.

## Setup

Requirements:
- Node.js 18+
- Python 3 with `demucs` and `ffmpeg` available in the environment

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

The API route uses a Python script to call Demucs and generate MP3 stems in the `public/stems` directory so they can be served and downloaded.
