import formidable from 'formidable';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const form = formidable({ multiples: false, uploadDir: '/tmp', keepExtensions: true });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Upload failed' });
    }
    const file = files.file;
    const input = Array.isArray(file) ? file[0] : file;
    const outDir = path.join('/tmp', path.basename(input.filepath) + '_out');

    const demucs = spawn('demucs', ['-o', outDir, input.filepath]);

    demucs.on('error', (e) => {
      console.error(e);
      return res.status(500).json({ error: 'Demucs execution failed' });
    });

    demucs.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Demucs exited with code ' + code });
      }
      try {
        const songName = path.parse(input.originalFilename).name;
        const stemPath = path.join(outDir, 'htdemucs', songName);
        const stems = {};
        const files = fs.readdirSync(stemPath);
        files.forEach((stemFile) => {
          const full = path.join(stemPath, stemFile);
          const mp3Path = full.replace(/\.wav$/, '.mp3');
          // Convert to mp3 using ffmpeg
          spawn('ffmpeg', ['-y', '-i', full, mp3Path]).on('close', () => {
            const data = fs.readFileSync(mp3Path).toString('base64');
            const name = stemFile.replace(/\.wav$/, '');
            stems[name] = `data:audio/mpeg;base64,${data}`;
            if (Object.keys(stems).length === files.length) {
              res.status(200).json({ stems });
            }
          });
        });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Failed to prepare stems' });
      }
    });
  });
}
