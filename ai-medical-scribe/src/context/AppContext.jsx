import { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [generatedNotes, setGeneratedNotes] = useState(null);
  const [consultationData, setConsultationData] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const startConsultation = () => {
    setTranscript('');
    setGeneratedNotes(null);
    setConsultationData({
      startTime: new Date(),
      patientName: '',
      doctorId: user?.id,
    });
  };

  const saveTranscript = (text) => {
    setTranscript(prev => prev + ' ' + text);
  };

  const saveGeneratedNotes = (notes) => {
    setGeneratedNotes(notes);
  };

  const clearConsultation = () => {
    setTranscript('');
    setGeneratedNotes(null);
    setConsultationData(null);
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
  };

  const value = {
    user,
    setUser,
    login,
    logout,
    transcript,
    setTranscript,
    generatedNotes,
    setGeneratedNotes,
    consultationData,
    setConsultationData,
    darkMode,
    setDarkMode,
    isRecording,
    setIsRecording,
    recordingTime,
    setRecordingTime,
    audioBlob,
    setAudioBlob,
    patientInfo,
    setPatientInfo,
    startConsultation,
    saveTranscript,
    saveGeneratedNotes,
    clearConsultation,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
