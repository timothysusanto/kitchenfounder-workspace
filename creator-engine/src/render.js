'use strict';
/**
 * Post-processing: download the finished HeyGen file (its URL expires in 7 days) and burn a small,
 * permanent "AI presenter" label into the corner with FFmpeg. The platform-level AI labels
 * (Meta "AI Info", TikTok AI Disclosure, YouTube altered-content) are still set when publishing;
 * this makes the file itself honest even when it is forwarded.
 *
 * FFmpeg is optional: if it is not installed the original file is kept and the step is marked skipped.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const config = require('./config');

function hasFfmpeg() {
  return new Promise((resolve) => {
    const p = spawn('ffmpeg', ['-version']);
    p.on('error', () => resolve(false));
    p.on('exit', (code) => resolve(code === 0));
  });
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
  return dest;
}

function escapeDrawtext(s) {
  return s.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/%/g, '\\%');
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
    let err = '';
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${err.slice(-500)}`))));
  });
}

/**
 * @param {{id:number, video_url:string}} video
 * @param {string} label  text burned into the top-left corner
 * @returns {Promise<{localPath:string, labelled:boolean}>}
 */
async function finaliseVideo(video, label = 'AI presenter') {
  const dir = path.join(config.dataDir, 'videos');
  fs.mkdirSync(dir, { recursive: true });
  const raw = path.join(dir, `${video.id}.raw.mp4`);
  const out = path.join(dir, `${video.id}.mp4`);
  await download(video.video_url, raw);

  if (!(await hasFfmpeg())) {
    fs.renameSync(raw, out);
    return { localPath: out, labelled: false };
  }

  const draw = `drawtext=text='${escapeDrawtext(label)}':fontsize=34:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=14:x=40:y=60`;
  await runFfmpeg(['-i', raw, '-vf', draw, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'copy', '-movflags', '+faststart', out]);
  fs.unlinkSync(raw);
  return { localPath: out, labelled: true };
}

module.exports = { finaliseVideo, hasFfmpeg, escapeDrawtext };
