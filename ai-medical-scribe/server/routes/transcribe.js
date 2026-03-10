const express = require('express');
const router = express.Router();
const https = require('https');

/**
 * POST /api/transcribe
 * Body: { audioBase64: string, mimeType: string }
 *
 * Sends audio to Groq Whisper (whisper-large-v3) with task=translate.
 * Whisper understands 99 languages including Kannada, English, and mixed
 * Kanglish speech, and always returns the English translation.
 */
router.post('/', async (req, res) => {
  const { audioBase64, mimeType = 'audio/webm' } = req.body;

  if (!audioBase64) {
    return res.status(400).json({ error: 'audioBase64 is required' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Groq API key not configured' });
  }

  try {
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Build multipart/form-data manually (no extra npm packages needed)
    const boundary = `----MediScribeBoundary${Date.now()}`;
    const CRLF = '\r\n';

    // text fields first
    const textPart = (name, value) =>
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}` +
      `${value}${CRLF}`;

    const preamble = Buffer.from(
      textPart('model', 'whisper-large-v3') +
      textPart('response_format', 'json') +
      // temperature=0 gives most deterministic, accurate output
      textPart('temperature', '0') +
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="file"; filename="audio.webm"${CRLF}` +
      `Content-Type: ${mimeType}${CRLF}${CRLF}`
    );

    const epilogue = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
    const body = Buffer.concat([preamble, audioBuffer, epilogue]);

    const options = {
      hostname: 'api.groq.com',
      // /translations endpoint always outputs English regardless of input language
      path: '/openai/v1/audio/translations',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const result = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              return reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
            }
            resolve(parsed);
          } catch (e) {
            reject(new Error('Invalid response from Groq Whisper: ' + data.slice(0, 300)));
          }
        });
      });
      request.on('error', reject);
      request.write(body);
      request.end();
    });

    res.json({
      success: true,
      transcript: result.text || '',
    });
  } catch (error) {
    console.error('Whisper transcription error:', error.message);
    res.status(500).json({ error: 'Transcription failed: ' + error.message });
  }
});

module.exports = router;
