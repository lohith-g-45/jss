"""
QUICK Training Script - 5 Epochs for Fast Testing
Full training (20 epochs) takes ~10-15 minutes
"""

import pandas as pd
import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding
import random
from pathlib import Path
import json
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support
import warnings
warnings.filterwarnings('ignore')

# Paths
RAW_DATA = Path(__file__).parent / "raw" / "mtsamples.csv"
PROCESSED_DIR = Path(__file__).parent / "processed"
MODEL_DIR = Path(__file__).parent / "models" / "medical_specialty_classifier"

PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)

print("="*80)
print("🏥 QUICK TRAINING - MEDICAL SPECIALTY CLASSIFIER")
print("="*80)

# Load & clean
print("\n📂 Loading data...")
df = pd.read_csv(RAW_DATA)
df = df.dropna(subset=["transcription", "medical_specialty"])
df = df[df["transcription"].str.strip() != ""]
df = df[df["medical_specialty"].str.strip() != ""]
print(f"   Total: {len(df)} samples")

# Filter specialties with enough samples
specialty_counts = df["medical_specialty"].value_counts()
MIN_SAMPLES = 20
valid_specialties = specialty_counts[specialty_counts >= MIN_SAMPLES].index.tolist()
df_filtered = df[df["medical_specialty"].isin(valid_specialties)]
print(f"   Filtered: {len(df_filtered)} samples, {len(valid_specialties)} specialties")

# 70/30 split
print("\n📊 Splitting: 70% train / 30% test...")
train_df, test_df = train_test_split(
    df_filtered,
    test_size=0.30,
    train_size=0.70,
    random_state=42,
    stratify=df_filtered["medical_specialty"]
)
print(f"   Train: {len(train_df)} | Test: {len(test_df)}")

# Prepare data
def prepare_data(df):
    data = []
    for _, row in df.iterrows():
        text = row["transcription"][:3000]  # Shorter for speed
        cats = {s: 0.0 for s in valid_specialties}
        cats[row["medical_specialty"]] = 1.0
        data.append((text, {"cats": cats}))
    return data

train_data = prepare_data(train_df)
test_data = prepare_data(test_df)

# Create model
print("\n🤖 Creating spaCy model...")
nlp = spacy.blank("en")
textcat = nlp.add_pipe("textcat_multilabel", last=True)
for specialty in valid_specialties:
    textcat.add_label(specialty)
print(f"   Labels: {len(valid_specialties)}")

# Train
print("\n🚀 Training (5 epochs for quick test)...")
other_pipes = [p for p in nlp.pipe_names if p != "textcat_multilabel"]
with nlp.disable_pipes(*other_pipes):
    optimizer = nlp.initialize()
    n_iter = 5  # Quick training
    
    for epoch in range(n_iter):
        random.shuffle(train_data)
        losses = {}
        batches = minibatch(train_data, size=compounding(4.0, 32.0, 1.001))
        
        for batch in batches:
            texts = [t for t, _ in batch]
            annotations = [c for _, c in batch]
            examples = [
                Example.from_dict(nlp.make_doc(text), cats)
                for text, cats in zip(texts, annotations)
            ]
            nlp.update(examples, drop=0.2, losses=losses, sgd=optimizer)
        
        print(f"   Epoch {epoch+1}/{n_iter} | Loss: {losses['textcat_multilabel']:.4f}")

# Evaluate
print("\n📈 Evaluating on test set (30%)...")
y_true = []
y_pred = []

for text, annotation in test_data:
    doc = nlp(text)
    predicted = max(doc.cats, key=doc.cats.get)
    true = max(annotation["cats"], key=annotation["cats"].get)
    y_true.append(true)
    y_pred.append(predicted)

accuracy = accuracy_score(y_true, y_pred)
precision, recall, f1, _ = precision_recall_fscore_support(
    y_true, y_pred, average='weighted', zero_division=0
)

print(f"\n{'='*80}")
print("🎯 RESULTS")
print(f"{'='*80}")
print(f"   Accuracy:  {accuracy*100:.2f}%")
print(f"   Precision: {precision*100:.2f}%")
print(f"   Recall:    {recall*100:.2f}%")
print(f"   F1-Score:  {f1*100:.2f}%")
print(f"   Train:     {len(train_data)} samples (70%)")
print(f"   Test:      {len(test_data)} samples (30%)")

# Save model
print(f"\n💾 Saving model to: {MODEL_DIR}")
nlp.to_disk(MODEL_DIR)

# Save metadata
metadata = {
    "model_name": "medical_specialty_classifier",
    "dataset": "mtsamples.csv",
    "total_samples": len(df_filtered),
    "train_samples": len(train_data),
    "test_samples": len(test_data),
    "train_percentage": 70.0,
    "test_percentage": 30.0,
    "num_specialties": len(valid_specialties),
    "specialties": valid_specialties,
    "accuracy": float(accuracy),
    "precision": float(precision),
    "recall": float(recall),
    "f1_score": float(f1),
    "epochs": n_iter,
    "note": "Quick training version (5 epochs)",
    "date_trained": pd.Timestamp.now().isoformat()
}

metadata_file = MODEL_DIR / "metadata.json"
with open(metadata_file, "w") as f:
    json.dump(metadata, f, indent=2)
print(f"   Metadata: {metadata_file}")

# Test predictions
print(f"\n{'='*80}")
print("🧪 SAMPLE PREDICTIONS")
print(f"{'='*80}")

test_cases = [
    "Patient presents with chest pain and shortness of breath. EKG abnormal.",
    "Laparoscopic cholecystectomy performed. Gallbladder removed without complications.",
    "MRI brain shows no acute hemorrhage. CT scan unremarkable.",
    "Patient complains of lower back pain radiating to left leg. Sciatica suspected."
]

for i, text in enumerate(test_cases, 1):
    doc = nlp(text)
    top_3 = sorted(doc.cats.items(), key=lambda x: x[1], reverse=True)[:3]
    print(f"\n{i}. {text[:70]}...")
    for specialty, score in top_3:
        bar = "█" * int(score * 20)
        print(f"   {specialty:40s} {score*100:5.1f}% {bar}")

print(f"\n{'='*80}")
print("✅ DONE!")
print(f"{'='*80}")
print(f"\n📊 Summary:")
print(f"   • Model trained on 70% of data ({len(train_data)} samples)")
print(f"   • Tested on 30% of data ({len(test_data)} samples)")
print(f"   • Accuracy: {accuracy*100:.1f}%")
print(f"   • Location: {MODEL_DIR}")
print(f"\n💡 To improve accuracy, run full training (20 epochs):")
print(f"   python train_specialty_classifier.py")
print("="*80)
