import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Mic,
  FileText,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAppContext();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/consultation', icon: Mic, label: 'Start Consultation' },
    { path: '/notes', icon: FileText, label: 'Generated Notes' },
    { path: '/patients', icon: Users, label: 'Patient Records' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="h-screen w-64 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Mic className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">MediScribe</h1>
            <p className="text-xs text-gray-500">AI Medical Notes</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link key={item.path} to={item.path}>
              <motion.div
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white font-semibold">
            {user?.name?.charAt(0) || 'D'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.name || 'Doctor'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.specialization || 'Medical Professional'}
            </p>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
        >
          <LogOut size={18} />
          <span className="font-medium">Logout</span>
        </motion.button>
      </div>
    </div>
  );
};

export default Sidebar;
