import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// AUTH SERVICES
// ============================================

export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    // Store token
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Login failed' };
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Registration failed' };
  }
};

// ============================================
// PATIENT SERVICES
// ============================================

export const fetchPatients = async (search = '', limit = 50, offset = 0) => {
  try {
    const response = await api.get('/patients', {
      params: { search, limit, offset }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to fetch patients' };
  }
};

export const searchPatients = async (query) => {
  try {
    const response = await api.get(`/patients/search/${query}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to search patients' };
  }
};

export const getPatientById = async (patientId) => {
  try {
    const response = await api.get(`/patients/${patientId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to fetch patient details' };
  }
};

export const createPatient = async (patientData) => {
  try {
    const response = await api.post('/patients', patientData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to create patient' };
  }
};

export const updatePatient = async (patientId, updates) => {
  try {
    const response = await api.put(`/patients/${patientId}`, updates);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to update patient' };
  }
};

export const deletePatient = async (patientId) => {
  try {
    const response = await api.delete(`/patients/${patientId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to delete patient' };
  }
};

// ============================================
// CONSULTATION SERVICES
// ============================================

export const fetchConsultations = async (filters = {}) => {
  try {
    const response = await api.get('/consultations', { params: filters });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to fetch consultations' };
  }
};

export const getConsultationById = async (consultationId) => {
  try {
    const response = await api.get(`/consultations/${consultationId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to fetch consultation' };
  }
};

export const saveConsultation = async (consultationData) => {
  try {
    const response = await api.post('/consultations', consultationData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to save consultation' };
  }
};

export const updateConsultation = async (consultationId, updates) => {
  try {
    const response = await api.put(`/consultations/${consultationId}`, updates);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to update consultation' };
  }
};

export const deleteConsultation = async (consultationId) => {
  try {
    const response = await api.delete(`/consultations/${consultationId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to delete consultation' };
  }
};

export const getPatientHistory = async (patientId) => {
  try {
    const response = await api.get(`/consultations/patient/${patientId}/history`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to fetch patient history' };
  }
};

// ============================================
// LEGACY/MOCK SERVICES (for backwards compatibility)
// ============================================

export const uploadAudio = async (audioBlob, patientInfo = {}) => {
  // This would be for future AI transcription service
  console.log('Audio upload - placeholder');
  return { transcript: '' };
};

export const generateNotes = async (transcriptText, patientInfo = {}) => {
  // This would be for future AI note generation service
  console.log('AI note generation - placeholder');
  return {
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  };
};

export default api;

// ============================================
// NOTES SERVICES (Legacy)
// ============================================

export const saveNotes = async (notesData) => {
  try {
    const response = await api.post('/save-notes', notesData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to save notes' };
  }
};

export const regenerateNotes = async (transcript) => {
  // This would call AI service to regenerate notes from transcript
  console.log('Regenerate notes - placeholder');
  return {
    subjective: 'Regenerated subjective...',
    objective: 'Regenerated objective...',
    assessment: 'Regenerated assessment...',
    plan: 'Regenerated plan...'
  };
};

export const updateNotes = async (noteId, updatedData) => {
  try {
    const response = await api.put(`/notes/${noteId}`, updatedData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update notes' };
  }
};

export const getNoteById = async (noteId) => {
  try {
    const response = await api.get(`/notes/${noteId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch note' };
  }
};

// ============================================
// DASHBOARD SERVICES
// ============================================

export const getDashboardStats = async () => {
  try {
    const response = await api.get('/dashboard/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch stats' };
  }
};

export const getRecentConsultations = async (limit = 10) => {
  try {
    const response = await api.get('/consultations/recent', {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch consultations' };
  }
};

// ============================================
// USER SETTINGS SERVICES
// ============================================

export const updateUserProfile = async (userId, profileData) => {
  try {
    const response = await api.put(`/users/${userId}`, profileData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update profile' };
  }
};

export const updateUserSettings = async (userId, settings) => {
  try {
    const response = await api.put(`/users/${userId}/settings`, settings);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update settings' };
  }
};

