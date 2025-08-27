import { useState } from 'react';

export default function Home() {
  const [stems, setStems] = useState({});
  const [loading, setLoading] = useState(false);

  const handleUpload = async (event) => {
    event.preventDefault();
    const file = event.target.file.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      const res = await fetch('/api/separate', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Separation failed');
      const data = await res.json();
      setStems(data.stems);
    } catch (err) {
      console.error(err);
      alert('Failed to split file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Stem Splitter</h1>
      <form onSubmit={handleUpload}>
        <input type="file" name="file" accept="audio/mpeg" />
        <button type="submit" disabled={loading}>Split</button>
      </form>
      {loading && <p>Processing…</p>}
      {Object.keys(stems).length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          {Object.entries(stems).map(([name, url]) => (
            <div key={name} style={{ marginBottom: '1rem' }}>
              <h3>{name}</h3>
              <audio controls src={url}></audio>
              <div>
                <a href={url} download={`${name}.mp3`}>Download</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
