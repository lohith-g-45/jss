# 🏥 MediScribe AI - AI Medical Scribe Platform

A production-quality React frontend for an AI-powered medical scribe platform that helps doctors record consultations and automatically generate structured medical notes in SOAP format.

![React](https://img.shields.io/badge/React-18.3.1-blue)
![Vite](https://img.shields.io/badge/Vite-7.3.1-purple)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### Core Functionality
- 🎤 **Audio Recording** - Record doctor-patient consultations with real-time audio waveform visualization
- 📝 **AI Transcription** - Automatic speech-to-text transcription of consultations
- 🤖 **AI Note Generation** - Intelligent generation of structured SOAP notes from transcripts
- 📋 **SOAP Format** - Medical notes organized in Chief Complaint, History, Assessment, and Plan sections
- ✏️ **Editable Notes** - Review and edit AI-generated notes before saving
- 🔄 **Regeneration** - Re-generate notes with updated AI analysis

### Dashboard & Analytics
- 📊 **Statistics Dashboard** - View daily consultations, patient count, and notes generated
- 📈 **Recent Activity** - Quick access to recent consultations
- 👥 **Patient Management** - Complete patient records with consultation history
- 🔍 **Search & Filter** - Advanced search and date filtering for patient records

### User Experience
- 🎨 **Modern UI** - Clean, professional healthcare SaaS interface
- 🌙 **Dark Mode Toggle** - Support for light and dark themes (ready for implementation)
- 🎭 **Smooth Animations** - Framer Motion powered transitions and interactions
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- 🔔 **Toast Notifications** - Real-time feedback for user actions
- ⚡ **Loading States** - Skeleton loaders and loading indicators
- ♿ **Accessible** - WCAG compliant UI components

## 🛠️ Tech Stack

- **Framework**: React 18.3
- **Build Tool**: Vite 7.3
- **Styling**: TailwindCSS 3.4
- **Routing**: React Router v7
- **HTTP Client**: Axios
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **State Management**: React Context API

## 📁 Project Structure

```
ai-medical-scribe/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── layout/         # Layout components (Sidebar, Header, DashboardLayout)
│   │   ├── AudioRecorder.jsx
│   │   ├── Loading.jsx
│   │   ├── Modal.jsx
│   │   ├── PatientTable.jsx
│   │   ├── SearchBar.jsx
│   │   ├── SOAPEditor.jsx
│   │   ├── StatCard.jsx
│   │   ├── Toast.jsx
│   │   └── TranscriptBox.jsx
│   │
│   ├── pages/              # Application pages
│   │   ├── Dashboard.jsx
│   │   ├── GeneratedNotes.jsx
│   │   ├── Login.jsx
│   │   ├── PatientDetail.jsx
│   │   ├── PatientRecords.jsx
│   │   ├── Settings.jsx
│   │   └── StartConsultation.jsx
│   │
│   ├── context/            # React Context for state management
│   │   └── AppContext.jsx
│   │
│   ├── services/           # API service layer
│   │   └── api.js
│   │
│   ├── utils/              # Utility functions and mock data
│   │   ├── helpers.js
│   │   └── mockData.js
│   │
│   ├── App.jsx             # Main app component with routing
│   ├── main.jsx            # Application entry point
│   └── index.css           # Global styles and Tailwind imports
│
├── public/                 # Static assets
├── .env.example           # Environment variables template
├── tailwind.config.js     # Tailwind configuration
├── postcss.config.js      # PostCSS configuration
├── vite.config.js         # Vite configuration
└── package.json           # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd ai-medical-scribe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure your API endpoint:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

### Demo Credentials

For testing purposes, use these credentials:
- **Email**: `sarah.johnson@hospital.com`
- **Password**: `password123`

## 📦 Build for Production

```bash
npm run build
```

The optimized production build will be in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## 🎯 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎨 Design System

### Color Palette

- **Primary**: `#2563EB` (Medical Blue)
- **Background**: `#F8FAFC` (Light Gray)
- **Accent**: `#14B8A6` (Teal)
- **Cards**: `#FFFFFF` (White)

### Typography

- System font stack with fallbacks
- Font weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Components

All components follow a consistent design language:
- Rounded corners (varying from `rounded-lg` to `rounded-xl`)
- Subtle shadows for depth
- Smooth hover and active states
- Consistent spacing using Tailwind scale

## 🔌 API Integration

### Mock Data Mode (Current)

The application currently uses mock data for demonstration. All API calls are simulated with `setTimeout` and return mock data from `src/utils/mockData.js`.

### Production API Integration

To connect to a real backend:

1. Update API endpoint in `.env`:
   ```
   VITE_API_URL=https://your-api-domain.com/api
   ```

2. Remove mock data calls in components and use the actual API functions from `src/services/api.js`

3. Expected API endpoints:
   - `POST /auth/login` - User authentication
   - `POST /transcribe` - Upload audio and get transcript
   - `POST /generate-notes` - Generate SOAP notes from transcript
   - `POST /save-notes` - Save medical notes
   - `GET /patients` - Get patient list
   - `GET /patients/:id` - Get patient details
   - `GET /dashboard/stats` - Get dashboard statistics

## 🔐 Security Considerations

- User authentication with JWT tokens
- Protected routes requiring authentication
- Secure API communication
- HIPAA compliance ready (add encryption for PHI data)
- Input validation and sanitization

## 📱 Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## 🤝 Contributing

This is a demonstration project. For production use:

1. Implement proper authentication and authorization
2. Add HIPAA compliance measures
3. Implement data encryption for PHI
4. Add comprehensive error handling
5. Include unit and integration tests
6. Set up CI/CD pipeline
7. Add logging and monitoring

## 📄 License

MIT License - feel free to use this for your projects!

## 🙏 Acknowledgments

- Inspired by modern healthcare platforms like Sunoh.ai
- Built with modern React best practices
- Designed for medical professionals

## 📞 Support

For issues or questions, please open an issue in the repository.

---

**Built with ❤️ for healthcare professionals**
