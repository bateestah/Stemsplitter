import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [stems, setStems] = useState([]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);

    // Lazy-load heavy libs so initial page load stays fast
    const [{ Spleeter }, { createFFmpeg, fetchFile }] = await Promise.all([
      import('spleeter-wasm'),
      import('@ffmpeg/ffmpeg')
    ]);

    // Initialize spleeter and ffmpeg
    const spleeter = await Spleeter.open();
    const ffmpeg = createFFmpeg({ log: false });
    if (!ffmpeg.isLoaded()) await ffmpeg.load();

    const arrayBuffer = await file.arrayBuffer();
    const separation = await spleeter.separate(arrayBuffer, { model: '4stems' });

    const processed = [];
    for (const [name, data] of Object.entries(separation)) {
      const wavBlob = new Blob([data], { type: 'audio/wav' });
      const wavUrl = URL.createObjectURL(wavBlob);

      // Convert each stem to mp3 using ffmpeg.wasm
      ffmpeg.FS('writeFile', `${name}.wav`, await fetchFile(wavBlob));
      await ffmpeg.run('-i', `${name}.wav`, '-codec:a', 'libmp3lame', `${name}.mp3`);
      const mp3Data = ffmpeg.FS('readFile', `${name}.mp3`);
      const mp3Blob = new Blob([mp3Data.buffer], { type: 'audio/mpeg' });
      const mp3Url = URL.createObjectURL(mp3Blob);
      ffmpeg.FS('unlink', `${name}.wav`);
      ffmpeg.FS('unlink', `${name}.mp3`);

      processed.push({ name, wavUrl, mp3Url });
    }

    setStems(processed);
    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Stem Splitter</h1>
      <input type="file" accept="audio/mpeg" onChange={handleFile} />
      {loading && <p>Processing... this may take a while.</p>}
      {stems.map(({ name, wavUrl, mp3Url }) => (
        <div className="stem" key={name}>
          <h3>{name}</h3>
          <audio controls src={wavUrl}></audio>
          <div>
            <a href={mp3Url} download={`${name}.mp3`}>
              <button>Download MP3</button>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
