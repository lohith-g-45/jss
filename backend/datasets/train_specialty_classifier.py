"""
Medical Specialty Classification Model Training
Dataset: MTSamples (4999 medical transcriptions)
Task: Predict medical specialty from consultation text
Split: 70% train / 30% test
"""

import pandas as pd
import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding
import random
from pathlib import Path
import json
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np
from collections import Counter

# Paths
RAW_DATA = Path(__file__).parent / "raw" / "mtsamples.csv"
PROCESSED_DIR = Path(__file__).parent / "processed"
MODEL_DIR = Path(__file__).parent / "models" / "medical_specialty_classifier"

# Create directories
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 80)
print("🏥 MEDICAL SPECIALTY CLASSIFICATION MODEL TRAINING")
print("=" * 80)

# ─────────────────────────────────────────────
# 1. LOAD & PREPROCESS DATA
# ─────────────────────────────────────────────
print("\n📂 Loading dataset...")
df = pd.read_csv(RAW_DATA)
print(f"   Total samples: {len(df)}")
print(f"   Columns: {list(df.columns)}")

# Clean data
df = df.dropna(subset=["transcription", "medical_specialty"])
df = df[df["transcription"].str.strip() != ""]
df = df[df["medical_specialty"].str.strip() != ""]

print(f"\n✅ After cleaning: {len(df)} samples")

# Specialty distribution
specialty_counts = df["medical_specialty"].value_counts()
print(f"\n📊 Medical Specialties Found: {len(specialty_counts)}")
print("\nTop 15 specialties:")
print(specialty_counts.head(15))

# Filter: Keep specialties with at least 20 samples for better training
MIN_SAMPLES = 20
valid_specialties = specialty_counts[specialty_counts >= MIN_SAMPLES].index.tolist()
df_filtered = df[df["medical_specialty"].isin(valid_specialties)]

print(f"\n🔍 Filtered: {len(df_filtered)} samples across {len(valid_specialties)} specialties")
print(f"   Specialties with ≥{MIN_SAMPLES} samples: {len(valid_specialties)}")

# ─────────────────────────────────────────────
# 2. TRAIN/TEST SPLIT (70/30)
# ─────────────────────────────────────────────
print("\n" + "="*80)
print("📊 SPLITTING DATA: 70% TRAIN / 30% TEST")
print("="*80)

train_df, test_df = train_test_split(
    df_filtered,
    test_size=0.30,
    train_size=0.70,
    random_state=42,
    stratify=df_filtered["medical_specialty"]
)

print(f"\n✅ Training set: {len(train_df)} samples ({len(train_df)/len(df_filtered)*100:.1f}%)")
print(f"✅ Test set:     {len(test_df)} samples ({len(test_df)/len(df_filtered)*100:.1f}%)")

# Save splits for reference
train_df.to_csv(PROCESSED_DIR / "train_data.csv", index=False)
test_df.to_csv(PROCESSED_DIR / "test_data.csv", index=False)
print(f"\n💾 Saved splits to: {PROCESSED_DIR}")

# ─────────────────────────────────────────────
# 3. PREPARE SPACY TRAINING DATA
# ─────────────────────────────────────────────
print("\n" + "="*80)
print("🔧 PREPARING SPACY TRAINING FORMAT")
print("="*80)

def prepare_training_data(df, label_column="medical_specialty"):
    """Convert dataframe to spaCy training format"""
    training_data = []
    for _, row in df.iterrows():
        text = row["transcription"][:5000]  # Limit text length
        cats = {specialty: 0.0 for specialty in valid_specialties}
        cats[row[label_column]] = 1.0
        training_data.append((text, {"cats": cats}))
    return training_data

train_data = prepare_training_data(train_df)
test_data = prepare_training_data(test_df)

print(f"✅ Prepared {len(train_data)} training examples")
print(f"✅ Prepared {len(test_data)} test examples")

# ─────────────────────────────────────────────
# 4. CREATE & CONFIGURE MODEL
# ─────────────────────────────────────────────
print("\n" + "="*80)
print("🤖 CREATING SPACY MODEL")
print("="*80)

# Create blank English model
nlp = spacy.blank("en")

# Add text categorizer pipeline
if "textcat_multilabel" not in nlp.pipe_names:
    textcat = nlp.add_pipe("textcat_multilabel", last=True)
else:
    textcat = nlp.get_pipe("textcat_multilabel")

# Add labels
for specialty in valid_specialties:
    textcat.add_label(specialty)

print(f"✅ Text Categorizer added with {len(valid_specialties)} labels")

# ─────────────────────────────────────────────
# 5. TRAIN THE MODEL
# ─────────────────────────────────────────────
print("\n" + "="*80)
print("🚀 TRAINING MODEL")
print("="*80)

# Disable other pipes during training
other_pipes = [pipe for pipe in nlp.pipe_names if pipe != "textcat_multilabel"]
with nlp.disable_pipes(*other_pipes):
    optimizer = nlp.initialize()
    
    # Training parameters
    n_iter = 20
    batch_size = compounding(4.0, 32.0, 1.001)
    
    print(f"   Epochs: {n_iter}")
    print(f"   Batch size: dynamic (4-32)")
    print(f"   Optimizer: Adam")
    print()
    
    for epoch in range(n_iter):
        random.shuffle(train_data)
        losses = {}
        batches = minibatch(train_data, size=batch_size)
        
        for batch in batches:
            texts = [text for text, _ in batch]
            annotations = [cats for _, cats in batch]
            examples = [
                Example.from_dict(nlp.make_doc(text), cats)
                for text, cats in zip(texts, annotations)
            ]
            nlp.update(examples, drop=0.2, losses=losses, sgd=optimizer)
        
        print(f"   Epoch {epoch+1:2d}/{n_iter} | Loss: {losses['textcat_multilabel']:.4f}")

print("\n✅ Training complete!")

# ─────────────────────────────────────────────
# 6. EVALUATE ON TEST SET (30%)
# ─────────────────────────────────────────────
print("\n" + "="*80)
print("📈 EVALUATING ON TEST SET (30% of data)")
print("="*80)

y_true = []
y_pred = []

for text, annotation in test_data:
    doc = nlp(text)
    predicted_specialty = max(doc.cats, key=doc.cats.get)
    true_specialty = max(annotation["cats"], key=annotation["cats"].get)
    
    y_true.append(true_specialty)
    y_pred.append(predicted_specialty)

# Calculate metrics
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

accuracy = accuracy_score(y_true, y_pred)
precision, recall, f1, support = precision_recall_fscore_support(
    y_true, y_pred, average='weighted', zero_division=0
)

print(f"\n{'='*80}")
print("🎯 TEST SET PERFORMANCE (30% OF DATA)")
print(f"{'='*80}")
print(f"   Accuracy:  {accuracy*100:.2f}%")
print(f"   Precision: {precision*100:.2f}%")
print(f"   Recall:    {recall*100:.2f}%")
print(f"   F1-Score:  {f1*100:.2f}%")
print(f"   Test Size: {len(test_data)} samples")

# Top 10 specialty report
print("\n📊 PERFORMANCE BY SPECIALTY (Top 10):")
report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
specialty_scores = []
for specialty in valid_specialties:
    if specialty in report:
        specialty_scores.append({
            'specialty': specialty,
            'precision': report[specialty]['precision'],
            'recall': report[specialty]['recall'],
            'f1': report[specialty]['f1-score'],
            'support': int(report[specialty]['support'])
        })

# Sort by support (most common specialties)
specialty_scores = sorted(specialty_scores, key=lambda x: x['support'], reverse=True)[:10]
for item in specialty_scores:
    print(f"   {item['specialty']:40s} | P: {item['precision']*100:5.1f}% | R: {item['recall']*100:5.1f}% | F1: {item['f1']*100:5.1f}% | N: {item['support']:4d}")

# ─────────────────────────────────────────────
# 7. SAVE MODEL & METADATA
# ─────────────────────────────────────────────
print("\n" + "="*80)
print("💾 SAVING MODEL")
print("="*80)

nlp.to_disk(MODEL_DIR)
print(f"✅ Model saved to: {MODEL_DIR}")

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
    "date_trained": pd.Timestamp.now().isoformat()
}

with open(MODEL_DIR / "metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print(f"✅ Metadata saved to: {MODEL_DIR / 'metadata.json'}")

# ─────────────────────────────────────────────
# 8. TEST PREDICTIONS
# ─────────────────────────────────────────────
print("\n" + "="*80)
print("🧪 TESTING SAMPLE PREDICTIONS")
print("="*80)

test_texts = [
    "Patient presents with chest pain and shortness of breath. EKG shows ST elevation.",
    "The patient has a history of diabetes mellitus type 2, currently on metformin.",
    "MRI of the brain shows no acute intracranial abnormality.",
    "Patient complains of severe abdominal pain in the right lower quadrant.",
]

for i, text in enumerate(test_texts, 1):
    doc = nlp(text)
    top_3 = sorted(doc.cats.items(), key=lambda x: x[1], reverse=True)[:3]
    print(f"\n{i}. Text: {text[:80]}...")
    print(f"   Predictions:")
    for specialty, score in top_3:
        print(f"      {specialty:40s} {score*100:5.1f}%")

print("\n" + "="*80)
print("✅ TRAINING COMPLETE!")
print("="*80)
print(f"\n📊 Summary:")
print(f"   • Trained on {len(train_data)} samples (70%)")
print(f"   • Tested on {len(test_data)} samples (30%)")
print(f"   • Accuracy: {accuracy*100:.2f}%")
print(f"   • Model location: {MODEL_DIR}")
print(f"\n💡 Next Steps:")
print(f"   1. Review model performance metrics above")
print(f"   2. Integrate model into main pipeline (nlp_pipeline.py)")
print(f"   3. Test with real consultation audio")
print("="*80)
