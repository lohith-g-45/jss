// Mock user data
export const mockUser = {
  id: '1',
  name: 'Dr. Sarah Johnson',
  email: 'sarah.johnson@hospital.com',
  specialization: 'Internal Medicine',
  hospital: 'City General Hospital',
  token: 'mock-jwt-token-12345',
};

// Mock dashboard stats
export const mockDashboardStats = {
  consultationsToday: 8,
  totalPatients: 156,
  notesGenerated: 8,
  averageTime: '12 min',
};

// Mock recent consultations
export const mockRecentConsultations = [
  {
    id: '1',
    patientName: 'John Smith',
    date: '2026-03-07',
    time: '09:30 AM',
    diagnosis: 'Hypertension Follow-up',
    status: 'completed',
  },
  {
    id: '2',
    patientName: 'Mary Johnson',
    date: '2026-03-07',
    time: '10:15 AM',
    diagnosis: 'Type 2 Diabetes',
    status: 'completed',
  },
  {
    id: '3',
    patientName: 'Robert Williams',
    date: '2026-03-07',
    time: '11:00 AM',
    diagnosis: 'Annual Physical',
    status: 'completed',
  },
  {
    id: '4',
    patientName: 'Patricia Brown',
    date: '2026-03-07',
    time: '02:30 PM',
    diagnosis: 'Respiratory Infection',
    status: 'in-progress',
  },
];

// Mock patient records
export const mockPatients = [
  {
    id: '1',
    name: 'John Smith',
    age: 58,
    gender: 'Male',
    lastVisit: '2026-03-07',
    diagnosis: 'Hypertension',
    doctor: 'Dr. Sarah Johnson',
    consultations: 12,
  },
  {
    id: '2',
    name: 'Mary Johnson',
    age: 45,
    gender: 'Female',
    lastVisit: '2026-03-07',
    diagnosis: 'Type 2 Diabetes',
    doctor: 'Dr. Sarah Johnson',
    consultations: 8,
  },
  {
    id: '3',
    name: 'Robert Williams',
    age: 62,
    gender: 'Male',
    lastVisit: '2026-03-07',
    diagnosis: 'Annual Physical',
    doctor: 'Dr. Sarah Johnson',
    consultations: 5,
  },
  {
    id: '4',
    name: 'Patricia Brown',
    age: 34,
    gender: 'Female',
    lastVisit: '2026-03-07',
    diagnosis: 'Respiratory Infection',
    doctor: 'Dr. Sarah Johnson',
    consultations: 3,
  },
  {
    id: '5',
    name: 'Michael Davis',
    age: 51,
    gender: 'Male',
    lastVisit: '2026-03-05',
    diagnosis: 'Back Pain',
    doctor: 'Dr. Sarah Johnson',
    consultations: 6,
  },
];

// Mock transcript
export const mockTranscript = `Doctor: Good morning, how are you feeling today?

Patient: I've been having some chest discomfort and shortness of breath, especially when I walk up stairs.

Doctor: When did these symptoms start?

Patient: About two weeks ago. It's been getting progressively worse.

Doctor: Are you experiencing any other symptoms? Pain in your arms, jaw, or back?

Patient: Sometimes I feel a slight pain in my left arm.

Doctor: I see. Let me check your blood pressure and heart rate. Do you have a family history of heart disease?

Patient: Yes, my father had a heart attack when he was 55.

Doctor: Thank you for that information. I'm going to order an EKG and some blood tests. We need to rule out any cardiac issues.`;

// Mock SOAP notes
export const mockSOAPNotes = {
  chiefComplaint: 'Chest discomfort and shortness of breath for 2 weeks',
  
  historyOfPresentIllness: `Patient is a 58-year-old male presenting with chief complaint of chest discomfort and dyspnea on exertion for approximately 2 weeks. Symptoms are progressive in nature. Patient reports occasional left arm pain. Denies nausea, vomiting, or diaphoresis. Symptoms worsen with physical activity, particularly climbing stairs.`,
  
  pastMedicalHistory: `- Hypertension (diagnosed 5 years ago)
- Hyperlipidemia
- No prior cardiac events
- Family history: Father had MI at age 55`,
  
  assessment: `1. Chest pain, concerning for acute coronary syndrome
2. Dyspnea on exertion
3. Known cardiovascular risk factors (HTN, hyperlipidemia, positive family history)

Differential diagnosis includes:
- Unstable angina
- Myocardial infarction
- Pulmonary embolism
- Costochondritis`,
  
  plan: `1. Immediate EKG
2. Cardiac enzyme panel (Troponin, CK-MB)
3. Complete blood count
4. Comprehensive metabolic panel
5. Lipid profile
6. Chest X-ray
7. Consider cardiology consult if initial workup concerning
8. Patient education regarding warning signs
9. Follow-up in 2-3 days or sooner if symptoms worsen
10. Continue current antihypertensive medication`,
};

// Mock patient detail
export const mockPatientDetail = {
  id: '1',
  name: 'John Smith',
  age: 58,
  gender: 'Male',
  dateOfBirth: '1967-05-15',
  phone: '(555) 123-4567',
  email: 'john.smith@email.com',
  address: '123 Main St, City, State 12345',
  
  medicalHistory: {
    allergies: ['Penicillin', 'Sulfa drugs'],
    medications: ['Lisinopril 10mg daily', 'Atorvastatin 20mg daily'],
    conditions: ['Hypertension', 'Hyperlipidemia'],
  },
  
  consultations: [
    {
      id: 'c1',
      date: '2026-03-07',
      time: '09:30 AM',
      doctor: 'Dr. Sarah Johnson',
      chiefComplaint: 'Chest discomfort and shortness of breath',
      transcript: mockTranscript,
      notes: mockSOAPNotes,
      audioUrl: null,
    },
    {
      id: 'c2',
      date: '2026-02-15',
      time: '10:00 AM',
      doctor: 'Dr. Sarah Johnson',
      chiefComplaint: 'Hypertension follow-up',
      transcript: 'Previous consultation transcript...',
      notes: null,
      audioUrl: null,
    },
  ],
};

// Mock API response structure
export const mockApiResponses = {
  login: {
    success: true,
    data: mockUser,
    message: 'Login successful',
  },
  
  transcribe: {
    success: true,
    data: {
      transcript: mockTranscript,
      duration: 180, // seconds
      consultationId: 'c1',
    },
    message: 'Transcription completed',
  },
  
  generateNotes: {
    success: true,
    data: {
      notes: mockSOAPNotes,
      noteId: 'n1',
      consultationId: 'c1',
    },
    message: 'Notes generated successfully',
  },
  
  saveNotes: {
    success: true,
    data: {
      noteId: 'n1',
      saved: true,
    },
    message: 'Notes saved successfully',
  },
  
  fetchPatients: {
    success: true,
    data: mockPatients,
    total: mockPatients.length,
    message: 'Patients fetched successfully',
  },
  
  dashboardStats: {
    success: true,
    data: mockDashboardStats,
    message: 'Stats fetched successfully',
  },
};
