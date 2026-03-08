"""
Medical Specialty Classifier - IMPROVED Training
ENHANCEMENTS:
- 10,000 TF-IDF features (up from 5,000)
- 4-gram phrases (captures complex medical terms)
- Balanced class weights (handles imbalanced specialties)
- SAGA solver with L2 regularization
- Should achieve 32-35% accuracy (up from 28.9%)
"""

import pandas as pd
import pickle
import json
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.pipeline import Pipeline
import warnings
warnings.filterwarnings('ignore')

print("="*80)
print("🏥 MEDICAL SPECIALTY CLASSIFIER - IMPROVED TRAINING")
print("="*80)

# Paths
RAW_DATA = Path("D:/Medical-Scribe/backend/datasets/raw/mtsamples.csv")
MODEL_DIR = Path("D:/Medical-Scribe/backend/datasets/models/medical_specialty_classifier")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# 1. Load data
print("\n1️⃣ Loading dataset...")
df = pd.read_csv(RAW_DATA)
df = df.dropna(subset=["transcription", "medical_specialty"])
df = df[df["transcription"].str.strip() != ""]
print(f"   ✅ {len(df)} samples loaded")

# Keep specialties with >= 20 samples
specialty_counts = df["medical_specialty"].value_counts()
valid_specialties = specialty_counts[specialty_counts >= 20].index.tolist()
df = df[df["medical_specialty"].isin(valid_specialties)]
print(f"   ✅ {len(df)} samples, {len(valid_specialties)} specialties")

#2. Split 70/30
print("\n2️⃣ Splitting: 70% train / 30% test...")
X = df["transcription"]
y = df["medical_specialty"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.30,
    random_state=42,
    stratify=y
)

TRAIN_SIZE = len(X_train)
TEST_SIZE = len(X_test)
print(f"   ✅ Train: {TRAIN_SIZE} samples (70%)")
print(f"   ✅ Test:  {TEST_SIZE} samples (30%)")

# 3. Create IMPROVED pipeline
print("\n3️⃣ Creating IMPROVED ML pipeline...")
model = Pipeline([
    ('tfidf', TfidfVectorizer(
        max_features=10000,        # Increased from 5000
        min_df=2,
        max_df=0.75,               # More aggressive filtering
        ngram_range=(1, 4),       # Extended to 4-grams (captures more medical phrases)
        sublinear_tf=True,         # Better TF scaling
        stop_words='english'
    )),
    ('classifier', LogisticRegression(
        max_iter=2000,             # More iterations
        C=1.5,                     # Regularization strength
        class_weight='balanced',   # Handle class imbalance
        solver='saga',             # Better for large datasets
        random_state=42
    ))
])
print("   ✅ IMPROVED TF-IDF (10k features, 4-grams) + Logistic Regression (balanced)")

# 4. Train
print("\n4️⃣ Training model...")
model.fit(X_train, y_train)
print("   ✅ Training complete!")

# 5. Evaluate
print("\n5️⃣ Evaluating on test set (30%)...")
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

baseline_accuracy = 0.289  # Original model
improvement = (accuracy - baseline_accuracy) * 100

print(f"\n{'='*80}")
print("🎯 IMPROVED MODEL RESULTS (30% OF DATA)")
print(f"{'='*80}")
print(f"   Baseline:     28.9%")
print(f"   New Accuracy: {accuracy*100:.2f}%")
print(f"   Improvement:  +{improvement:.1f} percentage points ({((accuracy/baseline_accuracy - 1)*100):.1f}% relative increase)")
print(f"   Train:        {TRAIN_SIZE} samples (70%)")
print(f"   Test:         {TEST_SIZE} samples (30%)")

# Top specialties performance
print("\n📊 Top 10 Specialties Performance:")
report_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
specialty_scores = []
for specialty in valid_specialties:
    if specialty in report_dict:
        specialty_scores.append({
            'name': specialty,
            'precision': report_dict[specialty]['precision'],
            'recall': report_dict[specialty]['recall'],
            'f1': report_dict[specialty]['f1-score'],
            'support': int(report_dict[specialty]['support'])
        })

specialty_scores = sorted(specialty_scores, key=lambda x: x['support'], reverse=True)[:10]
for s in specialty_scores:
    print(f"   {s['name']:40s} P:{s['precision']*100:5.1f}% R:{s['recall']*100:5.1f}% F1:{s['f1']*100:5.1f}% ({s['support']} samples)")

# 6. Save model
print(f"\n6️⃣ Saving model...")
model_file = MODEL_DIR / "model.pkl"
with open(model_file, 'wb') as f:
    pickle.dump(model, f)
print(f"   ✅ Model: {model_file}")

# Save metadata
metadata = {
    "model_name": "medical_specialty_classifier",
    "model_type": "Improved TF-IDF (10k features, 4-grams) + Logistic Regression (balanced)",
    "dataset": "mtsamples.csv",
    "total_samples": len(df),
    "train_samples": TRAIN_SIZE,
    "test_samples": TEST_SIZE,
    "train_percentage": 70.0,
    "test_percentage": 30.0,
    "num_specialties": len(valid_specialties),
    "specialties": valid_specialties,
    "accuracy": float(accuracy),
        "baseline_accuracy": 0.289,
        "improvement_percentage_points": float(improvement),
        "improvements": [
            "10,000 TF-IDF features (up from 5,000)",
            "4-gram phrases (captures complex medical terms)",
            "Balanced class weights (handles imbalanced specialties)",
            "SAGA solver with L2 regularization",
            "Sublinear TF scaling for better feature representation"
        ],
    "date_trained": pd.Timestamp.now().isoformat()
}

metadata_file = MODEL_DIR / "metadata.json"
with open(metadata_file, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"   ✅ Metadata: {metadata_file}")

# 7. Test predictions
print(f"\n{'='*80}")
print("🧪 SAMPLE PREDICTIONS")
print(f"{'='*80}")

test_cases = [
    "Patient presents with severe chest pain radiating to left arm. EKG shows ST elevation.",
    "Laparoscopic cholecystectomy performed. Gallbladder removed without complications.",
    "MRI brain: No acute intracranial abnormality detected. No mass effect seen.",
    "Patient complains of lower back pain radiating to left leg. L4-L5 disc herniation suspected.",
]

for i, text in enumerate(test_cases, 1):
    prediction = model.predict([text])[0]
    probabilities = model.predict_proba([text])[0]
    
    # Get top 3 predictions
    top_3_idx = probabilities.argsort()[-3:][::-1]
    top_3 = [(model.classes_[idx], probabilities[idx]) for idx in top_3_idx]
    
    print(f"\n{i}. {text[:65]}...")
    print(f"   → {prediction}")
    print(f"   Top 3:")
    for specialty, prob in top_3:
        bar = "█" * int(prob * 15)
        print(f"      {specialty:35s} {prob*100:5.1f}% {bar}")

print(f"\n{'='*80}")
print("✅ IMPROVED TRAINING COMPLETE!")
print(f"{'='*80}")
print(f"\n📊 Summary:")
print(f"   • Dataset: MTSamples ({len(df)} samples)")
print(f"   • Train: {TRAIN_SIZE} samples (70%)")
print(f"   • Test:  {TEST_SIZE} samples (30%)")
print(f"   • Baseline: 28.9%")
print(f"   • New Accuracy: {accuracy*100:.1f}%")
print(f"   • Improvement: +{improvement:.1f} percentage points")
print(f"   • Model: {model_file}")
print(f"\n🚀 Key Improvements:")
print(f"   • 10k TF-IDF features (2x from baseline)")
print(f"   • 4-gram phrases (captures complex medical terminology)")
print(f"   • Balanced class weights (better handling of rare specialties)")
print(f"   • SAGA solver (optimized for multi-class problems)")
print(f"\n💡 To use this model:")
print(f"   import pickle")
print(f"   model = pickle.load(open('{model_file}', 'rb'))")
print(f"   prediction = model.predict(['your text here'])[0]")
print("="*80)
