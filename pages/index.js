import { useState } from 'react';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [stems, setStems] = useState({});
  const [loading, setLoading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/separate', { method: 'POST', body: form });
    const json = await res.json();
    setStems(json.stems || {});
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Stem Splitter</h1>
      <input type="file" accept="audio/mp3" onChange={handleFile} />
      {loading && <p>Processing...</p>}
      <div className={styles.stems}>
        {Object.entries(stems).map(([name, url]) => (
          <div key={name} className={styles.stem}>
            <h3>{name}</h3>
            <audio controls src={url}></audio>
            <a className={styles.download} href={url} download={`${name}.mp3`}>
              Download
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
