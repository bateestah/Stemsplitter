import multiparty from 'multiparty';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new multiparty.Form({ uploadDir: '/tmp', keepExtensions: true });

  let file;
  try {
    [ , files ] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
    file = files.file[0];
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Upload failed' });
  }

  const splitScript = path.join(process.cwd(), 'python', 'split.py');
  const outDir = path.join('/tmp', `stems_${Date.now()}`);
  fs.mkdirSync(outDir);

  try {
    await execAsync(`python "${splitScript}" "${file.path}" "${outDir}"`);
    const destDir = path.join(process.cwd(), 'public', 'stems', path.basename(outDir));
    fs.mkdirSync(destDir, { recursive: true });
    const stems = {};
    for (const stemFile of fs.readdirSync(outDir)) {
      const src = path.join(outDir, stemFile);
      const dest = path.join(destDir, stemFile);
      fs.copyFileSync(src, dest);
      const stemName = path.parse(stemFile).name;
      stems[stemName] = `/stems/${path.basename(outDir)}/${stemFile}`;
    }
    return res.status(200).json({ stems });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Processing failed' });
  }
}
