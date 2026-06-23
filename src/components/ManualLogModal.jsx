import { useState, useEffect } from 'react';
import { syncToCloud } from '../utils/helpers';


export default function ManualLogModal({ onClose }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [subject, setSubject] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Detect device to toggle native dropdown
  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone/i.test(navigator.userAgent));
  }, []);

  // Extract unique subjects for autocomplete
  const existingSessions = JSON.parse(localStorage.getItem('focus_sessions') || '[]');
  const uniqueSubjects = [...new Set(existingSessions.map(s => s.subject).filter(Boolean))];

  const handleSubjectChange = (e) => {
    const val = e.target.value;
    setSubject(val);
    if (val) {
      const match = uniqueSubjects.find(s => s.toLowerCase().startsWith(val.toLowerCase()));
      setSuggestion(match || '');
    } else {
      setSuggestion('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      setSubject(subject + suggestion.slice(subject.length));
      setSuggestion('');
    }
  };

  const handleSave = () => {
    if (!date || !startTime || !endTime || !subject.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const startMins = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMins = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    
    const newSessions = [];
    const baseDateObj = new Date(date);

    if (endMins <= startMins) {
      const minsDay1 = 1440 - startMins; 
      const minsDay2 = endMins;          

      if (minsDay1 > 0) {
        newSessions.push({ id: Date.now(), date: date, subject: subject.trim(), durationMinutes: minsDay1 });
      }
      if (minsDay2 > 0) {
        const nextDateObj = new Date(baseDateObj);
        nextDateObj.setDate(nextDateObj.getDate() + 1);
        const nextDateStr = nextDateObj.toISOString().split('T')[0];
        newSessions.push({ id: Date.now() + 1, date: nextDateStr, subject: subject.trim(), durationMinutes: minsDay2 });
      }
    } else {
      newSessions.push({ id: Date.now(), date: date, subject: subject.trim(), durationMinutes: endMins - startMins });
    }

    // FRESH READ: Get latest storage right before saving to avoid overwriting
    const freshSessions = JSON.parse(localStorage.getItem('focus_sessions') || '[]');
    const merged = [...freshSessions, ...newSessions];
    localStorage.setItem('focus_sessions', JSON.stringify(merged));
    
    // EXPLICIT SYNC: Call the imported function directly
    try {
      syncToCloud();
    } catch (error) {
      console.error("Cloud sync failed, but saved locally:", error);
    }
    
    alert(`Successfully logged ${newSessions.length} session(s)!`);
    
    // CLOSE MODAL: Do NOT reload the window
    onClose(); 
  };

  return (
    <div style={{
      position: 'absolute', /* FIX: Conforms natively to the shrunken .app wrapper */
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '10px'
    }}>
      <div className="modal-content" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2rem', width: '95%', maxWidth: '400px', maxHeight: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>✏️ Manual Log</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>
        
        {error && <div style={{ color: '#ff4444', fontSize: '0.9rem' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date (Start)</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Start Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>End Time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Subject</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            {/* Ghost Input (Background) */}
            <input
              type="text"
              disabled
              value={suggestion && subject && suggestion.toLowerCase().startsWith(subject.toLowerCase()) ? subject + suggestion.slice(subject.length) : ''}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text)', opacity: 0.4, zIndex: 1, pointerEvents: 'none', font: 'inherit' }}
            />
            {/* Real Input (Foreground) - Uses datalist only on Mobile */}
            <input
              list={isMobile ? "subject-list" : undefined}
              value={subject}
              onChange={handleSubjectChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Deep Work, Art, Meditation"
              style={{ width: '100%', position: 'relative', padding: '0.8rem', borderRadius: '8px', border: '1px solid transparent', background: 'transparent', color: 'var(--text)', zIndex: 2, outline: 'none', font: 'inherit' }}
              onFocus={(e) => e.target.parentElement.style.borderColor = 'var(--accent)'}
              onBlur={(e) => { e.target.parentElement.style.borderColor = 'var(--border)'; setSuggestion(''); }}
            />
          </div>
          <datalist id="subject-list">
            {uniqueSubjects.map((sub, i) => <option key={i} value={sub} />)}
          </datalist>
        </div>

        <button onClick={handleSave} style={{ marginTop: '1rem', padding: '1rem', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Save Session</button>
      </div>
    </div>
  );
}
