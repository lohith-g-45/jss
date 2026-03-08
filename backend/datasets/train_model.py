"""
Medical Specialty Classifier - Simplified & Robust
Uses textcat (single-label) instead of textcat_multilabel
"""

import pandas as pd
import spacy
from spacy.training import Example
import random
from pathlib import Path
import json
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import warnings
warnings.filterwarnings('ignore')

print("="*80)
print("🏥 MEDICAL SPECIALTY CLASSIFIER TRAINING")
print("="*80)

# Paths
RAW_DATA = Path("D:/Medical-Scribe/backend/datasets/raw/mtsamples.csv")
MODEL_DIR = Path("D:/Medical-Scribe/backend/datasets/models/medical_specialty_classifier")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# Load data
print("\n1️⃣ Loading dataset...")
df = pd.read_csv(RAW_DATA)
df = df.dropna(subset=["transcription", "medical_specialty"])
df = df[df["transcription"].str.strip() != ""]
print(f"   ✅ {len(df)} samples loaded")

# Filter specialties
specialty_counts = df["medical_specialty"].value_counts()
valid_specialties = specialty_counts[specialty_counts >= 20].index.tolist()
df = df[df["medical_specialty"].isin(valid_specialties)]
print(f"   ✅ {len(df)} samples, {len(valid_specialties)} specialties")

# Split 70/30
print("\n2️⃣ Splitting data (70% train / 30% test)...")
train_df, test_df = train_test_split(
    df,
    test_size=0.30,
    random_state=42,
    stratify=df["medical_specialty"]
)
TRAIN_SIZE = len(train_df)
TEST_SIZE = len(test_df)
print(f"   ✅ Train: {TRAIN_SIZE} | Test: {TEST_SIZE}")

# Prepare training data
def make_training_data(df):
    data = []
    for _, row in df.iterrows():
        text = row["transcription"][:2000]  # Limit length
        specialty = row["medical_specialty"]
        cats = {s: (1.0 if s == specialty else 0.0) for s in valid_specialties}
        data.append((text, {"cats": cats}))
    return data

train_data = make_training_data(train_df)
test_data = make_training_data(test_df)

# Create model
print("\n3️⃣ Creating spaCy model...")
nlp = spacy.blank("en")
textcat = nlp.add_pipe("textcat")  # Use default config
for specialty in valid_specialties:
    textcat.add_label(specialty) 
print(f"   ✅ {len(valid_specialties)} labels added")

# Train
print("\n4️⃣ Training (10 epochs)...")
optimizer = nlp.begin_training()
n_iter = 10

for epoch in range(n_iter):
    random.shuffle(train_data)
    losses = {}
    
    # Process in small batches
    batch_size = 8
    for i in range(0, len(train_data), batch_size):
        batch = train_data[i:i+batch_size]
        examples = []
        for text, annotations in batch:
            doc = nlp.make_doc(text)
            example = Example.from_dict(doc, annotations)
            examples.append(example)
        
        nlp.update(examples, drop=0.2, losses=losses, sgd=optimizer)
    
    print(f"   Epoch {epoch+1:2d}/{n_iter} | Loss: {losses.get('textcat', 0):.4f}")

# Evaluate
print("\n5️⃣ Evaluating on test set...")
y_true = []
y_pred = []

for text, annotation in test_data:
    doc = nlp(text)
    predicted = max(doc.cats, key=doc.cats.get)
    true = max(annotation["cats"], key=annotation["cats"].get)
    y_true.append(true)
    y_pred.append(predicted)

accuracy = accuracy_score(y_true, y_pred)
print(f"\n{'='*80}")
print("🎯 TEST RESULTS (30% of data)")
print(f"{'='*80}")
print(f"   Accuracy: {accuracy*100:.2f}%")
print(f"   Train:    {TRAIN_SIZE} samples (70%)")
print(f"   Test:     {TEST_SIZE} samples (30%)")

# Save model
print(f"\n6️⃣ Saving model...")
nlp.to_disk(MODEL_DIR)
print(f"   ✅ Model: {MODEL_DIR}")

# Save metadata
metadata = {
    "model_name": "medical_specialty_classifier",
    "dataset": "mt samples.csv",
    "total_samples": len(df),
    "train_samples": TRAIN_SIZE,
    "test_samples": TEST_SIZE,
    "train_percentage": 70.0,
    "test_percentage": 30.0,
    "num_specialties": len(valid_specialties),
    "specialties": valid_specialties,
    "accuracy": float(accuracy),
    "epochs": n_iter,
    "date_trained": pd.Timestamp.now().isoformat()
}

with open(MODEL_DIR / "metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)
print(f"   ✅ Metadata: {MODEL_DIR / 'metadata.json'}")

# Test samples
print(f"\n{'='*80}")
print("🧪 SAMPLE PREDICTIONS")
print(f"{'='*80}")

tests = [
    "Patient presents with severe chest pain radiating to left arm. EKG shows ST elevation in leads II, III, aVF.",
    "Laparoscopic appendectomy performed. Patient tolerated procedure well. No complications noted.",
    "MRI brain: No acute intracranial abnormality. No mass effect or midline shift detected.",
]

for i, text in enumerate(tests, 1):
    doc = nlp(text)
    top_3 = sorted(doc.cats.items(), key=lambda x: x[1], reverse=True)[:3]
    print(f"\n{i}. {text[:65]}...")
    for specialty, score in top_3:
        bar = "█" * int(score * 15)
        print(f"   {specialty:35s} {score*100:5.1f}% {bar}")

print(f"\n{'='*80}")
print("✅ TRAINING COMPLETE!")
print(f"{'='*80}")
print(f"\nModel Location: {MODEL_DIR}")
print(f"Accuracy:       {accuracy*100:.1f}%")
print(f"Training Data:  70% ({TRAIN_SIZE} samples)")
print(f"Test Data:      30% ({TEST_SIZE} samples)")
print("="*80)
