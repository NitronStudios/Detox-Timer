import { useState, useEffect } from 'react';
import FlipDisplay from './FlipDisplay';

export default function ClockPage({ settings }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  let h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  let ampm = '';

  if (settings.clockFormat === '12h') {
    ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
  }

  const totalSeconds = h * 3600 + m * 60 + s;
  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', position: 'relative' }}>
        <FlipDisplay seconds={totalSeconds} showHours />
        {ampm && <span className="clock-ampm" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-muted)', position: 'absolute', right: '-40px', bottom: '15px' }}>{ampm}</span>}
      </div>
      <div className="clock-date">{dateStr}</div>
    </div>
  );
}
