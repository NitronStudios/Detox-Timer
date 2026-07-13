import React, { useState, useEffect, useRef } from 'react';

export default function AutocompleteInput({ value, onChange, uniqueSubjects, placeholder, className, style, maxLength }) {
  const [isMobile, setIsMobile] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const inputId = useRef(`autocomplete-${Math.random().toString(36).substr(2, 9)}`);
  const matchRef = useRef('');

  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!isMobile && value) {
      const match = uniqueSubjects.find(s => s.toLowerCase().startsWith(value.toLowerCase()));
      if (match && match.length > value.length) {
        setSuggestion(value + match.substring(value.length));
        matchRef.current = match; 
      } else {
        setSuggestion('');
        matchRef.current = '';
      }
    } else {
      setSuggestion('');
      matchRef.current = '';
    }
  }, [value, uniqueSubjects, isMobile]);

  const handleKeyDown = (e) => {
    if (!isMobile && e.key === 'Tab' && suggestion) {
      e.preventDefault();
      onChange(matchRef.current || suggestion);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      {!isMobile && suggestion && (
        <input 
          type="text"
          className={className}
          value={suggestion}
          readOnly
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            color: 'var(--text-muted)',
            opacity: 0.4,
            pointerEvents: 'none',
            width: '100%',
            background: 'transparent',
            borderColor: 'transparent',
            zIndex: 0
          }}
        />
      )}
      <input
        className={className}
        type="text"
        list={isMobile ? inputId.current : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        style={{ width: '100%', position: 'relative', background: 'transparent', zIndex: 1 }}
      />
      {isMobile && (
        <datalist id={inputId.current}>
          {uniqueSubjects.map(s => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
