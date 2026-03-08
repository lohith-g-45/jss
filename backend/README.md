# 🏥 Medical-Scribe Python AI Backend

AI-powered backend for medical transcription, NER, and SOAP note generation.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and add your Groq API key:
```env
GROQ_API_KEY=your_actual_groq_api_key_here
WHISPER_MODEL=base
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

### 3. Start Server
```bash
# Using venv Python
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Or if venv is activated
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Server will be live at: **`http://127.0.0.1:8000`**

## 📡 API Endpoints

### Health Check
```bash
GET http://127.0.0.1:8000/api/health
```

### Process Text
```bash
POST http://127.0.0.1:8000/api/process-text
Content-Type: application/json

{
  "text": "Patient complains of chest pain and shortness of breath",
  "speaker": "Unknown",
  "language": "en"
}
```

### Transcribe Audio & Generate SOAP Notes
```bash
POST http://127.0.0.1:8000/api/transcribe-and-generate
Content-Type: multipart/form-data

audio: <audio-file.wav>
```

**Response:**
```json
{
  "success": true,
  "transcript": "...",
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

## 🔌 Integration with Frontend

The backend is configured to work with:
- **React Frontend**: Port 5173/5174
- **Node.js API**: Port 5000

### CORS Configuration
Already configured in `main.py` to allow:
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:5000`

### JWT Authentication (Optional)
JWT verification is available but **disabled by default** for easier integration.

To enable, uncomment `dependencies=[Depends(verify_token)]` in endpoints.

## 🧪 Test the Backend

```bash
# Health check
curl http://127.0.0.1:8000/api/health

# Process text
curl -X POST http://127.0.0.1:8000/api/process-text \
  -H "Content-Type: application/json" \
  -d '{"text": "severe headache and fever", "speaker": "Unknown"}'
```

## 🔑 Features

✅ **Whisper AI Transcription** - faster-whisper for audio → text  
✅ **Medical NER** - scispaCy + custom NER for symptoms/conditions  
✅ **Speaker Detection** - Auto-identify Doctor vs Patient  
✅ **SOAP Generation** - AI-powered clinical notes  
✅ **Groq Insights** - LLM-powered clinical insights  
✅ **Multilingual** - Translation support  
✅ **ICD-10 Codes** - Automatic medical coding  
✅ **WebSocket** - Real-time streaming support

❌ **Body Parts Mapping** - Removed (3D visualization feature)

## 📁 Project Structure

```
backend/
├── main.py              # FastAPI server
├── nlp_pipeline.py      # Whisper + NER + Speaker AI
├── insights_engine.py   # Groq LLM insights
├── requirements.txt     # Dependencies
├── .env                 # Configuration (DO NOT COMMIT)
├── .env.example         # Template
└── venv/               # Virtual environment
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Groq API key for insights | Required |
| `WHISPER_MODEL` | Whisper model size | `base` |
| `PORT` | Server port | `8000` |
| `JWT_SECRET` | JWT secret (match Node.js) | Required if using auth |

## 🐛 Troubleshooting

### Import Error
Make sure you're in the backend directory:
```bash
cd D:\Medical-Scribe\backend
```

### Port Already in Use
Change port in command:
```bash
python -m uvicorn main:app --port 8001
```

### Whisper Model Loading Issues
Try smaller model:
```env
WHISPER_MODEL=tiny
```

## 🔗 Frontend Integration

The React frontend should call this backend for AI processing:

```javascript
// In React frontend
const response = await fetch('http://localhost:8000/api/transcribe-and-generate', {
  method: 'POST',
  body: formData // audio file
});
```

Then save results to Node.js backend (port 5000) for database persistence.

## 📝 License

Part of Medical-Scribe project.
