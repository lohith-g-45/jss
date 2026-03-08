import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StartConsultation from './pages/StartConsultation';
import GeneratedNotes from './pages/GeneratedNotes';
import PatientRecords from './pages/PatientRecords';
import PatientDetail from './pages/PatientDetail';
import Settings from './pages/Settings';

console.log('App.jsx loaded');

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAppContext();
  
  console.log('ProtectedRoute - user:', user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  console.log('App component rendering');
  
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="consultation" element={<StartConsultation />} />
          <Route path="notes" element={<GeneratedNotes />} />
          <Route path="patients" element={<PatientRecords />} />
          <Route path="patients/:id" element={<PatientDetail />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
