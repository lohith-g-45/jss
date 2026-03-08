"""
Test the trained Medical Specialty Classifier
"""

import pickle
import json
from pathlib import Path

# Load model
MODEL_DIR = Path("D:/Medical-Scribe/backend/datasets/models/medical_specialty_classifier")
model_file = MODEL_DIR / "model.pkl"
metadata_file = MODEL_DIR / "metadata.json"

print("="*80)
print("🧪 TESTING MEDICAL SPECIALTY CLASSIFIER")
print("="*80)

# Load
print("\n📂 Loading model...")
with open(model_file, 'rb') as f:
    model = pickle.load(f)

with open(metadata_file, 'r') as f:
    metadata = json.load(f)

print(f"   ✅ Model loaded: {metadata['model_type']}")
print(f"   ✅ Trained on: {metadata['train_samples']} samples (70%)")
print(f"   ✅ Tested on: {metadata['test_samples']} samples (30%)")
print(f"   ✅ Accuracy: {metadata['accuracy']*100:.1f}%")
print(f"   ✅ Specialties: {metadata['num_specialties']}")

# Test cases
print("\n" + "="*80)
print("🔍 PREDICTIONS")
print("="*80)

test_texts = [
    "Patient presents with acute myocardial infarction. Cardiac catheterization performed. Stent placement successful.",
    "Colonoscopy performed. Multiple polyps identified and removed. Pathology pending.",
    "CT scan of abdomen shows acute appendicitis. Emergency appendectomy recommended.",
    "Patient complains of severe headache and visual disturbances. MRI brain ordered.",
    "Well-child checkup. Immunizations up to date. Development appropriate for age.",
    "Patient with history of diabetes mellitus. HbA1c elevated at 8.2%. Medication adjustment needed.",
]

for i, text in enumerate(test_texts, 1):
    # Get prediction
    prediction = model.predict([text])[0]
    probabilities = model.predict_proba([text])[0]
    
    # Get top 3
    top_3_idx = probabilities.argsort()[-3:][::-1]
    top_3 = [(model.classes_[idx].strip(), probabilities[idx]) for idx in top_3_idx]
    
    print(f"\n{i}. {text[:70]}...")
    print(f"   🎯 Predicted: {prediction.strip()} ({top_3[0][1]*100:.1f}% confidence)")
    print(f"   📊 Top 3:")
    for specialty, prob in top_3:
        bar = "█" * int(prob * 20)
        print(f"      {specialty:35s} {prob*100:5.1f}% {bar}")

print("\n" + "="*80)
print("✅ TESTING COMPLETE")
print("="*80)
