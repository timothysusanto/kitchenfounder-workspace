#!/usr/bin/env node
'use strict';
/** Small CLI for cron jobs and first-time setup.
 *   node src/cli.js poll            -> check all in-flight HeyGen renders, download finished ones
 *   node src/cli.js heygen:avatars  -> list avatar ids on your HeyGen account
 *   node src/cli.js heygen:voices   -> list English voice ids
 *   node src/cli.js scripts <productId> [count] -> generate scripts for a product
 */
const jobs = require('./jobs');
const heygen = require('./heygen');

async function main() {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'poll') {
    console.log(JSON.stringify(await jobs.pollVideos()));
  } else if (cmd === 'heygen:avatars') {
    const list = await heygen.listAvatars();
    for (const av of list.slice(0, 50)) console.log(`${av.avatar_id}\t${av.avatar_name || ''}\t${av.gender || ''}`);
  } else if (cmd === 'heygen:voices') {
    const list = await heygen.listVoices();
    for (const v of list.filter((x) => /^en|english/i.test(x.language || '')).slice(0, 80)) console.log(`${v.voice_id}\t${v.name || ''}\t${v.language || ''}\t${v.gender || ''}`);
  } else if (cmd === 'scripts') {
    const scripts = await jobs.scriptsForProduct(Number(a), Number(b || 20));
    for (const s of scripts) console.log(`${s.idx}\t${s.compliance.status}\t${s.hook}`);
  } else {
    console.log('usage: node src/cli.js <poll|heygen:avatars|heygen:voices|scripts <productId> [count]>');
    process.exit(1);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
