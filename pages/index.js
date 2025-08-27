import { useEffect, useState } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });

export default function Home() {
  const [ready, setReady] = useState(false);
  const [audio, setAudio] = useState(null);
  const [file, setFile] = useState(null);
  const [stems, setStems] = useState([]);

  useEffect(() => {
    ffmpeg.load().then(() => setReady(true));
  }, []);

  const upload = (e) => {
    const f = e.target.files?.item(0);
    if (f) {
      setFile(f);
      setAudio(URL.createObjectURL(f));
    }
  };

  const split = async () => {
    if (!file) return;
    setStems([]);
    ffmpeg.FS('writeFile', 'input.mp3', await fetchFile(file));
    // Low frequencies
    await ffmpeg.run('-i', 'input.mp3', '-af', 'lowpass=f=200', 'low.mp3');
    // Mid frequencies
    await ffmpeg.run('-i', 'input.mp3', '-af', 'highpass=f=200,lowpass=f=2000', 'mid.mp3');
    // High frequencies
    await ffmpeg.run('-i', 'input.mp3', '-af', 'highpass=f=2000', 'high.mp3');

    const lowData = ffmpeg.FS('readFile', 'low.mp3');
    const midData = ffmpeg.FS('readFile', 'mid.mp3');
    const highData = ffmpeg.FS('readFile', 'high.mp3');

    setStems([
      { name: 'Low', url: URL.createObjectURL(new Blob([lowData.buffer], { type: 'audio/mpeg' })) },
      { name: 'Mid', url: URL.createObjectURL(new Blob([midData.buffer], { type: 'audio/mpeg' })) },
      { name: 'High', url: URL.createObjectURL(new Blob([highData.buffer], { type: 'audio/mpeg' })) },
    ]);
  };

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1>Stem Splitter</h1>
      {!ready && <p>Loading ffmpeg...</p>}
      {ready && (
        <>
          <input type="file" accept="audio/mp3" onChange={upload} />
          {audio && (
            <div style={{ marginTop: '1rem' }}>
              <audio controls src={audio}></audio>
              <div>
                <button onClick={split} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
                  Split into stems
                </button>
              </div>
            </div>
          )}
          {stems.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h2>Stems</h2>
              {stems.map((stem) => (
                <div key={stem.name} style={{ marginBottom: '1rem' }}>
                  <h3>{stem.name}</h3>
                  <audio controls src={stem.url}></audio>
                  <div>
                    <a href={stem.url} download={`${stem.name.toLowerCase()}.mp3`}>Download</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
