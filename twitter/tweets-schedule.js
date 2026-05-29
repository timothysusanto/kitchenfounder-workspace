// KitchenFounder + RocketDoge Daily Tweet Scheduler
// Uses Twitter API v1.1 statuses/update (free tier compatible)
// node tweets-schedule.js

const tweets = [
  "The restaurant industry runs on 6% margins and 80-hour weeks. The people grinding it deserve a coin. $ROCKETDOGE was built for them. #RocketDoge #Solana",
  "Most meme coins are built by people who have never built anything. RocketDoge is different. Real operators. Real grind. Real utility coming. #RocketDoge #SOL",
  "Every chef who has ever worked a double shift, every operator who has ever missed a mortgage payment. This coin is for you. $ROCKETDOGE #RocketDoge",
  "The people who feed the world do not own any of it. That changes now. $ROCKETDOGE #Solana #RocketDoge",
  "Low and slow wins. BBQ. Business. Crypto. $ROCKETDOGE is not in a rush. The bark takes time. #RocketDoge #Solana",
  "KitchenFounder x RocketDoge. F&B operators building wealth on their own terms. Utility is coming. Stay close. #RocketDoge #KitchenFounder #Solana",
  "Still here. Still building. $ROCKETDOGE on Solana. The coin that does not sleep. #RocketDoge #Solana",
  "The gap between loving food and running a profitable restaurant is just information. We wrote it down. kitchenfounder.com #KitchenFounder",
  "Food cost under 30. Contribution margin above $15. These are the numbers that keep restaurants alive. We teach them. kitchenfounder.com #KitchenFounder",
  "Your first restaurant does not need to be perfect. It needs to be profitable. There is a difference. kitchenfounder.com #KitchenFounder",
  "The best chefs in the world cannot run a restaurant if they do not know their numbers. This is the guide they never got. kitchenfounder.com #KitchenFounder",
  "Thai street food. Italian trattoria. Japanese izakaya. Korean BBQ. Each one a complete operating system. kitchenfounder.com #KitchenFounder",
  "17 cuisine concepts. Full recipe cards. US market food costing. Service scripts. P&L projections. $29.99. kitchenfounder.com #KitchenFounder",
  "The smoke ring on a brisket is not aesthetic. It is proof the collagen converted. Knowing why separates a chef from a pitmaster. #KitchenFounder",
];

const now = new Date();
const start = new Date(now.getFullYear(), 0, 0);
const dayOfYear = Math.floor((now - start) / 86400000);
const index = dayOfYear % tweets.length;
const selectedTweet = tweets[index];

console.log("Day " + dayOfYear + " — posting tweet #" + index);
console.log(selectedTweet);

const https = require('https');
const crypto = require('crypto');

const API_KEY        = 'RKIqxg7NWnAyyXzwktnPlYmT7';
const API_KEY_SECRET = '5wCoFnxE0QFx2qTR8DBzWwazRNMjWsGGW8520Bpi6HmYRDJ7bt';
const ACCESS_TOKEN   = '1976192966286008320-oKA8ERJCmFuX0HluL6JbZkvUjfv7Wo';
const ACCESS_SECRET  = 'kZAG4qPRyajuHYIeiTA9BfPVogCXe02gfFqUsPMnymcrZ';

// Twitter API v1.1 endpoint
const ENDPOINT_URL = 'https://api.twitter.com/1.1/statuses/update.json';

function pct(s) {
  return encodeURIComponent(String(s))
    .replace(/!/g,'%21').replace(/'/g,'%27')
    .replace(/\(/g,'%28').replace(/\)/g,'%29').replace(/\*/g,'%2A');
}

function buildAuthHeader(method, url, bodyParams) {
  const oauthParams = {
    oauth_consumer_key:     API_KEY,
    oauth_nonce:            crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        String(Math.floor(Date.now() / 1000)),
    oauth_token:            ACCESS_TOKEN,
    oauth_version:          '1.0',
  };

  // For v1.1 form posts, body params ARE included in signature
  const allParams = Object.assign({}, oauthParams, bodyParams);

  const paramString = Object.keys(allParams).sort()
    .map(k => pct(k) + '=' + pct(allParams[k])).join('&');

  const baseString = [
    method.toUpperCase(),
    pct(url),
    pct(paramString),
  ].join('&');

  const signingKey = pct(API_KEY_SECRET) + '&' + pct(ACCESS_SECRET);
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  oauthParams.oauth_signature = signature;

  return 'OAuth ' + Object.keys(oauthParams).sort()
    .map(k => pct(k) + '="' + pct(oauthParams[k]) + '"').join(', ');
}

// v1.1 uses form-encoded body
const bodyParams = { status: selectedTweet };
const bodyString = Object.keys(bodyParams)
  .map(k => pct(k) + '=' + pct(bodyParams[k])).join('&');

const authHeader = buildAuthHeader('POST', ENDPOINT_URL, bodyParams);
const urlObj = new URL(ENDPOINT_URL);

const options = {
  hostname: urlObj.hostname,
  path: urlObj.pathname,
  method: 'POST',
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(bodyString),
  },
};

const req = https.request(options, function(res) {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    let r;
    try { r = JSON.parse(data); } catch(e) { r = data; }
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const id = r && r.id_str;
      console.log('Tweet posted successfully!');
      console.log('Tweet ID: ' + id);
      console.log('URL: https://twitter.com/i/web/status/' + id);
    } else {
      console.error('Error ' + res.statusCode + ':', JSON.stringify(r, null, 2));
      process.exit(1);
    }
  });
});

req.on('error', e => { console.error(e); process.exit(1); });
req.write(bodyString);
req.end();
