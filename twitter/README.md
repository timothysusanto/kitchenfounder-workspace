# Twitter/X Posting Script

Post tweets using Twitter API v2 + OAuth 1.0a. No npm packages needed.

## Usage

    node post-tweet.js "Your tweet text here"

## Examples

    node post-tweet.js "Hello from the terminal!"
    node post-tweet.js "Gm frens #Solana"

Success output:

    Tweet posted successfully!
      Tweet ID : 1234567890123456789
      URL      : https://twitter.com/i/web/status/1234567890123456789

## Twitter App

- App name : @RocketDogeSola
- Used for : Posting on behalf of @KitchenFounder
- Creds    : Hardcoded in post-tweet.js — keep this file private

## Rate Limits

- Free tier: 1,500 tweets/month (write limit)
- HTTP 429 is returned when the limit is exceeded

## How It Works

1. Builds OAuth 1.0a params: nonce, timestamp, consumer key, access token
2. Generates HMAC-SHA1 signature over sorted params + URL + HTTP method
3. POSTs to https://api.twitter.com/2/tweets with JSON body and OAuth header
4. Logs tweet ID + URL on success, or full error response on failure

## Requirements

- Node.js 12+ (uses built-in https and crypto only — zero npm deps)
