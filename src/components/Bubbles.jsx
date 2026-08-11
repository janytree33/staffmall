import { useEffect, useState } from 'react';
import './Bubbles.css';

export default function Bubbles() {
  const [bubbles, setBubbles] = useState([]);

  useEffect(() => {
    // 거품 15개 생성
    const newBubbles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 40 + 20, // 20px ~ 60px
      left: Math.random() * 100, // 0% ~ 100%
      animationDuration: Math.random() * 8 + 5, // 5s ~ 13s
      animationDelay: Math.random() * 5 // 0s ~ 5s
    }));
    // eslint-disable-next-line
    setBubbles(newBubbles);
  }, []);

  return (
    <div className="bubbles-container">
      {bubbles.map(b => (
        <div 
          key={b.id} 
          className="bubble"
          style={{
            width: `${b.size}px`,
            height: `${b.size}px`,
            left: `${b.left}%`,
            animationDuration: `${b.animationDuration}s`,
            animationDelay: `${b.animationDelay}s`
          }}
        />
      ))}
    </div>
  );
}
