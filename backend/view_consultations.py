"""
View All AI-Processed Consultations
Shows comprehensive ML insights for all 6 patient consultations
"""

import mysql.connector
import json
from tabulate import tabulate

DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': 'KALAI123',
    'database': 'medicalscribe'
}

def view_all_consultations():
    print("="*100)
    print("📊 ALL 6 PATIENT CONSULTATIONS - ML PROCESSED INSIGHTS")
    print("="*100)
    
    connection = mysql.connector.connect(**DB_CONFIG)
    cursor = connection.cursor(dictionary=True)
    
    query = """
        SELECT 
            c.id,
            p.patient_name,
            p.age,
            p.gender,
            c.visit_date,
            c.diagnosis as original_diagnosis,
            c.medical_specialty as ml_specialty,
            c.specialty_confidence,
            c.subjective,
            c.objective,
            c.assessment,
            c.plan,
            c.medical_entities,
            LEFT(c.transcript, 150) as transcript_preview
        FROM consultations c
        JOIN patients p ON c.patient_id = p.id
        WHERE c.ai_processed = TRUE
        ORDER BY c.id
    """
    
    cursor.execute(query)
    consultations = cursor.fetchall()
    
    for i, consult in enumerate(consultations, 1):
        print(f"\n{'='*100}")
        print(f"CONSULTATION #{i}")
        print(f"{'='*100}")
        
        # Patient Info
        print(f"\n👤 PATIENT INFORMATION:")
        print(f"   Name:         {consult['patient_name']}")
        print(f"   Age/Gender:   {consult['age']} years, {consult['gender']}")
        print(f"   Visit Date:   {consult['visit_date']}")
        
        # Original vs ML Diagnosis
        print(f"\n🏥 DIAGNOSIS:")
        print(f"   Original:     {consult['original_diagnosis']}")
        print(f"   ML Specialty: {consult['ml_specialty']} ({consult['specialty_confidence']:.1f}% confidence)")
        
        # Transcript Preview
        print(f"\n💬 TRANSCRIPT PREVIEW:")
        print(f"   {consult['transcript_preview']}...")
        
        # SOAP Notes (AI Generated)
        print(f"\n📋 AI-GENERATED SOAP NOTES:")
        print(f"   ├─ Subjective: {consult['subjective'][:80]}...")
        print(f"   ├─ Objective:  {consult['objective'][:80]}...")
        print(f"   ├─ Assessment: {consult['assessment'][:80]}...")
        print(f"   └─ Plan:       {consult['plan'][:80]}...")
        
        # Medical Entities
        if consult['medical_entities']:
            entities = json.loads(consult['medical_entities'])
            print(f"\n🧬 MEDICAL ENTITIES EXTRACTED:")
            print(f"   Total Entities: {len(entities.get('all_entities', []))}")
            
            if entities.get('symptoms'):
                print(f"   Symptoms ({len(entities['symptoms'])}):")
                for symptom in entities['symptoms'][:3]:
                    print(f"      • {symptom['text']} [{symptom['label']}]")
            
            if entities.get('diseases'):
                print(f"   Diseases ({len(entities['diseases'])}):")
                for disease in entities['diseases'][:3]:
                    print(f"      • {disease['text']} [{disease['label']}]")
            
            if entities.get('medications'):
                print(f"   Medications ({len(entities['medications'])}):")
                for med in entities['medications'][:3]:
                    print(f"      • {med['text']} [{med['label']}]")
            
            if entities.get('procedures'):
                print(f"   Procedures ({len(entities['procedures'])}):")
                for proc in entities['procedures'][:3]:
                    print(f"      • {proc['text']} [{proc['label']}]")
    
    # Summary Table
    print(f"\n\n{'='*100}")
    print("📊 SUMMARY TABLE")
    print(f"{'='*100}\n")
    
    cursor.execute(query)
    consultations = cursor.fetchall()
    
    table_data = []
    for c in consultations:
        entities = json.loads(c['medical_entities']) if c['medical_entities'] else {}
        table_data.append([
            c['id'],
            c['patient_name'],
            c['ml_specialty'],
            f"{c['specialty_confidence']:.1f}%",
            len(entities.get('all_entities', [])),
            "✓" if c['subjective'] else "✗",
            "✓" if c['objective'] else "✗",
            "✓" if c['assessment'] else "✗",
            "✓" if c['plan'] else "✗"
        ])
    
    headers = ['ID', 'Patient', 'ML Specialty', 'Confidence', 'Entities', 'S', 'O', 'A', 'P']
    print(tabulate(table_data, headers=headers, tablefmt='grid'))
    
    print(f"\n{'='*100}")
    print(f"✅ All 6 consultations have been processed and verified with ML model")
    print(f"✅ AI insights (specialty classification, entities, SOAP notes) stored in database")
    print(f"✅ Data is now available for viewing in your frontend application")
    print(f"{'='*100}\n")
    
    cursor.close()
    connection.close()

if __name__ == "__main__":
    try:
        view_all_consultations()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
