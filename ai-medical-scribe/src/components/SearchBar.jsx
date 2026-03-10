import { Search } from 'lucide-react';
import { useState } from 'react';

const SearchBar = ({ placeholder = 'Search...', onSearch, className = '' }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className={`flex items-center bg-white border border-gray-300 rounded-lg px-4 py-3 ${className}`}>
      <Search size={18} className="text-gray-400 mr-3 shrink-0" />
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder={placeholder}
        className="outline-none text-sm w-full text-gray-700 placeholder-gray-400 bg-transparent"
      />
    </div>
  );
};

export default SearchBar;
