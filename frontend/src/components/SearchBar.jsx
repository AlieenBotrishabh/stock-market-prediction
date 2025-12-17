import React from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ onSearch, placeholder = 'Search stocks by symbol or company...' }) => {
  return (
    <div className="relative w-full">
      <div className="glass-effect rounded-xl flex items-center gap-3 px-4 py-3 border border-border-color focus-within:border-accent-green transition">
        <Search size={20} className="text-text-secondary" />
        <input
          type="text"
          placeholder={placeholder}
          onChange={(e) => onSearch(e.target.value)}
          className="bg-transparent outline-none text-white placeholder-text-secondary w-full"
        />
      </div>
    </div>
  );
};

export default SearchBar;
