import { useState } from 'react';

export default function Home() {
  const [stems, setStems] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fileInput = e.target.elements.file;
    if (!fileInput.files.length) return;
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    setLoading(true);
    setStems(null);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setStems(data.stems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Stem Splitter</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" name="file" accept="audio/mpeg" />
        <button type="submit">Split</button>
      </form>
      {loading && <p>Processing...</p>}
      {stems && (
        <div>
          {Object.entries(stems).map(([name, url]) => (
            <div key={name} style={{ marginTop: '1rem' }}>
              <h3>{name}</h3>
              <audio controls src={url} style={{ width: '100%' }} />
              <div>
                <a href={url} download>{`Download ${name}`}</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
