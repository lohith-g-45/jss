import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Phone, MapPin, AlertCircle, Pill, Calendar, Play } from 'lucide-react';
import Header from '../components/layout/Header';
import SOAPEditor from '../components/SOAPEditor';
import Modal from '../components/Modal';
import Loading from '../components/Loading';
import { getPatientById } from '../services/api';
import { formatDate } from '../utils/helpers';

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadPatientData();
  }, [id]);

  const loadPatientData = async () => {
    setIsLoading(true);
    try {
      const response = await getPatientById(id);
      const rawPatient = response?.patient;
      const consultations = response?.consultations || [];

      if (!rawPatient) {
        setPatient(null);
        return;
      }

      const mappedConsultations = consultations.map((c) => ({
        id: c.id,
        chiefComplaint: c.diagnosis || c.subjective || 'Consultation',
        date: c.visit_date,
        time: c.created_at
          ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '--:--',
        doctor: c.doctor_name || 'Doctor',
        transcript: c.transcript || 'No transcript available',
        notes: {
          chiefComplaint: c.subjective || '',
          historyOfPresentIllness: c.objective || '',
          pastMedicalHistory: '',
          assessment: c.assessment || '',
          plan: c.plan || '',
        },
      }));

      setPatient({
        id: rawPatient.id,
        name: rawPatient.patient_name,
        age: rawPatient.age,
        gender: rawPatient.gender,
        email: rawPatient.email || 'N/A',
        phone: rawPatient.phone || 'N/A',
        address: rawPatient.address || 'N/A',
        medicalHistory: {
          allergies: rawPatient.allergies ? rawPatient.allergies.split(',').map((x) => x.trim()).filter(Boolean) : ['None recorded'],
          medications: rawPatient.medical_history ? [rawPatient.medical_history] : ['None recorded'],
          conditions: [],
        },
        consultations: mappedConsultations,
      });
    } catch (error) {
      console.error('Error loading patient:', error);
      setPatient(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewConsultation = (consultation) => {
    setSelectedConsultation(consultation);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Patient not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="Patient Details" 
        subtitle="Complete patient information and consultation history"
      />
      
      <div className="p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Patient Records</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Info Card */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24">
              {/* Avatar and Name */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                  {patient.name.charAt(0)}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {patient.name}
                </h2>
                <p className="text-gray-500">
                  {patient.age} years • {patient.gender}
                </p>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center space-x-3 text-sm">
                  <Mail className="text-gray-400" size={18} />
                  <span className="text-gray-700">{patient.email}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <Phone className="text-gray-400" size={18} />
                  <span className="text-gray-700">{patient.phone}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <MapPin className="text-gray-400" size={18} />
                  <span className="text-gray-700">{patient.address}</span>
                </div>
              </div>

              {/* Medical History */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <AlertCircle className="mr-2 text-red-500" size={18} />
                  Allergies
                </h3>
                <div className="space-y-2 mb-4">
                  {patient.medicalHistory.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="inline-block bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm mr-2"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>

                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Pill className="mr-2 text-blue-500" size={18} />
                  Current Medications
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {patient.medicalHistory.medications.map((med, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2"></span>
                      {med}
                    </li>
                  ))}
                </ul>

                <h3 className="font-semibold text-gray-900 mb-3 mt-4">
                  Conditions
                </h3>
                <div className="space-y-2">
                  {patient.medicalHistory.conditions.map((condition, index) => (
                    <span
                      key={index}
                      className="inline-block bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm mr-2"
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Consultation History */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Consultation History ({patient.consultations.length})
              </h2>

              <div className="space-y-4">
                {patient.consultations.map((consultation, index) => (
                  <motion.div
                    key={consultation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {consultation.chiefComplaint}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {formatDate(consultation.date)} at {consultation.time}
                          </span>
                          <span>Dr. {consultation.doctor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleViewConsultation(consultation)}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <span>View Details</span>
                      </button>
                      {consultation.audioUrl && (
                        <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                          <Play size={16} />
                          <span>Play Audio</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Consultation Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Consultation Details"
        size="xl"
      >
        {selectedConsultation && (
          <div className="space-y-6">
            {/* Transcript */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Transcript
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-64 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedConsultation.transcript}
                </p>
              </div>
            </div>

            {/* SOAP Notes */}
            {selectedConsultation.notes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Medical Notes
                </h3>
                <SOAPEditor
                  initialNotes={selectedConsultation.notes}
                  isEditable={false}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PatientDetail;
