import React, { useState, useEffect } from 'react';
import { Brain, Search, FileText, CheckCircle } from 'lucide-react';

const loadingPhrases = [
  { text: "Analyzing transcript content...", icon: FileText },
  { text: "Identifying key concepts...", icon: Brain },
  { text: "Finding important details...", icon: Search },
  { text: "Generating questions...", icon: Brain },
  { text: "Validating answers...", icon: CheckCircle },
];

export const QuizLoadingAnimation: React.FC = () => {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const phraseInterval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentPhrase((prev) => (prev + 1) % loadingPhrases.length);
        setIsVisible(true);
      }, 500); // Wait for fade out before changing phrase
    }, 2500); // Total time for each phrase

    return () => clearInterval(phraseInterval);
  }, []);

  const Icon = loadingPhrases[currentPhrase].icon;

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="relative">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-spin" style={{ animationDuration: '3s' }} />
        
        {/* Middle pulsing ring */}
        <div className="absolute inset-2 rounded-full border-4 border-blue-300 animate-pulse" />
        
        {/* Inner icon */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <Icon className={`w-8 h-8 text-blue-500 transition-all duration-500 transform ${
            isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
          }`} />
        </div>
      </div>

      <div className="h-8 flex items-center justify-center">
        <p className={`text-lg text-gray-700 font-medium text-center transition-all duration-500 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}>
          {loadingPhrases[currentPhrase].text}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex space-x-2">
        {loadingPhrases.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentPhrase ? 'bg-blue-500 scale-125' : 'bg-blue-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
};