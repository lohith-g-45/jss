"""
Medical-Scribe NLP Pipeline
Handles: Whisper transcription, Translation, Medical NER, Speaker Classification, EHR/SOAP
"""

import os
import io
import time
import logging
import asyncio
from dataclasses import dataclass, field
from typing import List, Optional, Dict

import numpy as np

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Data Classes
# ─────────────────────────────────────────────

@dataclass
class TranscriptionResult:
    text: str
    language: str
    confidence: float
    duration_ms: float
    speaker: str = "Unknown"

@dataclass
class ClinicalEntity:
    text: str
    entity_type: str
    severity: str
    confidence: float
    body_part_id: Optional[str] = None
    icd10_code: Optional[str] = None

@dataclass
class SOAPNote:
    subjective: str = ""
    objective: str = ""
    assessment: str = ""
    plan: str = ""
    icd10_codes: List[str] = field(default_factory=list)

@dataclass
class PipelineResult:
    original_text: str
    translated_text: str
    source_language: str
    speaker: str
    entities: list
    soap_note: SOAPNote
    body_part_updates: Dict[str, List[str]] = field(default_factory=dict)
    medical_specialty: str = "General Medicine"
    specialty_confidence: float = 0.0
    processing_time_ms: float = 0.0


# ─────────────────────────────────────────────
# Whisper Engine
# ─────────────────────────────────────────────

class WhisperEngine:
    def __init__(self, model_size: str = "base"):
        logger.info(f"Loading faster-whisper model: {model_size}")
        from faster_whisper import WhisperModel
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
        logger.info("✅ Whisper model loaded")

    async def transcribe(self, audio_bytes: bytes, language: Optional[str] = None) -> TranscriptionResult:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._transcribe_sync, audio_bytes, language)

    def _transcribe_sync(self, audio_bytes: bytes, language: Optional[str]) -> TranscriptionResult:
        try:
            # Try container-aware decoding first (webm/ogg/wav blobs from browser).
            segments, info = self.model.transcribe(
                io.BytesIO(audio_bytes),
                language=language,
                beam_size=5,
                vad_filter=True,
            )
            text = " ".join([s.text for s in segments]).strip()
            duration_ms = float(getattr(info, "duration", 0.0) or 0.0) * 1000.0

            return TranscriptionResult(
                text=text,
                language=info.language,
                confidence=info.language_probability,
                duration_ms=duration_ms,
            )
        except Exception as decode_err:
            logger.warning(f"Container decode failed, trying raw PCM fallback: {decode_err}")

        try:
            # Fallback for raw PCM int16 mono bytes.
            audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            segments, info = self.model.transcribe(
                audio_array,
                language=language,
                beam_size=5,
                vad_filter=True,
            )
            text = " ".join([s.text for s in segments]).strip()
            return TranscriptionResult(
                text=text,
                language=info.language,
                confidence=info.language_probability,
                duration_ms=len(audio_bytes) / (48000 * 2) * 1000,
            )
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return TranscriptionResult(text="", language="en", confidence=0.0, duration_ms=0.0)


# ─────────────────────────────────────────────
# Translation Engine
# ─────────────────────────────────────────────

class TranslationEngine:
    def __init__(self):
        logger.info("Loading translation model...")
        try:
            from transformers import pipeline as hf_pipeline
            self.translator = hf_pipeline(
                "translation",
                model="Helsinki-NLP/opus-mt-mul-en",
                device=-1,
            )
            logger.info("✅ Translation model loaded")
        except Exception as e:
            logger.warning(f"Translation model failed to load: {e}. Will pass through text.")
            self.translator = None

    def translate(self, text: str, source_lang: str) -> str:
        if not text.strip():
            return text
        if source_lang == "en" or self.translator is None:
            return text
        try:
            result = self.translator(text, max_length=512)
            return result[0]["translation_text"]
        except Exception as e:
            logger.warning(f"Translation failed: {e}")
            return text


# ─────────────────────────────────────────────
# Medical NER
# ─────────────────────────────────────────────

BODY_PART_MAP = {
    "chest": "chest", "heart": "chest", "lung": "chest", "lungs": "chest",
    "head": "head", "brain": "head", "skull": "head",
    "abdomen": "abdomen", "stomach": "abdomen", "belly": "abdomen",
    "arm": "right_arm", "arms": "right_arm", "shoulder": "right_arm",
    "leg": "right_leg", "legs": "right_leg", "knee": "right_leg",
    "back": "spine", "spine": "spine",
    "throat": "throat", "neck": "throat",
}

SEVERITY_MAP = {
    "critical": ["severe", "acute", "critical", "emergency", "intense", "extreme"],
    "observation": ["mild", "moderate", "slight", "minor", "some", "little"],
}

ICD10_MAP = {
    "pneumonia": "J18.9",
    "fever": "R50.9",
    "cough": "R05",
    "chest pain": "R07.9",
    "headache": "R51",
    "hypertension": "I10",
    "diabetes": "E11.9",
    "asthma": "J45.901",
}

class MedicalNER:
    def __init__(self):
        logger.info("Loading Medical NER...")
        self.nlp = None
        try:
            import spacy
            try:
                self.nlp = spacy.load("en_core_sci_sm")
                logger.info("✅ scispaCy loaded")
            except Exception:
                self.nlp = spacy.load("en_core_web_sm")
                logger.info("✅ spaCy en_core_web_sm loaded (fallback)")
        except Exception as e:
            logger.warning(f"spaCy load failed: {e}. Using keyword NER fallback.")

        self.symptom_keywords = [
            "pain", "fever", "cough", "nausea", "vomiting", "dizziness",
            "fatigue", "headache", "shortness of breath", "chest pain",
            "burning", "numb", "swelling", "bleeding", "rash", "itch",
        ]
        self.condition_keywords = [
            "pneumonia", "diabetes", "hypertension", "asthma", "cancer",
            "infection", "inflammation", "fracture", "tumor",
        ]

    def _get_severity(self, text: str) -> str:
        text_lower = text.lower()
        for sev, words in SEVERITY_MAP.items():
            if any(w in text_lower for w in words):
                return sev
        return "observation"

    def _get_body_part(self, text: str) -> Optional[str]:
        text_lower = text.lower()
        for keyword, part_id in BODY_PART_MAP.items():
            if keyword in text_lower:
                return part_id
        return None

    def extract_entities(self, text: str) -> List[ClinicalEntity]:
        entities = []
        text_lower = text.lower()

        # Keyword-based fallback NER
        for sym in self.symptom_keywords:
            if sym in text_lower:
                entities.append(ClinicalEntity(
                    text=sym,
                    entity_type="SYMPTOM",
                    severity=self._get_severity(text),
                    confidence=0.85,
                    body_part_id=self._get_body_part(text),
                    icd10_code=ICD10_MAP.get(sym),
                ))

        for cond in self.condition_keywords:
            if cond in text_lower:
                entities.append(ClinicalEntity(
                    text=cond,
                    entity_type="CONDITION",
                    severity="critical",
                    confidence=0.90,
                    body_part_id=self._get_body_part(text),
                    icd10_code=ICD10_MAP.get(cond),
                ))

        # spaCy NER on top if available
        if self.nlp:
            doc = self.nlp(text)
            for ent in doc.ents:
                entities.append(ClinicalEntity(
                    text=ent.text,
                    entity_type=ent.label_,
                    severity=self._get_severity(text),
                    confidence=0.80,
                    body_part_id=self._get_body_part(ent.text),
                    icd10_code=ICD10_MAP.get(ent.text.lower()),
                ))

        # Deduplicate
        seen = set()
        deduped = []
        for e in entities:
            key = e.text.lower()
            if key not in seen:
                seen.add(key)
                deduped.append(e)

        return deduped


# ─────────────────────────────────────────────
# EHR / SOAP Note Generator
# ─────────────────────────────────────────────

class EHRFormatter:
    def generate_soap(self, text: str, entities: List[ClinicalEntity], speaker: str) -> SOAPNote:
        symptoms = [e for e in entities if e.entity_type in ("SYMPTOM", "PROBLEM")]
        conditions = [e for e in entities if e.entity_type in ("CONDITION", "DISEASE")]
        icd_codes = list(set(e.icd10_code for e in entities if e.icd10_code))

        subjective = f"{speaker} reports: {text}" if text else ""
        objective = f"Identified entities: {', '.join(e.text for e in symptoms[:5])}" if symptoms else "No specific findings noted."
        assessment = f"Possible: {', '.join(e.text for e in conditions)}" if conditions else "Further evaluation needed."
        plan = "Clinical review recommended based on reported symptoms."

        return SOAPNote(
            subjective=subjective,
            objective=objective,
            assessment=assessment,
            plan=plan,
            icd10_codes=icd_codes,
        )


def build_body_part_updates(entities: List[ClinicalEntity]) -> Dict[str, List[str]]:
    updates: Dict[str, List[str]] = {}
    for entity in entities:
        if not entity.body_part_id:
            continue
        updates.setdefault(entity.body_part_id, []).append(entity.text)
    return updates


# ─────────────────────────────────────────────
# Speaker Classifier (Heuristic + Linguistic)
# ─────────────────────────────────────────────

class SpecialtyClassifier:
    """Predicts medical specialty from consultation text using trained ML model."""
    def __init__(self):
        logger.info("Loading Medical Specialty Classifier...")
        try:
            import pickle
            from pathlib import Path
            model_path = Path(__file__).parent / "datasets" / "models" / "medical_specialty_classifier" / "model.pkl"
            
            if model_path.exists():
                with open(model_path, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info("✅ Specialty Classifier loaded")
            else:
                logger.warning(f"⚠️ Specialty model not found at {model_path}. Using fallback.")
                self.model = None
        except Exception as e:
            logger.warning(f"Specialty Classifier load failed: {e}. Using fallback.")
            self.model = None
    
    def predict(self, text: str) -> tuple:
        """Returns (specialty, confidence)"""
        if not self.model or not text.strip():
            return ("General Medicine", 0.0)
        
        try:
            prediction = self.model.predict([text])[0]
            probabilities = self.model.predict_proba([text])[0]
            confidence = float(max(probabilities))
            return (prediction.strip(), confidence)
        except Exception as e:
            logger.error(f"Specialty prediction error: {e}")
            return ("General Medicine", 0.0)


class SpeakerClassifier:
    """Detects if the speaker is likely a Doctor or Patient."""
    def __init__(self):
        self.question_starters = ["what", "how", "when", "where", "why", "do", "does", "did", "can", "could", "are", "is", "have", "has"]
        self.doctor_vibe = ["tell", "show", "exam", "assessment", "let's", "follow", "medication", "treatment", "patient", "history", "prescribe", "diagnose"]
        self.patient_vibe = ["pain", "hurts", "yesterday", "since", "burning", "numb", "feeling", "stomach", "started", "morning", "after", "it's", "feel", "ache", "sore"]

    def classify(self, text: str, last_speaker: str = "Doctor") -> str:
        text_lower = text.lower().strip()
        if not text_lower:
            return last_speaker

        # Heuristic 1: Questions are mostly Doctor in clinical settings
        is_question = text_lower.endswith('?') or any(text_lower.startswith(w) for w in self.question_starters)

        # Heuristic 2: Keywords
        doc_count = sum(1 for w in self.doctor_vibe if w in text_lower)
        pat_count = sum(1 for w in self.patient_vibe if w in text_lower)

        if is_question:
            return "Doctor"
        if doc_count > pat_count:
            return "Doctor"
        if pat_count > doc_count:
            return "Patient"

        # Default: alternate from last speaker
        return "Patient" if last_speaker == "Doctor" else "Doctor"


# ─────────────────────────────────────────────
# Master Pipeline Orchestrator
# ─────────────────────────────────────────────

class MedicalPipeline:
    def __init__(self, whisper_model_size: str = "base"):
        logger.info("Initializing Medical Pipeline...")
        self.whisper = WhisperEngine(whisper_model_size)
        self.translator = TranslationEngine()
        self.ner = MedicalNER()
        self.ehr = EHRFormatter()
        self.classifier = SpeakerClassifier()
        self.specialty_classifier = SpecialtyClassifier()  # NEW: Specialty prediction
        self.last_speaker = "Doctor"
        logger.info("✅ Medical Pipeline ready")

    async def process_audio(
        self,
        audio_bytes: bytes,
        speaker: str = "Unknown",
        force_language: Optional[str] = None,
    ) -> PipelineResult:
        t_start = time.time()

        transcription = await self.whisper.transcribe(audio_bytes, language=force_language)
        translated = self.translator.translate(transcription.text, transcription.language)

        final_speaker = speaker
        if final_speaker == "Unknown" or not final_speaker:
            final_speaker = self.classifier.classify(translated, self.last_speaker)
        self.last_speaker = final_speaker

        entities = self.ner.extract_entities(translated)
        body_part_updates = build_body_part_updates(entities)
        soap = self.ehr.generate_soap(translated, entities, final_speaker)
        
        # Predict medical specialty
        specialty, specialty_conf = self.specialty_classifier.predict(translated)

        return PipelineResult(
            original_text=transcription.text,
            translated_text=translated,
            source_language=transcription.language,
            speaker=final_speaker,
            entities=[{
                "text": e.text,
                "type": e.entity_type,
                "severity": e.severity,
                "confidence": e.confidence,
                "icd10": e.icd10_code,
            } for e in entities],
            body_part_updates=body_part_updates,
            soap_note=soap,
            medical_specialty=specialty,
            specialty_confidence=specialty_conf,
            processing_time_ms=(time.time() - t_start) * 1000,
        )

    async def process_text(
        self,
        text: str,
        speaker: str = "Unknown",
        source_language: str = "en",
    ) -> PipelineResult:
        t_start = time.time()

        translated = self.translator.translate(text, source_language)

        final_speaker = speaker
        if final_speaker == "Unknown" or not final_speaker:
            final_speaker = self.classifier.classify(translated, self.last_speaker)
        self.last_speaker = final_speaker

        entities = self.ner.extract_entities(translated)
        body_part_updates = build_body_part_updates(entities)
        soap = self.ehr.generate_soap(translated, entities, final_speaker)
        
        # Predict medical specialty
        specialty, specialty_conf = self.specialty_classifier.predict(translated)

        return PipelineResult(
            original_text=text,
            translated_text=translated,
            source_language=source_language,
            speaker=final_speaker,
            medical_specialty=specialty,
            specialty_confidence=specialty_conf,
            entities=[{
                "text": e.text,
                "type": e.entity_type,
                "severity": e.severity,
                "confidence": e.confidence,
                "icd10": e.icd10_code,
            } for e in entities],
            body_part_updates=body_part_updates,
            soap_note=soap,
            processing_time_ms=(time.time() - t_start) * 1000,
        )
