import whisper
import spacy
from langdetect import detect
from fastapi import FastAPI, File, UploadFile
import shutil
from datetime import datetime

app = FastAPI()

# -----------------------------
# Load models (once)
# -----------------------------
model = whisper.load_model("base")           # Whisper speech-to-text
nlp = spacy.load("en_core_web_sm")          # spaCy NLP model

# -----------------------------------
# Step 1: Medical Info Extraction (Multilingual)
# -----------------------------------
def extract_medical_info(text):
    doc = nlp(text)

    symptoms = []
    medicines = []
    diseases = []

    # Keywords in English, Hindi, Kannada
    symptom_keywords = {
        "en": ["fever", "cough", "headache", "pain", "vomiting", "fatigue"],
        "hi": ["बुखार", "खांसी", "सिरदर्द", "दर्द", "उल्टी", "थकान"],
        "kn": ["ಜ್ವರ", "ಅತ್ತಿ", "ತಲೆನೋವು", "ನೋವು", "ಓಲ್ಕೆ", "ಅಲಸ್ಯ"]
    }

    disease_keywords = {
        "en": ["diabetes", "hypertension", "asthma", "infection"],
        "hi": ["मधुमेह", "उच्च रक्तचाप", "दमा", "संक्रमण"],
        "kn": ["ಮಧುಮೇಹ", "ಅಧಿಕ ರಕ್ತದೊತ್ತಡ", "ಅಸ್ತಮಾ", "ಸಂಕ್ರಾಮಕ"]
    }

    medicine_keywords = {
        "en": ["paracetamol", "ibuprofen", "antibiotic"],
        "hi": ["पैरासिटामोल", "इबुप्रोफेन", "एंटीबायोटिक"],
        "kn": ["ಪ್ಯಾರಾಸಿಟಮಾಲ್", "ಇಬುಪ್ರೊಫೆನ್", "ಆಂಟಿಬಯೋಟಿಕ್"]
    }

    # Detect language
    try:
        lang = detect(text)
        if lang not in ["en", "hi", "kn"]:
            lang = "en"  # fallback to English
    except:
        lang = "en"

    # Extract keywords
    for token in doc:
        word = token.text.lower()
        if word in symptom_keywords.get(lang, []):
            symptoms.append(word)
        if word in disease_keywords.get(lang, []):
            diseases.append(word)
        if word in medicine_keywords.get(lang, []):
            medicines.append(word)

    return {
        "language": lang,
        "symptoms": symptoms,
        "diseases": diseases,
        "medicines": medicines
    }

# -----------------------------------
# Generate SOAP summary
# -----------------------------------
def generate_medical_summary(text):
    return f"""
SOAP NOTE:

Subjective:
{text}

Objective:
Patient reported symptoms during consultation.

Assessment:
Possible medical condition based on symptoms described.

Plan:
Further clinical evaluation recommended.
"""

# -----------------------------------
# API Endpoint
# -----------------------------------
@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):

    # Save uploaded file
    file_location = f"{file.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # -----------------------------
    # Whisper transcription
    # -----------------------------
    result = model.transcribe(file_location, task="translate")
    transcription_text = result["text"]

    # -----------------------------
    # Step 2: Language Detection
    # -----------------------------
    try:
        language = detect(transcription_text)
        if language not in ["en", "hi", "kn"]:
            language = "en"
    except:
        language = "en"

    # -----------------------------
    # Step 1: Medical Info Extraction
    # -----------------------------
    medical_info = extract_medical_info(transcription_text)

    # -----------------------------
    # Generate summary
    # -----------------------------
    summary = generate_medical_summary(transcription_text)

    # Return all data as JSON
    return {
        "filename": file.filename,
        "transcription": transcription_text,
        "language": language,
        "medical_info": medical_info,
        "summary": summary,
        "timestamp": datetime.now()
    }