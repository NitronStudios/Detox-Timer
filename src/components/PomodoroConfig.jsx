export default function PomodoroConfig({ studyMin, breakMin, onStudy, onBreak, disabled }) {
  return (
    <div className="pomo-config">
      <div className="pomo-field">
        <span className="pomo-label">Study (min)</span>
        <div className="pomo-stepper">
          <button onClick={() => onStudy(s => Math.max(1, s - 1))} disabled={disabled || studyMin <= 1}>−</button>
          <span className="pomo-value">{studyMin}</span>
          <button onClick={() => onStudy(s => Math.min(90, s + 1))} disabled={disabled || studyMin >= 90}>+</button>
        </div>
      </div>
      <div className="pomo-field">
        <span className="pomo-label">Break (min)</span>
        <div className="pomo-stepper">
          <button onClick={() => onBreak(b => Math.max(1, b - 1))} disabled={disabled || breakMin <= 1}>−</button>
          <span className="pomo-value">{breakMin}</span>
          <button onClick={() => onBreak(b => Math.min(30, b + 1))} disabled={disabled || breakMin >= 30}>+</button>
        </div>
      </div>
    </div>
  );
}
