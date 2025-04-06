import React, { useEffect, useRef, useState } from 'react';

interface SentimentGaugeProps {
  positiveValue: number;
  overallTone: string;
}

const easeInOutCubic = (t: number): number => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const SentimentGauge: React.FC<SentimentGaugeProps> = ({ positiveValue, overallTone }) => {
  const [currentAngle, setCurrentAngle] = useState(180);
  const [currentPercentage, setCurrentPercentage] = useState(0);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const startAngleRef = useRef(180);
  const targetAngleRef = useRef(180);
  const startPercentageRef = useRef(0);
  const targetPercentageRef = useRef(0);

  const centerX = 100;
  const centerY = 90;
  const needleLength = 70;
  
  const targetPercentValue = Math.round(positiveValue * 100);

  useEffect(() => {
    // Convert positive value (0-1) to angle (180-0 degrees)
    const targetAngle = 180 - (positiveValue * 180);
    startAngleRef.current = currentAngle;
    targetAngleRef.current = targetAngle;
    startPercentageRef.current = currentPercentage;
    targetPercentageRef.current = targetPercentValue;
    startTimeRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const duration = 1500; // Animation duration in ms
      
      // Calculate progress (0 to 1)
      let progress = Math.min(elapsed / duration, 1);
      
      // Apply easing function
      progress = easeInOutCubic(progress);
      
      // Calculate current angle and percentage
      const newAngle = startAngleRef.current + (targetAngleRef.current - startAngleRef.current) * progress;
      const newPercentage = Math.round(
        startPercentageRef.current + (targetPercentageRef.current - startPercentageRef.current) * progress
      );
      
      setCurrentAngle(newAngle);
      setCurrentPercentage(newPercentage);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [positiveValue, targetPercentValue]);

  // Calculate needle endpoint using current animated angle
  const radians = (currentAngle * Math.PI) / 180;
  const endX = centerX + needleLength * Math.cos(radians);
  const endY = centerY - needleLength * Math.sin(radians);

  return (
    <div className="flex flex-col items-center w-full">
      <svg viewBox="-50 -20 300 150" className="w-full">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2" />
          </filter>
        </defs>
        
        {/* Background arc */}
        <path 
          d="M 10 90 A 90 90 0 0 1 190 90" 
          fill="none" 
          stroke="#e0e0e0" 
          strokeWidth="10" 
          strokeLinecap="round"
        />
        
        {/* Colored arc */}
        <path 
          d="M 10 90 A 90 90 0 0 1 190 90" 
          fill="none" 
          stroke="url(#gaugeGradient)" 
          strokeWidth="10" 
          strokeLinecap="round"
          filter="url(#dropShadow)"
          style={{ transform: 'translateZ(0)' }} // Force GPU acceleration
        />
        
        {/* Needle base outer circle */}
        <circle 
          cx={centerX} 
          cy={centerY} 
          r="8" 
          fill="#374151" 
          filter="url(#dropShadow)" 
        />
        
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={endX}
          y2={endY}
          stroke="#374151"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#dropShadow)"
        />
        
        {/* Needle base inner circle */}
        <circle 
          cx={centerX} 
          cy={centerY} 
          r="4" 
          fill="#1f2937" 
        />
        
        {/* End points */}
        <circle cx="10" cy="90" r="4" fill="#ef4444" />
        <circle cx="190" cy="90" r="4" fill="#22c55e" />
        
        {/* Labels */}
        <text x="10" y="110" fontSize="14" fontWeight="500" textAnchor="middle" fill="#4b5563">
          Negative
        </text>
        <text x="190" y="110" fontSize="14" fontWeight="500" textAnchor="middle" fill="#4b5563">
          Positive
        </text>
      </svg>
      
      <div className="-mt-4 text-center space-y-0.5">
        <span className={`text-2xl font-bold ${
          overallTone === 'positive' 
            ? 'text-green-600' 
            : overallTone === 'negative' 
              ? 'text-red-600' 
              : 'text-gray-800'
        }`}>
          {currentPercentage}%
        </span>
        <p className="text-[10px] text-gray-400 font-medium">
          Sentiment Analysis with Deep Learning using BERT
        </p>
      </div>
    </div>
  );
};