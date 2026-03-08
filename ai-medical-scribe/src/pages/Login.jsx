import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Eye, EyeOff, Stethoscope } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { login as apiLogin } from '../services/api';
import { useToast } from '../components/Toast';
import Loading from '../components/Loading';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAppContext();
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiLogin(formData.email, formData.password);
      login(response.user);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.error || error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4"
          >
            <Stethoscope className="text-white" size={32} />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            MediScribe AI
          </h1>
          <p className="text-gray-600">
            Intelligent Medical Documentation
          </p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Doctor Login
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-field pr-12 ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="doctor@hospital.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field pr-12 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-600">
                  Remember me
                </span>
              </label>
              <a href="#" className="text-sm text-primary hover:text-blue-700">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loading size="sm" />
                  <span className="ml-2">Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* DB Login Hint */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800 font-medium mb-2">
              Sign in with credentials stored in your database:
            </p>
            <p className="text-xs text-blue-700">
              Example Email: sarah.johnson@hospital.com
            </p>
            <p className="text-xs text-blue-700">
              Example Password: password123
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              New user?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-primary hover:text-blue-700 font-medium"
              >
                Create account
              </button>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          © 2026 MediScribe AI. Secure medical platform.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
