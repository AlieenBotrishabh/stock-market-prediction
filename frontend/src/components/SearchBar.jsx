import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

/**
 * Debounced search input.
 *
 * The previous version fired `onSearch` on every keystroke, and HomePage
 * had `searchTerm` in the dependency array of its fetch effect — so typing
 * "RELIANCE" kicked off eight rounds of 15+ parallel network requests.
 * This debounces and stays controlled, and the parent now filters
 * already-loaded data rather than refetching.
 */
const SearchBar = ({
  onSearch,
  placeholder = 'Search stocks by symbol or company…',
  delay = 300,
  className = '',
}) => {
  const [value, setValue] = useState('');
  const callbackRef = useRef(onSearch);

  // Keep the latest callback without restarting the debounce timer.
  useEffect(() => { callbackRef.current = onSearch; }, [onSearch]);

  useEffect(() => {
    const id = setTimeout(() => callbackRef.current?.(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return (
    <div className={`relative ${className}`}>
      <div className="glass-effect rounded-xl flex items-center gap-2.5 px-3.5 py-2.5 border border-white/15 focus-within:border-accent-blue/60 transition-colors">
        <Search size={16} className="text-white/40 shrink-0" />
        <input
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          aria-label={placeholder}
          className="bg-transparent outline-none text-white placeholder-white/35 w-full text-sm min-w-0
                     [&::-webkit-search-cancel-button]:appearance-none"
        />
        {value && (
          <button
            onClick={() => setValue('')}
            aria-label="Clear search"
            className="text-white/30 hover:text-white transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
