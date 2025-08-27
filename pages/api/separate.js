import formidable from 'formidable';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const form = formidable({ multiples: false });
  const files = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });

  const file = files.file;
  const inputPath = file.filepath || file.path;
  const id = uuidv4();
  const outRoot = path.join(os.tmpdir(), id);
  fs.mkdirSync(outRoot);

  await new Promise((resolve, reject) => {
    const p = spawn('demucs', ['-o', outRoot, inputPath]);
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('demucs failed'));
    });
  });

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const stemsDir = path.join(outRoot, baseName);
  const stemFiles = fs.readdirSync(stemsDir).filter((f) => f.endsWith('.wav'));

  const result = {};
  for (const stem of stemFiles) {
    const wavPath = path.join(stemsDir, stem);
    const mp3Path = wavPath.replace(/\.wav$/, '.mp3');
    await new Promise((resolve, reject) => {
      const c = spawn('ffmpeg', ['-y', '-i', wavPath, mp3Path]);
      c.on('error', reject);
      c.on('close', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg failed'))));
    });
    const data = fs.readFileSync(mp3Path).toString('base64');
    const name = path.basename(mp3Path, '.mp3');
    result[name] = `data:audio/mp3;base64,${data}`;
  }

  res.status(200).json({ stems: result });
}
