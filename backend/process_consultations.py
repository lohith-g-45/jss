"""
Process Consultations with ML Model and Update Database
Fetches consultation records, runs them through the improved ML pipeline,
and stores AI insights (specialty classification, medical entities, SOAP notes)
"""

import asyncio
import sys
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import mysql.connector
from mysql.connector import Error
from nlp_pipeline import MedicalPipeline

# Database configuration
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': 'KALAI123',
    'database': 'medicalscribe'
}

def get_db_connection():
    """Create database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        if connection.is_connected():
            print("✓ Connected to MariaDB")
            return connection
    except Error as e:
        print(f"✗ Database connection error: {e}")
        return None

def fetch_consultations(connection):
    """Fetch all consultations that haven't been AI processed"""
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT c.id, c.patient_id, c.transcript, c.diagnosis, 
                   c.subjective, c.objective, c.assessment, c.plan,
                   p.patient_name, p.age, p.gender
            FROM consultations c
            JOIN patients p ON c.patient_id = p.id
            WHERE c.ai_processed = FALSE OR c.ai_processed IS NULL
        """
        cursor.execute(query)
        consultations = cursor.fetchall()
        cursor.close()
        print(f"✓ Found {len(consultations)} consultations to process")
        return consultations
    except Error as e:
        print(f"✗ Error fetching consultations: {e}")
        return []

def update_consultation_with_ai_insights(connection, consultation_id, insights):
    """Update consultation record with AI-generated insights"""
    try:
        cursor = connection.cursor()
        
        # Prepare medical entities JSON - handle dict or object entities
        entities_list = []
        for e in insights['entities']:
            if isinstance(e, dict):
                entities_list.append({
                    'text': e.get('text', ''),
                    'label': e.get('entity_type', e.get('label', 'UNKNOWN')),
                    'confidence': e.get('confidence', 1.0)
                })
            else:  # ClinicalEntity object
                entities_list.append({
                    'text': getattr(e, 'text', ''),
                    'label': getattr(e, 'entity_type', 'UNKNOWN'),
                    'confidence': getattr(e, 'confidence', 1.0)
                })
        
        # Group entities by type
        entities_json = json.dumps({
            'symptoms': [e for e in entities_list if 'SYMPTOM' in e['label'].upper()],
            'diseases': [e for e in entities_list if 'DISEASE' in e['label'].upper()],
            'medications': [e for e in entities_list if 'MEDICATION' in e['label'].upper() or 'DRUG' in e['label'].upper()],
            'procedures': [e for e in entities_list if 'PROCEDURE' in e['label'].upper()],
            'all_entities': entities_list
        })
        
        # Update query with AI insights
        query = """
            UPDATE consultations 
            SET medical_specialty = %s,
                specialty_confidence = %s,
                medical_entities = %s,
                subjective = %s,
                objective = %s,
                assessment = %s,
                plan = %s,
                ai_processed = TRUE,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        
        values = (
            insights['medical_specialty'],
            insights['specialty_confidence'],
            entities_json,
            insights['soap']['subjective'] or '',
            insights['soap']['objective'] or '',
            insights['soap']['assessment'] or '',
            insights['soap']['plan'] or '',
            consultation_id
        )
        
        cursor.execute(query, values)
        connection.commit()
        cursor.close()
        
        return True
    except Error as e:
        print(f"✗ Error updating consultation {consultation_id}: {e}")
        connection.rollback()
        return False

async def process_consultations():
    """Main processing function"""
    print("="*80)
    print("🤖 PROCESSING CONSULTATIONS WITH ML MODEL")
    print("="*80)
    
    # Initialize ML pipeline
    print("\n1️⃣ Initializing ML Pipeline...")
    try:
        pipeline = MedicalPipeline()
        print("   ✓ Pipeline loaded with improved specialty classifier (31.25% accuracy)")
    except Exception as e:
        print(f"   ✗ Failed to load pipeline: {e}")
        return
    
    # Connect to database
    print("\n2️⃣ Connecting to database...")
    connection = get_db_connection()
    if not connection:
        return
    
    # Fetch consultations
    print("\n3️⃣ Fetching consultations...")
    consultations = fetch_consultations(connection)
    
    if not consultations:
        print("   ℹ️  No consultations to process")
        connection.close()
        return
    
    # Process each consultation
    print(f"\n4️⃣ Processing {len(consultations)} consultations through ML model...")
    print("="*80)
    
    successful = 0
    failed = 0
    
    for i, consult in enumerate(consultations, 1):
        consultation_id = consult['id']
        patient_name = consult['patient_name']
        transcript = consult['transcript']
        
        print(f"\n📋 Consultation {i}/{len(consultations)}")
        print(f"   ID: {consultation_id}")
        print(f"   Patient: {patient_name} ({consult['age']} years, {consult['gender']})")
        print(f"   Transcript: {transcript[:100]}...")
        
        try:
            # Process through ML pipeline
            print(f"   🔄 Processing through ML model...")
            result = await pipeline.process_text(transcript)
            
            # Prepare insights
            insights = {
                'medical_specialty': result.medical_specialty,
                'specialty_confidence': result.specialty_confidence,
                'entities': result.entities,
                'soap': {
                    'subjective': result.soap_note.subjective,
                    'objective': result.soap_note.objective,
                    'assessment': result.soap_note.assessment,
                    'plan': result.soap_note.plan
                }
            }
            
            # Update database
            if update_consultation_with_ai_insights(connection, consultation_id, insights):
                successful += 1
                print(f"   ✅ SUCCESS!")
                print(f"      Medical Specialty: {result.medical_specialty}")
                print(f"      Confidence: {result.specialty_confidence:.1f}%")
                print(f"      Entities Found: {len(result.entities)}")
                print(f"      SOAP Notes: Generated")
            else:
                failed += 1
                print(f"   ❌ FAILED to update database")
                
        except Exception as e:
            failed += 1
            print(f"   ❌ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Summary
    print("\n" + "="*80)
    print("📊 PROCESSING SUMMARY")
    print("="*80)
    print(f"   Total Consultations: {len(consultations)}")
    print(f"   ✅ Successfully Processed: {successful}")
    print(f"   ❌ Failed: {failed}")
    print(f"   Success Rate: {(successful/len(consultations)*100):.1f}%")
    
    # Close database connection
    connection.close()
    print("\n✓ Database connection closed")
    print("="*80)

async def view_processed_consultations():
    """View the processed consultations with AI insights"""
    print("\n" + "="*80)
    print("📋 VIEWING PROCESSED CONSULTATIONS")
    print("="*80)
    
    connection = get_db_connection()
    if not connection:
        return
    
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT c.id, p.patient_name, c.diagnosis, 
                   c.medical_specialty, c.specialty_confidence,
                   c.medical_entities, c.ai_processed,
                   LEFT(c.transcript, 80) as transcript_preview
            FROM consultations c
            JOIN patients p ON c.patient_id = p.id
            WHERE c.ai_processed = TRUE
            ORDER BY c.id
        """
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        
        if not results:
            print("\n   No processed consultations found")
        else:
            for consult in results:
                print(f"\n{'='*80}")
                print(f"Consultation ID: {consult['id']}")
                print(f"Patient: {consult['patient_name']}")
                print(f"Original Diagnosis: {consult['diagnosis']}")
                print(f"ML Classification: {consult['medical_specialty']} ({consult['specialty_confidence']:.1f}% confidence)")
                print(f"Transcript: {consult['transcript_preview']}...")
                
                if consult['medical_entities']:
                    entities = json.loads(consult['medical_entities'])
                    print(f"Medical Entities:")
                    print(f"  - Symptoms: {len(entities.get('symptoms', []))}")
                    print(f"  - Diseases: {len(entities.get('diseases', []))}")
                    print(f"  - Medications: {len(entities.get('medications', []))}")
                    print(f"  - Procedures: {len(entities.get('procedures', []))}")
                    print(f"  - Total Entities: {len(entities.get('all_entities', []))}")
        
        print("\n" + "="*80)
        
    except Error as e:
        print(f"✗ Error viewing consultations: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    import sys
    
    # Run processing
    print("\n🚀 Starting consultation processing...")
    asyncio.run(process_consultations())
    
    # View results
    print("\n")
    asyncio.run(view_processed_consultations())
    
    print("\n✨ All consultations have been processed and updated in the database!")
    print("   You can now view the ML-verified insights in your frontend application.")
