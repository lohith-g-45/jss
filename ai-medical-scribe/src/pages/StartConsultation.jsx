import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, User, Calendar, ArrowRight, UserCircle, Stethoscope } from 'lucide-react';
import Header from '../components/layout/Header';
import AudioRecorder from '../components/AudioRecorder';
import TranscriptBox from '../components/TranscriptBox';
import { useAppContext } from '../context/AppContext';
import { generateNotes } from '../services/api';
import { mockSOAPNotes } from '../utils/mockData';
import { useToast } from '../components/Toast';
import Loading from '../components/Loading';

// Helper function to generate SOAP notes from conversation
const generateSOAPFromConversation = (transcript, patientInfo) => {
  if (!transcript || transcript.trim().length === 0) {
    return mockSOAPNotes;
  }

  // Parse the conversation
  const lines = transcript.split('\n').filter(line => line.trim());
  const patientStatements = [];
  const doctorStatements = [];
  
  lines.forEach(line => {
    if (line.startsWith('Patient:')) {
      patientStatements.push(line.replace('Patient:', '').trim());
    } else if (line.startsWith('Doctor:')) {
      doctorStatements.push(line.replace('Doctor:', '').trim());
    }
  });

  // Extract key information from patient statements
  const symptoms = patientStatements.filter(s => 
    s.toLowerCase().includes('pain') || 
    s.toLowerCase().includes('hurt') || 
    s.toLowerCase().includes('feel') ||
    s.toLowerCase().includes('symptom') ||
    s.toLowerCase().includes('problem')
  );

  const duration = patientStatements.find(s => 
    s.toLowerCase().includes('day') || 
    s.toLowerCase().includes('week') || 
    s.toLowerCase().includes('month') ||
    s.toLowerCase().includes('year')
  );

  // Generate SOAP notes
  const subjective = symptoms.length > 0 
    ? `Patient ${patientInfo?.patientName || 'reports'} ${symptoms.join('. ')}.${duration ? ' ' + duration : ''}`
    : `Patient presents with concerns discussed during consultation. ${patientStatements.slice(0, 2).join('. ')}.`;

  const objective = `Patient: ${patientInfo?.patientName || 'Unknown'}, Age: ${patientInfo?.age || 'Unknown'}, Gender: ${patientInfo?.gender || 'Unknown'}. Visit Date: ${patientInfo?.dateOfVisit || new Date().toISOString().split('T')[0]}. General appearance normal. Vital signs within normal limits.`;

  const assessment = symptoms.length > 0 
    ? `Based on patient history and examination, assessment indicates ${symptoms[0]?.toLowerCase().includes('pain') ? 'pain management required' : 'further evaluation needed'}.`
    : 'Clinical assessment based on consultation findings. Further diagnostic evaluation may be warranted.';

  const plan = doctorStatements.length > 1
    ? `Treatment plan discussed: ${doctorStatements.slice(0, 2).join('. ')}. Follow-up scheduled as needed.`
    : 'Continue monitoring. Follow-up appointment recommended. Patient education provided regarding condition management.';

  return {
    subjective,
    objective,
    assessment,
    plan,
    patientName: patientInfo?.patientName,
    patientAge: patientInfo?.age,
    patientGender: patientInfo?.gender,
    visitDate: patientInfo?.dateOfVisit,
    diagnosis: 'To be determined based on further evaluation',
    medications: 'As discussed during consultation',
    followUp: 'Schedule follow-up as needed',
  };
};

const StartConsultation = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    transcript,
    setTranscript,
    isRecording,
    setIsRecording,
    setGeneratedNotes,
    patientInfo,
    setPatientInfo,
  } = useAppContext();

  // Step management
  const [currentStep, setCurrentStep] = useState(1); // 1 = Patient Form, 2 = Recording

  // Patient form state
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    gender: '',
    dateOfVisit: new Date().toISOString().split('T')[0],
  });
  const [formErrors, setFormErrors] = useState({});

  // Speech recognition
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Speaker tracking - automatic alternation
  const [currentSpeaker, setCurrentSpeaker] = useState('Doctor'); // 'Doctor' or 'Patient'
  const lastSpeakerRef = useRef('Doctor');
  const lastSpeechTimeRef = useRef(Date.now());
  const silenceThreshold = 2000; // 2 seconds of silence triggers speaker change

  // Initialize speech recognition
  useEffect(() => {
    console.log('Initializing speech recognition...');
    console.log('webkitSpeechRecognition available:', 'webkitSpeechRecognition' in window);
    console.log('SpeechRecognition available:', 'SpeechRecognition' in window);
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      console.log('Speech recognition initialized successfully');

      recognitionRef.current.onresult = (event) => {
        console.log('Speech recognition result received!');
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          console.log('Transcript piece:', transcriptPiece, 'isFinal:', event.results[i].isFinal);
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece + ' ';
          }
        }

        if (finalTranscript) {
          const now = Date.now();
          const timeSinceLastSpeech = now - lastSpeechTimeRef.current;
          
          // Auto-switch speaker if there was a pause (silence) > threshold
          let speakerToUse = lastSpeakerRef.current;
          if (timeSinceLastSpeech > silenceThreshold) {
            // Alternate speaker
            speakerToUse = lastSpeakerRef.current === 'Doctor' ? 'Patient' : 'Doctor';
            lastSpeakerRef.current = speakerToUse;
            setCurrentSpeaker(speakerToUse);
          }
          
          lastSpeechTimeRef.current = now;
          
          // Add transcript with speaker label
          setTranscript((prev) => {
            if (prev === '' || timeSinceLastSpeech > silenceThreshold) {
              return prev + `\n\n${speakerToUse}: ${finalTranscript}`;
            } else {
              return prev + finalTranscript;
            }
          });
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          console.log('No speech detected, continuing...');
          // Don't show toast for no-speech, just continue
        } else if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone permissions.');
          setIsRecording(false);
          setIsListening(false);
        } else if (event.error !== 'aborted') {
          toast.error(`Speech recognition error: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        console.log('Recognition ended, isListening:', isListening);
        // Restart if still supposed to be recording
        if (isListening) {
          try {
            console.log('Restarting recognition...');
            recognitionRef.current.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
          }
        }
      };

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
      };
    } else {
      toast.error('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping recognition:', error);
        }
      }
    };
  }, []); // Empty dependency array - only initialize once

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Validate patient form
  const validateForm = () => {
    const errors = {};
    if (!formData.patientName.trim()) errors.patientName = 'Patient name is required';
    if (!formData.age || formData.age < 0 || formData.age > 150) errors.age = 'Valid age is required';
    if (!formData.gender) errors.gender = 'Gender is required';
    return errors;
  };

  // Submit patient form
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }

    setPatientInfo(formData);
    setCurrentStep(2);
    toast.success('Patient information saved. Ready to start consultation.');
  };

  // Start recording and speech recognition
  const handleStartRecording = () => {
    setTranscript('');
    setIsRecording(true);
    setIsListening(true);
    setHasRecorded(true);
    setCurrentSpeaker('Doctor');
    lastSpeakerRef.current = 'Doctor';
    lastSpeechTimeRef.current = Date.now();
    
    if (recognitionRef.current) {
      try {
        console.log('Starting speech recognition...');
        recognitionRef.current.start();
        toast.success('Recording started. Speak clearly into your microphone.');
      } catch (error) {
        console.error('Error starting recognition:', error);
        if (error.message.includes('already started')) {
          console.log('Recognition already running');
        } else {
          toast.error('Failed to start recording. Please try again.');
          setIsRecording(false);
          setIsListening(false);
        }
      }
    } else {
      toast.error('Speech recognition not initialized. Please refresh the page.');
    }
  };

  // Stop recording and speech recognition
  const handleStopRecording = () => {
    console.log('Stopping recording...');
    setIsListening(false); // Set this first so onend doesn't restart
    setIsRecording(false);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        toast.info('Recording stopped.');
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  };

  const handleRecordingComplete = async (audioBlob) => {
    // Audio blob is captured but we're using live transcription
    setHasRecorded(true);
  };

  const handleGenerateNotes = async () => {
    if (!transcript || transcript.trim().length === 0) {
      toast.warning('No transcript available. Please record a consultation first.');
      return;
    }

    setIsGenerating(true);
    try {
      toast.info('Generating AI medical notes...');
      
      // In production, use: const result = await generateNotes(transcript, patientInfo);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      // Generate SOAP notes from conversation
      const enhancedNotes = generateSOAPFromConversation(transcript, patientInfo);
      
      setGeneratedNotes(enhancedNotes);
      toast.success('Medical notes generated successfully!');
      
      // Navigate to notes page
      setTimeout(() => {
        navigate('/notes');
      }, 500);
    } catch (error) {
      toast.error('Failed to generate notes');
      console.error('Note generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Go back to patient form
  const handleEditPatient = () => {
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Start Consultation" 
        subtitle={currentStep === 1 ? 'Enter patient information to begin' : 'Record patient consultation and generate AI medical notes'}
      />
      
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep === 1 ? 'bg-primary text-white' : 'bg-green-500 text-white'
              }`}>
                1
              </div>
              <div className="w-24 h-1 bg-gray-300">
                <div className={`h-full bg-primary transition-all duration-500 ${
                  currentStep === 2 ? 'w-full' : 'w-0'
                }`} />
              </div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep === 2 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                2
              </div>
            </div>
          </div>

          {/* Step 1: Patient Information Form */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="card">
                <div className="flex items-center space-x-3 mb-6">
                  <User className="text-primary" size={28} />
                  <h2 className="text-2xl font-bold text-gray-900">Patient Information</h2>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-6">
                  {/* Patient Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Patient Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="patientName"
                      value={formData.patientName}
                      onChange={handleFormChange}
                      className={`input-field ${formErrors.patientName ? 'border-red-500' : ''}`}
                      placeholder="Enter patient's full name"
                    />
                    {formErrors.patientName && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.patientName}</p>
                    )}
                  </div>

                  {/* Age and Gender */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleFormChange}
                        className={`input-field ${formErrors.age ? 'border-red-500' : ''}`}
                        placeholder="Age"
                        min="0"
                        max="150"
                      />
                      {formErrors.age && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.age}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleFormChange}
                        className={`input-field ${formErrors.gender ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {formErrors.gender && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.gender}</p>
                      )}
                    </div>
                  </div>

                  {/* Date of Visit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Visit
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="date"
                        name="dateOfVisit"
                        value={formData.dateOfVisit}
                        onChange={handleFormChange}
                        className="input-field pl-12"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full btn-primary flex items-center justify-center space-x-2"
                  >
                    <span>Continue to Consultation</span>
                    <ArrowRight size={20} />
                  </motion.button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Step 2: Recording Interface */}
          {currentStep === 2 && (
            <>
              {/* Patient Info Summary */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-7xl mx-auto"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div>
                      <span className="text-sm text-blue-600 font-medium">Patient:</span>
                      <span className="ml-2 text-gray-900 font-semibold">{patientInfo?.patientName}</span>
                    </div>
                    <div>
                      <span className="text-sm text-blue-600 font-medium">Age:</span>
                      <span className="ml-2 text-gray-900">{patientInfo?.age} years</span>
                    </div>
                    <div>
                      <span className="text-sm text-blue-600 font-medium">Gender:</span>
                      <span className="ml-2 text-gray-900">{patientInfo?.gender}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleEditPatient}
                    className="text-sm text-primary hover:text-blue-700 font-medium"
                  >
                    Edit
                  </button>
                </div>
              </motion.div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Audio Recorder with custom controls */}
                <div className="card text-center">
                  <div className="mb-6">
                    <div className="text-5xl font-bold text-gray-900 mb-2">
                      {Math.floor(Math.random() * 10)}:{Math.floor(Math.random() * 60).toString().padStart(2, '0')}
                    </div>
                    <p className="text-sm text-gray-500">
                      {isRecording ? 'Recording in progress...' : 'Ready to record'}
                    </p>
                  </div>

                  {/* Waveform Visualization when recording */}
                  {isRecording && (
                    <div className="flex items-center justify-center space-x-1 mb-6 h-16">
                      {[...Array(20)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: [20, Math.random() * 60 + 20, 20],
                          }}
                          transition={{
                            duration: 0.3,
                            repeat: Infinity,
                            delay: i * 0.05,
                          }}
                          className="w-1 bg-primary rounded-full"
                        />
                      ))}
                    </div>
                  )}

                  {/* Main Record Button */}
                  <div className="flex justify-center mb-6">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                        isRecording
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-primary hover:bg-blue-700'
                      }`}
                    >
                      {isRecording ? (
                        <motion.div
                          animate={{ scale: [1, 0.9, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-8 h-8 bg-white rounded"
                        />
                      ) : (
                        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                      )}
                    </motion.button>
                  </div>

                  {/* Auto Speaker Detection Indicator */}
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center mb-4"
                    >
                      <div className="inline-flex items-center space-x-3 px-5 py-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-full border-2 border-gray-200">
                        <motion.div
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.7, 1]
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity
                          }}
                        >
                          {currentSpeaker === 'Doctor' ? (
                            <Stethoscope className="text-blue-600" size={20} />
                          ) : (
                            <UserCircle className="text-green-600" size={20} />
                          )}
                        </motion.div>
                        <span className="text-sm font-medium text-gray-600">Auto-detected:</span>
                        <span className={`text-sm font-bold ${
                          currentSpeaker === 'Doctor' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {currentSpeaker}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Speaker automatically switches on pauses</p>
                    </motion.div>
                  )}

                  {/* Instructions */}
                  <p className="text-sm text-gray-600">
                    {isRecording
                      ? 'Speak clearly. Click the button to stop recording.'
                      : 'Click the microphone to start recording'}
                  </p>
                </div>
                
                {/* Transcript Box */}
                <TranscriptBox 
                  transcript={transcript}
                  isRecording={isRecording}
                />
              </div>

              {/* Generate Notes Button */}
              {hasRecorded && transcript && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGenerateNotes}
                    disabled={isGenerating || isRecording}
                    className="btn-primary inline-flex items-center space-x-3 text-lg px-8 py-4 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loading size="sm" />
                        <span>Generating Notes...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={24} />
                        <span>Generate Medical Notes with AI</span>
                      </>
                    )}
                  </motion.button>
                  
                  {isGenerating && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 text-gray-600"
                    >
                      AI is analyzing the consultation with patient {patientInfo?.patientName}...
                    </motion.p>
                  )}
                </motion.div>
              )}

              {/* Instructions */}
              {!hasRecorded && !isRecording && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card max-w-2xl mx-auto mt-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    How to use:
                  </h3>
                  <ol className="space-y-2 text-gray-600">
                    <li className="flex items-start">
                      <span className="font-semibold text-primary mr-2">1.</span>
                      <span>Click the microphone button to start recording</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold text-primary mr-2">2.</span>
                      <span>Speak naturally - the system <strong>automatically detects</strong> speaker changes based on pauses</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold text-primary mr-2">3.</span>
                      <span>Conversation is transcribed with Doctor/Patient labels in real-time (switches after 2-second pauses)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold text-primary mr-2">4.</span>
                      <span>Click the stop button when finished</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold text-primary mr-2">5.</span>
                      <span>Review the transcript and click "Generate Medical Notes"</span>
                    </li>
                    <li className="flex items-start">
                      <span className="font-semibold text-primary mr-2">6.</span>
                      <span>AI will analyze the conversation and create structured SOAP notes for patient {patientInfo?.patientName}</span>
                    </li>
                  </ol>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartConsultation;
