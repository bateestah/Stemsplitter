(async () => {
  const fileInput = document.getElementById('file');
  const container = document.getElementById('stems');
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Initialize ffmpeg.wasm
  const { createFFmpeg, fetchFile } = FFmpeg;
  const ffmpeg = createFFmpeg({ log: false });
  await ffmpeg.load();

  // Load Spleeter model for 4 stems
  const spleeter = await spleeterjs.create({ stems: 4 });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const result = await spleeter.separate(audioBuffer);

    container.innerHTML = '';
    for (const [name, buf] of Object.entries(result)) {
      // Convert AudioBuffer to WAV and then to MP3
      const wavData = audioBufferToWav(buf);
      ffmpeg.FS('writeFile', `${name}.wav`, await fetchFile(new Blob([wavData])));
      await ffmpeg.run('-i', `${name}.wav`, `${name}.mp3`);
      const mp3Data = ffmpeg.FS('readFile', `${name}.mp3`);
      const mp3Blob = new Blob([mp3Data.buffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(mp3Blob);

      const div = document.createElement('div');
      div.className = 'stem';
      div.innerHTML = `<h3>${name}</h3>`;
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = url;
      div.appendChild(audio);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${name}.mp3`;
      link.textContent = 'Download MP3';
      div.appendChild(link);

      container.appendChild(div);
    }
  });
})();

// Convert AudioBuffer to WAV ArrayBuffer
function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  let channels = [], i, sample, offset = 0, pos = 0;

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                  // length = 16
  setUint16(1);                                   // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);   // avg. bytes/sec
  setUint16(numOfChan * 2);                       // block-align
  setUint16(16);                                  // 16-bit (hardcoded)

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  // write interleaved data
  for(i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while(pos < length){
    for(i = 0; i < numOfChan; i++){                // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample*0.5) * 65535;         // scale to 16-bit unsigned int
      view.setUint16(pos, sample, true);          // write 16-bit sample
      pos += 2;
    }
    offset++;
  }

  return bufferArray;

  function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
}
