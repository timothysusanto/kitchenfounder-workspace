#!/usr/bin/env node
'use strict';

const https = require('https');
const crypto = require('crypto');

// ── Credentials ────────────────────────────────────────────────────────────
const API_KEY        = 'RKIqxg7NWnAyyXzwktnPlYmT7';
const API_KEY_SECRET = '5wCoFnxE0QFx2qTR8DBzWwazRNMjWsGGW8520Bpi6HmYRDJ7bt';
const ACCESS_TOKEN   = '1976192966286008320-oKA8ERJCmFuX0HluL6JbZkvUjfv7Wo';
const ACCESS_SECRET  = 'kZAG4qPRyajuHYIeiTA9BfPVogCXe02gfFqUsPMnymcrZ';

const ENDPOINT_URL   = 'https://api.twitter.com/2/tweets';

// ── Helpers ─────────────────────────────────────────────────────────────────

// RFC 3986 percent-encode
function percentEncode(str) {
  return encodeURIComponent(String(str))
    .replace(/!/g,  '%21')
    .replace(/'/g,  '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

// Generate a random nonce (hex string)
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

// Current Unix timestamp as a string
function timestamp() {
  return String(Math.floor(Date.now() / 1000));
}

// Build the OAuth 1.0a Authorization header
// For JSON body requests, body params are NOT included in the signature base string
function buildAuthHeader(method, url) {
  const oauthParams = {
    oauth_consumer_key:     API_KEY,
    oauth_nonce:            generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        timestamp(),
    oauth_token:            ACCESS_TOKEN,
    oauth_version:          '1.0',
  };

  // Collect and sort params for the base string
  const paramString = Object.keys(oauthParams)
    .sort()
    .map(k => percentEncode(k) + '=' + percentEncode(oauthParams[k]))
    .join('&');

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&');

  const signingKey = percentEncode(API_KEY_SECRET) + '&' + percentEncode(ACCESS_SECRET);

  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  // Build the Authorization header value
  const headerValue = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(k => percentEncode(k) + '="' + percentEncode(oauthParams[k]) + '"')
    .join(', ');

  return headerValue;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function postTweet(text) {
  return new Promise(function(resolve, reject) {
    const body = JSON.stringify({ text: text });
    const method = 'POST';
    const authHeader = buildAuthHeader(method, ENDPOINT_URL);

    const url = new URL(ENDPOINT_URL);
    const options = {
      hostname: url.hostname,
      path:     url.pathname,
      method:   method,
      headers: {
        'Authorization': authHeader,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch(e) {
          parsed = data;
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: parsed });
        } else {
          const err = new Error('Twitter API error ' + res.statusCode);
          err.status = res.statusCode;
          err.body = parsed;
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── CLI entry ────────────────────────────────────────────────────────────────

const tweetText = process.argv[2];

if (!tweetText || tweetText.trim() === '') {
  console.error('Usage: node post-tweet.js "Your tweet text here"');
  process.exit(1);
}

if (tweetText.length > 280) {
  console.error('Error: Tweet text is ' + tweetText.length + ' characters (max 280).');
  process.exit(1);
}

postTweet(tweetText.trim())
  .then(function(result) {
    const body = result.body;
    const id = (body && body.data && body.data.id) || (body && body.id) || '(unknown)';
    console.log('Tweet posted successfully!');
    console.log('  Tweet ID : ' + id);
    console.log('  URL      : https://twitter.com/i/web/status/' + id);
  })
  .catch(function(err) {
    console.error('Failed to post tweet: ' + err.message);
    if (err.body) {
      console.error('  Response:', JSON.stringify(err.body, null, 2));
    }
    process.exit(1);
  });
