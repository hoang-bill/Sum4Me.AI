import React, { useState, useEffect } from 'react';

export const ChatThinking: React.FC = () => {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [fadeState, setFadeState] = useState('fade-in');
  
  const thinkingPhrases = [
    "Analyzing transcript...",
    "Looking for answers...",
    "Processing your question...",
    "Reviewing meeting content..."
  ];

  useEffect(() => {
    const fadeInterval = setInterval(() => {
      setFadeState(prev => prev === 'fade-in' ? 'fade-out' : 'fade-in');
    }, 1800);
    
    const phraseInterval = setInterval(() => {
      if (fadeState === 'fade-out') {
        setCurrentPhrase(prev => (prev + 1) % thinkingPhrases.length);
      }
    }, 900);
    
    return () => {
      clearInterval(fadeInterval);
      clearInterval(phraseInterval);
    };
  }, [fadeState]);

  return (
    <div className="flex flex-col space-y-2">
      <p 
        className={`text-gray-600 transition-opacity duration-1000 ${
          fadeState === 'fade-in' ? 'opacity-100' : 'opacity-30'
        }`}
      >
        {thinkingPhrases[currentPhrase]}
      </p>
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
      </div>
    </div>
  );
};