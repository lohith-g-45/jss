const express = require('express');
const router = express.Router();
const https = require('https');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

function callGroq(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 1024,
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve(parsed.choices[0].message.content);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// POST /api/notes/generate
router.post('/generate', async (req, res) => {
  const { transcript, patientInfo = {} } = req.body;

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: 'Transcript is required' });
  }

  const patientContext = [
    patientInfo.patientName ? `Patient Name: ${patientInfo.patientName}` : '',
    patientInfo.age ? `Age: ${patientInfo.age}` : '',
    patientInfo.gender ? `Gender: ${patientInfo.gender}` : '',
  ].filter(Boolean).join(', ');

  const systemPrompt = `You are an expert medical scribe AI. Given a consultation transcript, generate structured clinical SOAP notes.

Return ONLY valid JSON in exactly this format (no markdown, no extra text):
{
  "chief_complaint": "...",
  "history": "...",
  "past_medical_history": "...",
  "assessment": "...",
  "plan": "..."
}

Rules:
- chief_complaint: The primary symptom or reason for the visit (1-2 sentences)
- history: History of present illness — onset, duration, severity, associated symptoms mentioned by the patient
- past_medical_history: Any mentioned prior conditions, allergies, medications, surgeries (write "Not mentioned" if absent)
- assessment: Doctor's clinical assessment, findings, and likely diagnosis
- plan: Treatment plan including medications, tests ordered, referrals, follow-up instructions
- Use proper medical terminology. Be concise and clinical. Do NOT include raw conversation text.`;

  const userMessage = `${patientContext ? `Patient: ${patientContext}\n\n` : ''}Consultation Transcript:\n${transcript}`;

  try {
    const content = await callGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);

    // Parse JSON from LLM response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('LLM did not return valid JSON');
    const soap = JSON.parse(jsonMatch[0]);

    res.json({
      soap_notes: {
        chief_complaint: soap.chief_complaint || '',
        history: soap.history || '',
        past_medical_history: soap.past_medical_history || '',
        assessment: soap.assessment || '',
        plan: soap.plan || '',
      },
      transcript,
      source: 'groq',
    });
  } catch (error) {
    console.error('Groq SOAP generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate notes: ' + error.message });
  }
});

module.exports = router;
