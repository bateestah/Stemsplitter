# Stem Splitter

Simple browser-based app that splits an MP3 into rough stems using the Web Audio API. No server-side processing or external APIs are required.

## Features
- Upload an MP3 file
- Generates three stems: Bass, Vocals and Drums (using simple frequency filtering)
- Listen to each stem individually
- Export stems to MP3 using browser's `MediaRecorder` (falls back to WebM when MP3 isn't supported)

## Development
This project is a static site. Deploy to Vercel by importing the repository.

### Testing
```
npm test
```
