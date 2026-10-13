'use strict';
const config = require('./config');

const BASE = 'https://api.heygen.com';

function headers() {
  if (!config.heygen.apiKey) throw new Error('HEYGEN_API_KEY is not set');
  return { 'X-Api-Key': config.heygen.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' };
}

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`HeyGen ${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
  if (json.error) throw new Error(`HeyGen ${path} error: ${JSON.stringify(json.error)}`);
  return json;
}

async function listAvatars() {
  const json = await call('GET', '/v2/avatars');
  return json.data?.avatars || [];
}

async function listVoices() {
  const json = await call('GET', '/v2/voices');
  return json.data?.voices || [];
}

/** Resolve avatar/voice from env, or fall back to the first available so a first render needs no setup. */
async function resolveDefaults() {
  let avatarId = config.heygen.avatarId;
  let voiceId = config.heygen.voiceId;
  if (!avatarId) {
    const avatars = await listAvatars();
    if (!avatars.length) throw new Error('No HeyGen avatars available on this account');
    avatarId = avatars[0].avatar_id;
  }
  if (!voiceId) {
    const voices = await listVoices();
    const en = voices.find((v) => /^en/i.test(v.language || '') || /english/i.test(v.language || '')) || voices[0];
    if (!en) throw new Error('No HeyGen voices available on this account');
    voiceId = en.voice_id;
  }
  return { avatarId, voiceId };
}

/**
 * Create a 1080x1920 avatar video from spoken text. Returns the provider video id.
 * HeyGen's own captions are enabled so every render carries burned-in subtitles.
 */
async function generateVideo({ text, title, avatarId, voiceId }) {
  const body = {
    title: title || 'ad',
    caption: true,
    dimension: { width: 1080, height: 1920 },
    video_inputs: [
      {
        character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
        voice: { type: 'text', voice_id: voiceId, input_text: text },
      },
    ],
  };
  const json = await call('POST', '/v2/video/generate', body);
  const id = json.data?.video_id;
  if (!id) throw new Error(`HeyGen returned no video_id: ${JSON.stringify(json).slice(0, 300)}`);
  return id;
}

/** @returns {{status:string, video_url?:string, thumbnail_url?:string, duration?:number, error?:any}} */
async function getStatus(videoId) {
  const json = await call('GET', `/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`);
  const d = json.data || {};
  return { status: d.status, video_url: d.video_url, thumbnail_url: d.thumbnail_url, duration: d.duration, error: d.error };
}

module.exports = { listAvatars, listVoices, resolveDefaults, generateVideo, getStatus };
