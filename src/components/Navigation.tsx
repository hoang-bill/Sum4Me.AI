import React, { useState } from 'react';
import { Home, Plus, History, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface NavigationProps {
  onNewSession: () => void;
  activeTab: 'new' | 'summary' | 'history' | 'quiz';
  onTabChange: (tab: 'new' | 'summary' | 'history' | 'quiz') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ onNewSession, activeTab, onTabChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNewSession = () => {
    onNewSession();
    onTabChange('new');
  };

  return (
    <div 
      className={`bg-white h-screen shadow-lg transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <div className={`transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-48 opacity-100'}`}>
          <img
            src="/images/logo.png"
            alt="Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>
      
      <nav className="flex-1 pt-4 space-y-1">
        <button
          onClick={handleNewSession}
          className={`w-full flex items-center px-4 py-3 transition-colors ${
            activeTab === 'new' 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Plus className="w-5 h-5" />
          {!isCollapsed && <span className="ml-3">New Session</span>}
        </button>

        <button
          onClick={() => onTabChange('summary')}
          className={`w-full flex items-center px-4 py-3 transition-colors ${
            activeTab === 'summary' 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Home className="w-5 h-5" />
          {!isCollapsed && <span className="ml-3">Meeting Summary</span>}
        </button>

        <button
          onClick={() => onTabChange('quiz')}
          className={`w-full flex items-center px-4 py-3 transition-colors ${
            activeTab === 'quiz' 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          {!isCollapsed && <span className="ml-3">Quiz</span>}
        </button>

        <button
          onClick={() => onTabChange('history')}
          className={`w-full flex items-center px-4 py-3 transition-colors ${
            activeTab === 'history' 
              ? 'bg-blue-50 text-blue-600' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <History className="w-5 h-5" />
          {!isCollapsed && <span className="ml-3">Meeting History</span>}
        </button>
      </nav>
    </div>
  );
};