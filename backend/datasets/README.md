# Medical Specialty Classifier

## 🎯 Model Summary

- **Dataset**: MTSamples (4,841 medical transcription samples)
- **Training Data**: 3,388 samples (70%)
- **Test Data**: 1,453 samples (30%)
- **Accuracy**: 28.9%
- **Model Type**: TF-IDF + Logistic Regression
- **Specialties**: 29 medical specialties

## 📊 Training Results

The model was trained to predict medical specialties from consultation transcripts. While 28.9% accuracy may seem low, this is actually reasonable for a 29-class classification problem (random guessing would be ~3.4% accurate).

### Top Predicted Specialties:
1. Surgery
2. Consult - History and Phy.
3. Cardiovascular / Pulmonary4. Orthopedic
5. Radiology
6. General Medicine
7. Gastroenterology
8. Neurology

## 🚀 How to Use the Model

```python
import pickle

# Load model
model = pickle.load(open('models/medical_specialty_classifier/model.pkl', 'rb'))

# Make prediction
text = "Patient presents with chest pain and shortness of breath."
prediction = model.predict([text])[0]
probabilities = model.predict_proba([text])[0]

print(f"Predicted Specialty: {prediction}")
```

## 📁 Files Location

```
backend/datasets/
├── raw/
│   └── mtsamples.csv                  # Original dataset (4,999 samples)
├── processed/
│   ├── train_data.csv                 # Training split (3,388 samples - 70%)
│   └── test_data.csv                  # Test split (1,453 samples - 30%)
└── models/medical_specialty_classifier/
    ├── model.pkl                      # Trained model (TF-IDF + Logistic Regression)
    └── metadata.json                  # Model metadata & performance metrics
```

## 🔧 Training Scripts

1. **train_fast.py** - Quick training with scikit-learn (✅ WORKS - 30 seconds)
2. **train_model.py** - Alternative spaCy implementation
3. **test_model.py** - Test the trained model with sample texts

## 💡 Performance Notes

The model works best for common specialties with many training examples:
- **Strong**: Surgery, Cardiovascular, Radiology, Neurology
- **Moderate**: Gastroenterology, Orthopedic, Urology
- **Weaker**: Rare specialties with < 50 samples

## 🔄 To Retrain

```bash
cd backend/datasets
python train_fast.py
```

Training completes in ~30 seconds on standard hardware.

## 📈 Data Split Breakdown

| Split | Samples | Percentage | Purpose |
|-------|---------|------------|---------|
| **Training** | 3,388 | 70% | Model learns patterns |
| **Testing** | 1,453 | 30% | Evaluates accuracy |
| **Total** | 4,841 | 100% | Complete dataset |

## 🎓 Model Details

**Algorithm**: Logistic Regression with TF-IDF features
- **TF-IDF Features**: 5,000 max features, 1-3 word n-grams
- **Solver**: LBFGS (limited-memory BFGS)
- **Max Iterations**: 1,000
- **Stratified Split**: Maintains class distribution across train/test

## ✅ Integration Status

The model is **ready to use** but **not yet integrated** into the main Medical-Scribe pipeline (`nlp_pipeline.py`). To integrate, add specialty classification after transcription.

---

**Date Trained**: {{date}}
**Model Version**: 1.0
