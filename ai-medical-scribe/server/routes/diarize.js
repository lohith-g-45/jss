const express = require('express');
const router = express.Router();
const { AssemblyAI } = require('assemblyai');

const ASSEMBLY_API_KEY = process.env.ASSEMBLYAI_API_KEY || '76934c15462643afabddc5a5ca871a13';

const client = new AssemblyAI({ apiKey: ASSEMBLY_API_KEY });

// ── POST /api/diarize ─────────────────────────────────────────────────────────
// Body: { audioBase64: string, mimeType: string, lang: 'en' | 'kn' }
// Returns: { success, utterances: [{speaker, text, start, end}], fullText, speakerCount }
router.post('/', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', lang = 'en' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    console.log(`[diarize] Received audio: ${(audioBuffer.length / 1024).toFixed(1)} KB, lang=${lang}`);

    // Use the official SDK — handles upload + polling correctly
    const params = {
      audio: audioBuffer,
      speaker_labels: true,
      speakers_expected: 2,
    };

    // Lock to English unless Kannada — for Kannada let AssemblyAI auto-detect
    if (lang !== 'kn') {
      params.language_code = 'en';
    }

    console.log('[diarize] Submitting to AssemblyAI…');
    const transcript = await client.transcripts.transcribe(params);
    console.log(`[diarize] Done — status=${transcript.status}, utterances=${transcript.utterances?.length ?? 0}`);

    if (transcript.status === 'error') {
      throw new Error('AssemblyAI error: ' + transcript.error);
    }

    const rawUtterances = transcript.utterances || [];

    // Map A → Doctor, B → Patient (first speaker to speak = Doctor)
    const speakerMap = {};
    let speakerIndex = 0;
    const roles = ['Doctor', 'Patient'];

    const mappedUtterances = rawUtterances.map((u) => {
      if (!(u.speaker in speakerMap)) {
        speakerMap[u.speaker] = roles[speakerIndex] || `Speaker ${speakerIndex + 1}`;
        speakerIndex++;
      }
      return {
        speaker: speakerMap[u.speaker],
        text: u.text,
        start: u.start,
        end: u.end,
      };
    });

    const fullText = mappedUtterances.map((u) => `${u.speaker}: ${u.text}`).join('\n\n');
    const distinctSpeakers = new Set(mappedUtterances.map((u) => u.speaker)).size;

    console.log(`[diarize] Distinct speakers detected: ${distinctSpeakers}`);
    res.json({ success: true, utterances: mappedUtterances, fullText, speakerCount: distinctSpeakers });

  } catch (err) {
    console.error('[diarize] Error:', err.message);
    res.status(500).json({ error: err.message || 'Diarization failed' });
  }
});

module.exports = router;


// ── helpers ──────────────────────────────────────────────────────────────────

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error('JSON parse error: ' + data)); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── 1. Upload raw audio bytes → get upload_url ────────────────────────────────
async function uploadAudio(audioBuffer) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ASSEMBLY_BASE,
      path: '/v2/upload',
      method: 'POST',
      headers: {
        authorization: ASSEMBLY_API_KEY,
        'content-type': 'application/octet-stream',
        'content-length': audioBuffer.length,
        'transfer-encoding': 'chunked',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.upload_url) resolve(parsed.upload_url);
          else reject(new Error('Upload failed: ' + data));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(audioBuffer);
    req.end();
  });
}

// ── 2. Submit transcription job with speaker diarization ─────────────────────
async function submitTranscript(audioUrl, languageCode) {
  const payload = JSON.stringify({
    audio_url: audioUrl,
    speech_model: 'best',
    speaker_labels: true,
    speakers_expected: 2,
    disfluencies: false,
    // If Kannada mode, let AssemblyAI auto-detect; otherwise lock to English
    ...(languageCode === 'kn' ? {} : { language_code: 'en' }),
  });

  const res = await httpsRequest({
    hostname: ASSEMBLY_BASE,
    path: '/v2/transcript',
    method: 'POST',
    headers: {
      authorization: ASSEMBLY_API_KEY,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload),
    },
  }, payload);

  if (!res.body.id) throw new Error('Transcript submit failed: ' + JSON.stringify(res.body));
  return res.body.id;
}

// ── 3. Poll until complete ────────────────────────────────────────────────────
async function pollTranscript(transcriptId, timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    let res;
    try {
      res = await httpsRequest({
        hostname: ASSEMBLY_BASE,
        path: `/v2/transcript/${transcriptId}`,
        method: 'GET',
        headers: { authorization: ASSEMBLY_API_KEY },
      }, null);
    } catch (pollErr) {
      // transient network error — wait and retry
      await sleep(3000);
      continue;
    }

    const { status, error, utterances, text } = res.body;

    if (status === 'completed') {
      return { utterances: utterances || [], text: text || '' };
    }
    if (status === 'error') {
      throw new Error('AssemblyAI error: ' + error);
    }
    // queued / processing → wait and retry
    await sleep(3000);
  }
  throw new Error('Diarization timed out after 3 minutes.');
}

// ── POST /api/diarize ─────────────────────────────────────────────────────────
// Body: { audioBase64: string, mimeType: string, lang: 'en' | 'kn' }
// Returns: { success, utterances: [{speaker, text, start, end}], fullText }
router.post('/', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm', lang = 'en' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Step 1 – upload
    const uploadUrl = await uploadAudio(audioBuffer);

    // Step 2 – submit with diarization
    const transcriptId = await submitTranscript(uploadUrl, lang);

    // Step 3 – poll
    const { utterances, text } = await pollTranscript(transcriptId);

    // Map AssemblyAI speaker labels (A, B, C...) to Doctor / Patient
    // Convention: A = first speaker to appear = Doctor (they always greet first)
    const speakerMap = {};
    let speakerIndex = 0;
    const roles = ['Doctor', 'Patient'];

    const mappedUtterances = utterances.map((u) => {
      if (!(u.speaker in speakerMap)) {
        speakerMap[u.speaker] = roles[speakerIndex] || `Speaker ${speakerIndex + 1}`;
        speakerIndex++;
      }
      return {
        speaker: speakerMap[u.speaker],
        text: u.text,
        start: u.start,
        end: u.end,
      };
    });

    // Build plain transcript string for SOAP generation
    const fullText = mappedUtterances
      .map((u) => `${u.speaker}: ${u.text}`)
      .join('\n\n');

    // Count distinct speakers so the frontend can decide whether to trust the result
    const distinctSpeakers = new Set(mappedUtterances.map((u) => u.speaker)).size;

    res.json({ success: true, utterances: mappedUtterances, fullText, speakerCount: distinctSpeakers });
  } catch (err) {
    console.error('Diarization error:', err.message);
    res.status(500).json({ error: err.message || 'Diarization failed' });
  }
});

module.exports = router;
