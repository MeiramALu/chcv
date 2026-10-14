// МнемоСурет — барлық тұрақты мәтіндерді ElevenLabs арқылы алдын ала дыбыстау (app/audio/*.mp3)
// Іске қосу:  $env:ELEVENLABS_API_KEY="sk_..."; node tools/tts_build.mjs
// Қосымша:    $env:ELEVEN_VOICE_ID="..." (дауыс), --force (бәрін қайта жасау)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'app', 'audio');
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVEN_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
const MODEL = 'eleven_v3'; // қазақ тілін (kk) қолдайтын модель
const FORCE = process.argv.includes('--force');
if (!KEY) { console.error('ELEVENLABS_API_KEY берілмеген'); process.exit(1); }

// data.js-тен SLOTS пен CARDS аламыз
const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'app', 'data.js'), 'utf8') + ';this.SLOTS=SLOTS;this.CARDS=CARDS;', ctx);
const { SLOTS, CARDS } = ctx;

// app.js-тегі speak() шақыратын мәтіндер
const texts = new Set();
SLOTS.forEach((s, i) => texts.add(`${i + 1}-қадам. ${s.rhyme}`));
texts.add('Барлық бес қадам толтырылды. Енді «Сурет салу» батырмасын басыңыз.');
Object.values(CARDS).flat().forEach(c => { texts.add(c.k); if (c.loc) texts.add(c.loc); });

const norm = (t) => t.trim().toLowerCase();
const file = (t) => crypto.createHash('sha1').update(VOICE + '|' + norm(t)).digest('hex').slice(0, 12) + '.mp3';

async function tts(text) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL, language_code: 'kk' }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

fs.mkdirSync(OUT, { recursive: true });
const index = {};
let made = 0, skipped = 0;
for (const t of texts) {
  const f = file(t), p = path.join(OUT, f);
  index[norm(t)] = f;
  if (!FORCE && fs.existsSync(p)) { skipped++; continue; }
  try { fs.writeFileSync(p, await tts(t)); made++; console.log('✓', t); }
  catch (e) { console.error('✗', t, e.message); if (/401|quota/i.test(e.message)) break; }
}
fs.writeFileSync(path.join(OUT, 'index.js'), '// автоматты жасалған: tools/tts_build.mjs\nwindow.AUDIO = ' + JSON.stringify(index, null, 1) + ';\n');
console.log(`Дайын: жаңа ${made}, бұрыннан бар ${skipped}, барлығы ${texts.size}`);
