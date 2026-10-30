// Read-aloud Worker: serves the page (public/) and POST /api/tts, which streams raw PCM (s16le, 24 kHz, mono)
// so the page can start playing the first sentence while later ones are still being made.
import { VOICES } from "./voices.js";

const RATE = 24000;
const CHUNK = 400;        // characters per TTS request
const AHEAD = 3;          // requests in flight at once

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/voices") return Response.json(VOICES);
    if (url.pathname === "/api/tts" && req.method === "POST") return tts(req, env);
    return env.ASSETS.fetch(req);
  },
};

async function tts(req, env) {
  const { voice, text } = await req.json().catch(() => ({}));
  const v = VOICES.find((x) => x.id === voice);
  if (!v || !text || !text.trim()) return Response.json({ error: "voice and text are required" }, { status: 400 });
  if (text.length > 20000) return Response.json({ error: "text is over 20,000 characters" }, { status: 413 });

  const parts = split(text.trim());
  const make = v.provider === "qwen" ? (t) => qwen(env, v, t) : (t) => aura(env, v, t);
  const { readable, writable } = new TransformStream();
  const out = writable.getWriter();

  (async () => {
    // Start up to AHEAD requests early; write their audio strictly in order.
    const jobs = [];
    const start = (i) => { if (i < parts.length) jobs[i] = make(parts[i]); };
    for (let i = 0; i < AHEAD; i++) start(i);
    try {
      for (let i = 0; i < parts.length; i++) {
        const pcm = await jobs[i];
        start(i + AHEAD);
        await pcm.pipeTo(new WritableStream({ write: (c) => out.write(c) }));
      }
      await out.close();
    } catch (e) {
      await out.abort(e);
    }
  })();

  return new Response(readable, {
    headers: { "content-type": "audio/L16;rate=24000;channels=1", "x-parts": String(parts.length), "cache-control": "no-store" },
  });
}

// Sentences grouped up to CHUNK characters; an overlong sentence is cut at spaces/commas.
function split(text) {
  const sentences = text.match(/[^.!?。！？\n]+[.!?。！？]*[\s\n]*|[\n]+/g) || [text];
  const parts = [];
  let cur = "";
  for (let s of sentences) {
    while (s.length > CHUNK) {
      let cut = Math.max(s.lastIndexOf(" ", CHUNK), s.lastIndexOf("，", CHUNK), s.lastIndexOf(",", CHUNK));
      if (cut < CHUNK / 2) cut = CHUNK;
      if (cur.trim()) parts.push(cur);
      parts.push(s.slice(0, cut));
      cur = "";
      s = s.slice(cut);
    }
    if ((cur + s).length > CHUNK && cur.trim()) { parts.push(cur); cur = ""; }
    cur += s;
  }
  if (cur.trim()) parts.push(cur);
  // The first request is short so the first audio comes back quickly.
  if (parts.length && parts[0].length > 120) {
    const m = parts[0].match(/^.{20,120}?[.!?。！？,，;；](\s|$)/s);
    if (m) parts.splice(0, 1, m[0], parts[0].slice(m[0].length));
  }
  return parts.filter((p) => p.trim());
}

// Qwen3-TTS-Flash (Aliyun Model Studio, Beijing): SSE, each event a base64 slice of 24 kHz s16le PCM.
async function qwen(env, v, text) {
  const r = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation", {
    method: "POST",
    headers: { authorization: `Bearer ${env.DASHSCOPE_API_KEY}`, "content-type": "application/json", "x-dashscope-sse": "enable" },
    body: JSON.stringify({ model: "qwen3-tts-flash", input: { text, voice: v.voice, language_type: /[一-鿿]/.test(text) ? "Chinese" : "English" } }),
  });
  if (!r.ok) throw new Error(`qwen ${r.status} ${await r.text()}`);
  let buf = "";
  const dec = new TextDecoder();
  return r.body.pipeThrough(new TransformStream({
    transform(chunk, ctl) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const b64 = JSON.parse(line.slice(5)).output?.audio?.data;
        if (b64) ctl.enqueue(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
      }
    },
  }));
}

// Deepgram Aura-2 on Workers AI: raw linear16 at 24 kHz.
async function aura(env, v, text) {
  const r = await env.AI.run("@cf/deepgram/aura-2-en",
    { text, speaker: v.voice, encoding: "linear16", container: "none", sample_rate: RATE }, { returnRawResponse: true });
  if (!r.ok) throw new Error(`aura ${r.status} ${await r.text()}`);
  return r.body;
}
