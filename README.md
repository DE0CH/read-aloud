# read-aloud

Paste text, pick a voice, and an AI voice reads it aloud: https://read.deyaochen.com (Cloudflare Access).

A Cloudflare Worker (`src/index.js`) serves the page (`public/`) and `POST /api/tts`, which splits the text into
sentence groups, asks the voice provider for up to three at a time and streams raw 24 kHz PCM back in order, so the
page starts playing after the first short piece (about 0.3 s). When it is done, the page offers the whole reading as a
WAV download.

Voices (`src/voices.js`):

- Deepgram Aura-2 on Cloudflare Workers AI (binding `AI`): English only.
- Qwen3-TTS Flash on Aliyun Model Studio (Beijing endpoint, `DASHSCOPE_API_KEY`): English and Mandarin.

`public/samples/` holds the same passage read by every voice, made through the live Worker.

Pushes to `main` deploy through `.github/workflows/deploy.yml` (`wrangler deploy`, then `scripts/smoke-test.sh`).
Actions secrets: `CLOUDFLARE_API_TOKEN` (Workers Scripts and Routes write only), `DASHSCOPE_API_KEY`,
`ACCESS_CLIENT_ID` / `ACCESS_CLIENT_SECRET` (an Access service token for the smoke test).
