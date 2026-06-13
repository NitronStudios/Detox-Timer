import FlipCard from './FlipCard';

export default function FlipDisplay({ seconds, showHours = false }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const hStr = String(h).padStart(2, '0');
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');

  return (
    <div className="flip-group">
      {showHours && <>
        <FlipCard digit={hStr[0]} />
        <FlipCard digit={hStr[1]} />
        <span className="flip-separator">:</span>
      </>}
      <FlipCard digit={mStr[0]} />
      <FlipCard digit={mStr[1]} />
      <span className="flip-separator">:</span>
      <FlipCard digit={sStr[0]} />
      <FlipCard digit={sStr[1]} />
    </div>
  );
}
