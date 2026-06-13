import { useRef, useEffect } from 'react';

export default function FlipCard({ digit }) {
  // Track the previous digit to handle the flip transition accurately
  const prevDigitRef = useRef(digit);
  const prevDigit = prevDigitRef.current;

  // Update the reference AFTER the render so the flaps can animate the change
  useEffect(() => {
    prevDigitRef.current = digit;
  }, [digit]);

  const isAnimating = digit !== prevDigit;

  return (
    <div className="flip-card">
      <div className="flip-card-inner">
        {/* STATIC TOP: Shows the NEW digit waiting behind the flap */}
        <div className="fc-top">
          <span className="fc-digit">{digit}</span>
        </div>

        {/* STATIC BOTTOM: Shows the OLD digit until the bottom flap lands */}
        <div className="fc-bottom">
          <span className="fc-digit">{prevDigit}</span>
        </div>

        {/* ANIMATING FLAPS: The key prop forces a re-mount, re-triggering CSS animations on change */}
        <div className={`fc-flap-top${isAnimating ? ' animating' : ''}`} key={`top-${digit}`}>
          <span className="fc-digit">{prevDigit}</span>
        </div>

        <div className={`fc-flap-bottom${isAnimating ? ' animating' : ''}`} key={`bottom-${digit}`}>
          <span className="fc-digit">{digit}</span>
        </div>

        <div className="fc-split" />
        <div className="fc-shadow-top" />
      </div>
    </div>
  );
}
