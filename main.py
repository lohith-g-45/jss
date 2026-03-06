from fastapi import FastAPI, File, UploadFile
import shutil
import whisper
from datetime import datetime

app = FastAPI()

model = whisper.load_model("base")

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

@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):

    file_location = f"{file.filename}"

    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = model.transcribe(file_location, task="translate")

    summary = generate_medical_summary(result["text"])

    return {
        "filename": file.filename,
        "transcription": result["text"],
        "summary": summary,
        "timestamp": datetime.now()
    }