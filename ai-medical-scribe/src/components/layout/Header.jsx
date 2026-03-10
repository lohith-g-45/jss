import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { searchPatients } from '../../services/api';

const Header = ({ title, subtitle }) => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef(null);

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await searchPatients(value.trim());
        setResults(res?.patients || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      }
    }, 300);
  };

  const handleSelect = (patient) => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    navigate(`/patients/${patient.id}`);
  };

  const handleBlur = () => {
    // Small delay so click on result fires first
    setTimeout(() => setShowDropdown(false), 150);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        {/* Title Section */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Action Section */}
        <div className="flex items-center space-x-4">
          {/* Search Bar */}
          <div className="hidden md:block relative w-72">
            <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
              <Search size={18} className="text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={handleSearch}
                onBlur={handleBlur}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
                placeholder="Search patients..."
                className="bg-transparent outline-none text-sm w-full text-gray-700 placeholder-gray-400"
              />
            </div>
            {showDropdown && results.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                {results.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => handleSelect(p)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <p className="text-sm font-semibold text-gray-900">{p.patient_name}</p>
                    <p className="text-xs text-gray-500">
                      {p.age && `Age: ${p.age}`}{p.gender && ` · ${p.gender}`}{p.phone && ` · ${p.phone}`}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && query.trim() && results.length === 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 px-4 py-3">
                <p className="text-sm text-gray-500">No patients found for "{query}"</p>
              </div>
            )}
          </div>

          {/* Signed-in User */}
          <div className="hidden lg:flex items-center space-x-3 bg-gray-100 rounded-lg px-3 py-2">
            <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: '#2563EB' }}>
              {user?.name?.charAt(0) || 'D'}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-900 truncate max-w-44">
                {user?.name || 'Doctor'}
              </p>
              <p className="text-xs text-gray-500 truncate max-w-44">
                {user?.email || 'Not signed in'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
