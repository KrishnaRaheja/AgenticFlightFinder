import { useState, useEffect, useRef } from 'react';
import airportsData from '../data/airports.json';

// Pre-build a lowercase index once at module load time
const airports = airportsData.map((a) => ({
  iata: a.iata,
  name: a.name,
  nameLower: a.name.toLowerCase(),
  iataLower: a.iata.toLowerCase(),
}));

function search(query) {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  const exact = [];
  const codeStarts = [];
  const nameStarts = [];
  const nameContains = [];

  for (const a of airports) {
    if (a.iataLower === q) {
      exact.push(a);
    } else if (a.iataLower.startsWith(q)) {
      codeStarts.push(a);
    } else if (a.nameLower.startsWith(q)) {
      nameStarts.push(a);
    } else if (a.nameLower.includes(q)) {
      nameContains.push(a);
    }
    if (exact.length + codeStarts.length + nameStarts.length + nameContains.length >= 50) break;
  }

  return [...exact, ...codeStarts, ...nameStarts, ...nameContains].slice(0, 8);
}

function displayLabel(airport) {
  return `${airport.name} (${airport.iata})`;
}

export default function AirportSearch({ name, value, onChange, placeholder, required }) {
  // inputText: what the user sees in the box
  // value (prop): the committed IATA code
  const [inputText, setInputText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Sync display text when the value prop changes externally (e.g. form reset)
  useEffect(() => {
    if (!value) {
      setInputText('');
      return;
    }
    const match = airports.find((a) => a.iata === value);
    if (match) setInputText(displayLabel(match));
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleInputChange(e) {
    const text = e.target.value;
    setInputText(text);
    setHighlighted(0);

    if (!text.trim()) {
      onChange('');
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const results = search(text);
    setSuggestions(results);
    setOpen(results.length > 0);
    // If the user clears the committed value while typing
    onChange('');
  }

  function handleSelect(airport) {
    setInputText(displayLabel(airport));
    setSuggestions([]);
    setOpen(false);
    onChange(airport.iata);
  }

  function handleKeyDown(e) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[highlighted]) handleSelect(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={inputText}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        className="w-full px-3 py-2 border border-botanical-card rounded focus:outline-none focus:ring-2 focus:ring-botanical-accent input-smooth"
      />
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-botanical-card rounded shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((airport, i) => (
            <li
              key={airport.iata}
              onMouseDown={() => handleSelect(airport)}
              onMouseEnter={() => setHighlighted(i)}
              className={`px-3 py-2 cursor-pointer text-sm flex justify-between items-center gap-2 ${
                i === highlighted ? 'bg-botanical-accent/20' : 'hover:bg-botanical-accent/10'
              }`}
            >
              <span className="text-botanical-subtext truncate">{airport.name}</span>
              <span className="text-botanical-subtext font-mono font-semibold shrink-0">{airport.iata}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
