# 🔗 Frontend-Backend Integration Guide

## ✅ Changes Made

### Your Python AI Backend (Port 8000)

**Updated:**
1. ✅ Added CORS for React frontend (ports 5173, 5174)
2. ✅ Added JWT authentication support (optional, disabled by default)
3. ✅ Removed body parts mapping and 3D visualization features
4. ✅ Created new `/api/transcribe-and-generate` endpoint for audio uploads
5. ✅ Updated response format to match frontend expectations
6. ✅ Created `.env` configuration file
7. ✅ Created `.gitignore` to exclude sensitive files
8. ✅ Added PyJWT to requirements.txt

**Response Format:**
```json
{
  "success": true,
  "transcript": "Patient complains of chest pain...",
  "speaker": "Patient",
  "soap_notes": {
    "chief_complaint": "...",
    "history": "...",
    "assessment": "...",
    "plan": "..."
  },
  "entities": [...],
  "insights": {...}
}
```

---

## 🚀 Integration Steps

### Step 1: Install Missing Dependencies

```bash
cd D:\Medical-Scribe\backend
.\venv\Scripts\python.exe -m pip install PyJWT==2.8.0
```

### Step 2: Configure Environment

Edit `D:\Medical-Scribe\backend\.env`:
```env
GROQ_API_KEY=your_actual_groq_api_key_here
WHISPER_MODEL=base
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

**Match JWT Secret with Node.js:**
The JWT_SECRET must be the SAME as in `ai-medical-scribe/server/.env` (currently: `your_super_secret_jwt_key_change_this_in_production`)

### Step 3: Start Python AI Backend

```powershell
cd D:\Medical-Scribe\backend
Push-Location "D:\Medical-Scribe\backend"
& "D:\Medical-Scribe\backend\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Should show:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     🚀 Starting Medical-Scribe backend...
INFO:     ✅ Backend ready
```

### Step 4: Test Python Backend

Open new terminal:
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/health" -UseBasicParsing
```

Should return: `{"status":"healthy",...}`

### Step 5: Start Node.js Backend

```powershell
cd D:\Medical-Scribe\ai-medical-scribe\server
npm install
npm start
```

Should show:
```
Server running on port 5000
```

### Step 6: Start React Frontend

```powershell
cd D:\Medical-Scribe\ai-medical-scribe
npm install
npm run dev
```

Should show:
```
Local: http://localhost:5173
```

---

## 🔌 How It Works

```
┌──────────────────────────────────────────┐
│  React Frontend (localhost:5173)         │
│  - UI, Forms, Audio Recording            │
└─────────┬──────────────────┬─────────────┘
          │                  │
          │                  │ Audio File
          │                  │
          │         ┌────────▼─────────────┐
          │         │  Python AI Backend   │
          │         │  (localhost:8000)    │
          │         │                      │
          │         │  - Whisper AI        │
          │         │  - Medical NER       │
          │         │  - SOAP Generation   │
          │         │  - Groq Insights     │
          │         └──────────────────────┘
          │                  │
          │                  │ Returns: transcript, SOAP, entities
          │                  │
┌─────────▼──────────────────▼─────────────┐
│  Node.js API (localhost:5000)            │
│  - Authentication (JWT)                  │
│  - Patient Management                    │
│  - Consultation Storage                  │
│  - MySQL Database                        │
└──────────────────────────────────────────┘
          │
┌─────────▼──────────────────────┐
│  MySQL Database                │
│  - Users, Patients             │
│  - Consultations, History      │
└────────────────────────────────┘
```

---

## 📝 Frontend Changes Needed

Your collaborator needs to update the React frontend to call your Python backend:

### Update `ai-medical-scribe/src/services/api.js`

Add:
```javascript
// Python AI Backend URL
const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000/api';

const aiApi = axios.create({
  baseURL: AI_API_URL,
});

// Add auth token to AI requests
aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// NEW: Real AI transcription & SOAP generation
export const transcribeAndGenerate = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'consultation.wav');
  
  const response = await aiApi.post('/transcribe-and-generate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
```

### Update `.env` in React frontend

Create `ai-medical-scribe/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_AI_API_URL=http://localhost:8000/api
```

### Update Audio Recording Component

In `ai-medical-scribe/src/pages/StartConsultation.jsx`, replace mock generation with:

```javascript
const handleGenerateNotes = async () => {
  setIsGenerating(true);
  try {
    // Convert recorded audio to blob
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    
    // Send to Python AI backend
    const result = await transcribeAndGenerate(audioBlob);
    
    // Save to Node.js database
    await saveConsultation({
      patient_id: selectedPatient.id,
      transcript: result.transcript,
      subjective: result.soap_notes.chief_complaint,
      objective: result.soap_notes.history,
      assessment: result.soap_notes.assessment,
      plan: result.soap_notes.plan,
      entities: JSON.stringify(result.entities),
      insights: JSON.stringify(result.insights),
    });
    
    toast.success('AI notes generated successfully!');
    navigate('/generated-notes');
  } catch (error) {
    toast.error('Failed to generate notes');
  } finally {
    setIsGenerating(false);
  }
};
```

---

## ✅ Testing Checklist

- [ ] Python backend runs on port 8000
- [ ] Node.js backend runs on port 5000
- [ ] React frontend runs on port 5173
- [ ] Health check works: `http://localhost:8000/api/health`
- [ ] Can login to React app
- [ ] Audio recording works
- [ ] SOAP notes are AI-generated (not mock data)
- [ ] Notes save to MySQL database
- [ ] Can view patient history

---

## 🐛 Common Issues

### "Module 'jwt' not found"
```bash
cd backend
.\venv\Scripts\python.exe -m pip install PyJWT==2.8.0
```

### "Port 8000 already in use"
Kill existing process or use different port:
```bash
python -m uvicorn main:app --port 8001
```

### "CORS error"
Verify CORS origins in `backend/main.py` include your frontend URL.

### "JWT token invalid"
Ensure JWT_SECRET matches between Python and Node.js `.env` files.

---

## 🎉 Success!

When everything works:
1. Record audio in React app
2. Python AI transcribes and generates SOAP notes
3. Node.js saves to MySQL database
4. View notes in patient history

You now have a **real AI-powered Medical Scribe** with:
- ✅ Whisper transcription
- ✅ Medical NER
- ✅ Speaker detection
- ✅ AI SOAP notes
- ✅ Groq insights
- ✅ Database persistence
- ✅ Beautiful UI
