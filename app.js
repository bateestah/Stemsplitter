let audioCtx;
const fileInput = document.getElementById('fileInput');
const stemsContainer = document.getElementById('stems');

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = await audioCtx.decodeAudioData(arrayBuffer);
  const stems = await splitStems(buffer);
  renderStems(stems);
});

async function splitStems(buffer) {
  const configurations = {
    Bass: ctx => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      return filter;
    },
    Vocals: ctx => {
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1000;
      bandpass.Q.value = 1;
      return bandpass;
    },
    Drums: ctx => {
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 2000;
      return highpass;
    }
  };

  const stems = {};
  for (const [name, setup] of Object.entries(configurations)) {
    stems[name] = await renderStem(buffer, setup);
  }
  return stems;
}

function renderStem(buffer, setup) {
  return new Promise((resolve) => {
    const offline = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    const source = offline.createBufferSource();
    source.buffer = buffer;
    const node = setup(offline);
    source.connect(node).connect(offline.destination);
    source.start(0);
    offline.startRendering().then(rendered => resolve(rendered));
  });
}

function renderStems(stems) {
  stemsContainer.innerHTML = '';
  Object.entries(stems).forEach(([name, buffer]) => {
    const div = document.createElement('div');
    div.className = 'stem';
    const title = document.createElement('h3');
    title.textContent = name;

    const audio = document.createElement('audio');
    audio.controls = true;
    const wav = bufferToWavBlob(buffer);
    const url = URL.createObjectURL(wav);
    audio.src = url;

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Export MP3';
    downloadBtn.addEventListener('click', async () => {
      const mp3 = await encodeMp3(buffer);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(mp3);
      link.download = `${name}.mp3`;
      link.click();
    });

    div.appendChild(title);
    div.appendChild(audio);
    div.appendChild(downloadBtn);
    stemsContainer.appendChild(div);
  });
}

function bufferToWavBlob(buffer) {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  let offset = 0;

  function writeString(str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
    offset += str.length;
  }

  writeString('RIFF');
  view.setUint32(offset, 36 + buffer.length * buffer.numberOfChannels * 2, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, buffer.numberOfChannels, true); offset += 2;
  view.setUint32(offset, buffer.sampleRate, true); offset += 4;
  view.setUint32(offset, buffer.sampleRate * buffer.numberOfChannels * 2, true); offset += 4;
  view.setUint16(offset, buffer.numberOfChannels * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString('data');
  view.setUint32(offset, buffer.length * buffer.numberOfChannels * 2, true); offset += 4;

  const channels = [];
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let sample = 0;
  while (sample < buffer.length) {
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const s = Math.max(-1, Math.min(1, channels[i][sample]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
    sample++;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function encodeMp3(buffer) {
  return new Promise((resolve, reject) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ctx.createMediaStreamDestination();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(dest);
      const mimeType = MediaRecorder.isTypeSupported('audio/mpeg') ? 'audio/mpeg' : 'audio/webm';
      const recorder = new MediaRecorder(dest.stream, { mimeType });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      source.onended = () => recorder.stop();
      recorder.start();
      source.start();
    } catch (err) {
      reject(err);
    }
  });
}
