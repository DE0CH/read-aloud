// The voices the page offers. sample = the same English (and Mandarin) passage read by that voice, in public/samples.
const qwen = (voice, note) => ({ id: `qwen-${voice}`, provider: "qwen", voice, name: voice, note, langs: ["en", "zh"],
  samples: { en: `samples/qwen-${voice}-en.mp3`, zh: `samples/qwen-${voice}-zh.mp3` } });
const aura = (voice, note) => ({ id: `aura-${voice}`, provider: "aura", voice, name: voice[0].toUpperCase() + voice.slice(1),
  note, langs: ["en"], samples: { en: `samples/aura-${voice}-en.mp3` } });

export const VOICES = [
  aura("thalia", "Female, US, clear and bright"),
  aura("andromeda", "Female, US, calm"),
  aura("helena", "Female, US, warm"),
  aura("athena", "Female, US, mature"),
  aura("draco", "Male, British"),
  aura("apollo", "Male, US, casual"),
  aura("arcas", "Male, US, natural"),
  aura("orion", "Male, US, steady"),
  aura("zeus", "Male, US, deep"),
  qwen("Cherry", "Female, bright"),
  qwen("Serena", "Female, gentle"),
  qwen("Jennifer", "Female, American"),
  qwen("Katerina", "Female, mature"),
  qwen("Ethan", "Male, warm"),
  qwen("Ryan", "Male, energetic"),
  qwen("Elias", "Male, measured"),
];

export const PROVIDERS = {
  aura: "Deepgram Aura-2 (Cloudflare Workers AI), English only",
  qwen: "Qwen3-TTS Flash (Aliyun), English and Mandarin",
};
