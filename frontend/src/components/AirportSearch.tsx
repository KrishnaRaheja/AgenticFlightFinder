import { useState, useEffect, useRef } from 'react'
import airportsData from '@/data/airports.json'
import { cn } from '@/lib/utils'

interface Airport {
  iata: string
  name: string
  nameLower: string
  iataLower: string
}

interface RawAirport {
  iata: string
  name: string
}

const airports: Airport[] = (airportsData as RawAirport[]).map((a) => ({
  iata: a.iata,
  name: a.name,
  nameLower: a.name.toLowerCase(),
  iataLower: a.iata.toLowerCase(),
}))

function search(query: string): Airport[] {
  if (!query) return []
  const q = query.toLowerCase().trim()
  const exact: Airport[] = []
  const codeStarts: Airport[] = []
  const nameStarts: Airport[] = []
  const nameContains: Airport[] = []

  for (const a of airports) {
    if (a.iataLower === q) exact.push(a)
    else if (a.iataLower.startsWith(q)) codeStarts.push(a)
    else if (a.nameLower.startsWith(q)) nameStarts.push(a)
    else if (a.nameLower.includes(q)) nameContains.push(a)
    if (exact.length + codeStarts.length + nameStarts.length + nameContains.length >= 50) break
  }

  return [...exact, ...codeStarts, ...nameStarts, ...nameContains].slice(0, 8)
}

function displayLabel(airport: Airport): string {
  return `${airport.name} (${airport.iata})`
}

interface AirportSearchProps {
  name?: string
  value: string
  onChange: (iata: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export default function AirportSearch({
  name,
  value,
  onChange,
  placeholder = 'Search airports…',
  required,
  className,
}: AirportSearchProps) {
  const [inputText, setInputText] = useState('')
  const [suggestions, setSuggestions] = useState<Airport[]>([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!value) { setInputText(''); return }
    const match = airports.find((a) => a.iata === value)
    if (match) setInputText(displayLabel(match))
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value
    setInputText(text)
    setHighlighted(0)
    if (!text.trim()) {
      onChange('')
      setSuggestions([])
      setOpen(false)
      return
    }
    const results = search(text)
    setSuggestions(results)
    setOpen(results.length > 0)
    onChange('')
  }

  function handleSelect(airport: Airport) {
    setInputText(displayLabel(airport))
    setSuggestions([])
    setOpen(false)
    onChange(airport.iata)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions[highlighted]) handleSelect(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        name={name}
        value={inputText}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        required={required}
        className={cn(
          'w-full bg-elevated border border-border rounded-lg px-4 py-3',
          'text-foreground placeholder:text-muted-foreground text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
          'transition-colors duration-150',
          className,
        )}
      />
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-elevated border border-border rounded-lg shadow-2xl shadow-black/40 max-h-60 overflow-y-auto">
          {suggestions.map((airport, i) => (
            <li
              key={airport.iata}
              onMouseDown={() => handleSelect(airport)}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                'px-4 py-2.5 cursor-pointer text-sm flex justify-between items-center gap-3 transition-colors duration-100',
                i === highlighted
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground',
              )}
            >
              <span className="truncate">{airport.name}</span>
              <span className="font-mono font-semibold text-accent shrink-0 text-xs tracking-wider">
                {airport.iata}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
