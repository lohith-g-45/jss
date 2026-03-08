import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/layout/Header';
import SOAPEditor from '../components/SOAPEditor';
import { useAppContext } from '../context/AppContext';
import { regenerateNotes, saveConsultation } from '../services/api';
import { useToast } from '../components/Toast';

const GeneratedNotes = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { generatedNotes, setGeneratedNotes, transcript, clearConsultation, patientInfo, user } = useAppContext();
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (!generatedNotes) {
      navigate('/consultation');
    }
  }, [generatedNotes, navigate]);

  const handleSaveNotes = async (notes) => {
    try {
      toast.info('Saving notes...');

      const payload = {
        patient_id: patientInfo?.id,
        doctor_id: user?.id,
        visit_date: patientInfo?.dateOfVisit || new Date().toISOString().slice(0, 10),
        transcript: transcript || '',
        subjective: notes?.chiefComplaint || '',
        objective: notes?.historyOfPresentIllness || '',
        assessment: notes?.assessment || '',
        plan: notes?.plan || '',
        diagnosis: notes?.assessment || 'General consultation',
        medications: notes?.pastMedicalHistory || '',
        follow_up: 'As advised by doctor',
        status: 'completed',
        duration: 15,
      };

      if (!payload.patient_id || !payload.doctor_id) {
        throw new Error('Missing patient or doctor information');
      }

      await saveConsultation(payload);
      
      toast.success('Notes saved successfully!');
      
      // Optionally navigate to patients page
      setTimeout(() => {
        navigate('/patients');
        clearConsultation();
      }, 1500);
    } catch (error) {
      toast.error('Failed to save notes');
      console.error('Save error:', error);
      throw error;
    }
  };

  const handleRegenerate = async () => {
    if (!transcript) {
      toast.warning('No transcript available to regenerate notes');
      return;
    }

    setIsRegenerating(true);
    try {
      toast.info('Regenerating notes with AI...');

      const newNotes = await regenerateNotes(transcript);
      
      setGeneratedNotes(newNotes);
      toast.success('Notes regenerated successfully!');
    } catch (error) {
      toast.error('Failed to regenerate notes');
      console.error('Regeneration error:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="AI Generated Notes" 
        subtitle="Review and edit the AI-generated SOAP notes"
      />
      
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          {/* Info Banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
          >
            <p className="text-sm text-blue-800">
              <span className="font-semibold">AI-Generated Content:</span> Please review and edit as needed. 
              These notes are generated from the consultation transcript and should be verified for accuracy.
            </p>
          </motion.div>

          {/* SOAP Editor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SOAPEditor
              initialNotes={generatedNotes}
              onSave={handleSaveNotes}
              onRegenerate={handleRegenerate}
              isEditable={true}
            />
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center space-x-4 mt-8"
          >
            <button
              onClick={() => navigate('/consultation')}
              className="btn-secondary"
            >
              Start New Consultation
            </button>
            <button
              onClick={() => navigate('/patients')}
              className="px-6 py-3 text-primary hover:text-blue-700 font-medium"
            >
              View Patient Records
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default GeneratedNotes;
