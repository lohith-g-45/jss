import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const AI_API_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const aiApi = axios.create({
  baseURL: AI_API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

aiApi.interceptors.request.use((config) => {
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
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'consultation.webm');

    const response = await aiApi.post('/transcribe-and-generate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to transcribe audio' };
  }
};

export const generateNotes = async (transcriptText, patientInfo = {}) => {
  try {
    const response = await aiApi.post('/process-text', {
      text: transcriptText,
      speaker: 'Unknown',
      language: 'en',
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Failed to generate AI notes' };
  }
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
  if (!transcript?.trim()) {
    throw { message: 'Transcript is required to regenerate notes' };
  }

  const result = await generateNotes(transcript);
  return {
    chiefComplaint: result?.soap_notes?.chief_complaint || '',
    historyOfPresentIllness: result?.soap_notes?.history || '',
    pastMedicalHistory: '',
    assessment: result?.soap_notes?.assessment || '',
    plan: result?.soap_notes?.plan || '',
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
    const [patientsRes, consultationsRes] = await Promise.all([
      api.get('/patients', { params: { limit: 200, offset: 0 } }),
      api.get('/consultations', { params: { limit: 200, offset: 0 } }),
    ]);

    const patients = patientsRes.data?.patients || [];
    const consultations = consultationsRes.data?.consultations || [];
    const today = new Date().toISOString().slice(0, 10);

    const consultationsToday = consultations.filter((c) => {
      if (!c.visit_date) return false;
      return String(c.visit_date).slice(0, 10) === today;
    }).length;

    const totalDuration = consultations.reduce((sum, c) => sum + (Number(c.duration) || 0), 0);
    const averageDuration = consultations.length
      ? `${Math.round(totalDuration / consultations.length)} min`
      : '0 min';

    return {
      consultationsToday,
      totalPatients: patients.length,
      notesGenerated: consultations.length,
      averageTime: averageDuration,
    };
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch stats' };
  }
};

export const getRecentConsultations = async (limit = 10) => {
  try {
    const response = await api.get('/consultations', {
      params: { limit },
    });

    const consultations = response.data?.consultations || [];
    return {
      success: true,
      consultations: consultations.map((c) => ({
        id: c.id,
        patientId: c.patient_id,
        patientName: c.patient_name || 'Unknown Patient',
        diagnosis: c.diagnosis || 'No diagnosis recorded',
        date: c.visit_date,
        time: c.created_at
          ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '--:--',
      })),
    };
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

