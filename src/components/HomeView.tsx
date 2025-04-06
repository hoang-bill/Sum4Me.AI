import React, { useState } from 'react';
import { Clock, List, Activity, FileText, Brain, Send, ChevronDown, AlertCircle } from 'lucide-react';
import { SentimentGauge } from './SentimentGauge';
import { ChatThinking } from './ChatThinking';
import { ExportButtons } from './ExportButtons';
import { loadMeetingHistory, type MeetingHistory } from '../lib/meetingHistory';
import { formatTimestampedTranscript } from '../lib/audioProcessing';

interface MeetingSummaryProps {
  transcriptData: any;
  chatMessages: any[];
  chatContainerRef: React.RefObject<HTMLDivElement>;
  currentQuestion: string;
  isAsking: boolean;
  onQuestionChange: (value: string) => void;
  onQuestionSubmit: (e: React.FormEvent) => void;
  onMeetingSelect: (id: string) => void;
  selectedMeetingId: string | null;
}

const getToneFromPercentage = (percentage: number): string => {
  if (percentage < 0.5) return 'negative';
  if (percentage === 0.5) return 'neutral';
  return 'positive';
};

export const MeetingSummary: React.FC<MeetingSummaryProps> = ({
  transcriptData,
  chatMessages,
  chatContainerRef,
  currentQuestion,
  isAsking,
  onQuestionChange,
  onQuestionSubmit,
  onMeetingSelect,
  selectedMeetingId
}) => {
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [meetings] = useState(() => loadMeetingHistory());

  const renderMeetingDropdown = () => (
    <div className="flex-1 max-w-xs relative">
      <select
        value={selectedMeetingId || ''}
        onChange={(e) => onMeetingSelect(e.target.value)}
        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select a meeting</option>
        {meetings.map((meeting) => (
          <option key={meeting.id} value={meeting.id}>
            {meeting.title} ({new Date(meeting.timestamp).toLocaleDateString()})
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-5 h-5" />
    </div>
  );

  if (!transcriptData && meetings.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No meeting data available.</p>
          <p className="text-gray-400">Start a new session to record or upload a meeting.</p>
        </div>
      </div>
    );
  }

  if (!transcriptData && meetings.length > 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col space-y-4">
          {renderMeetingDropdown()}
          <p className="text-gray-500 text-center">Select a meeting to see summary</p>
        </div>
      </div>
    );
  }

  const hasTimestamps = transcriptData.segments && transcriptData.segments.length > 0;

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center mb-6">
        {meetings.length > 0 && renderMeetingDropdown()}
        <div className="flex items-center gap-4">
          <ExportButtons meeting={transcriptData} />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Clock className="w-6 h-6 text-green-500 mr-2" />
            <h2 className="text-xl font-semibold">Summary</h2>
          </div>
          <div className="h-48 overflow-y-auto">
            <ul className="list-disc list-inside text-gray-600">
              {transcriptData?.summary.map((point: string, index: number) => (
                <li key={index} className="mb-2">{point}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <List className="w-6 h-6 text-purple-500 mr-2" />
            <h2 className="text-xl font-semibold">Action Items</h2>
          </div>
          <div className="h-48 overflow-y-auto">
            <ul className="list-disc list-inside text-gray-600">
              {transcriptData?.actionItems.map((item: string, index: number) => (
                <li key={index} className="mb-2">{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-span-1 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Activity className="w-6 h-6 text-red-500 mr-2" />
            <h2 className="text-xl font-semibold">Sentiment</h2>
          </div>
          <div className="h-48 overflow-y-auto">
            <p className="text-left mb-2">
              <strong>Overall Tone: </strong>
              <span className={`font-bold ${
                getToneFromPercentage(transcriptData?.sentiment.positive || 0.5) === 'positive' 
                  ? 'text-green-600' 
                  : getToneFromPercentage(transcriptData?.sentiment.positive || 0.5) === 'negative'
                    ? 'text-red-600'
                    : 'text-gray-600'
              }`}>
                {getToneFromPercentage(transcriptData?.sentiment.positive || 0.5).toUpperCase()}
              </span>
            </p>
            
            <SentimentGauge 
              positiveValue={transcriptData?.sentiment.positive || 0.5} 
              overallTone={getToneFromPercentage(transcriptData?.sentiment.positive || 0.5)} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FileText className="w-6 h-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold">Transcript</h2>
            </div>
            <label className="flex items-center">
              <div className="relative inline-block w-12 h-6 mr-2">
                <input
                  type="checkbox"
                  checked={showTimestamps}
                  onChange={(e) => setShowTimestamps(e.target.checked)}
                  className="sr-only"
                />
                <div className={`absolute inset-0 rounded-full transition-colors ${
                  showTimestamps ? 'bg-blue-500' : 'bg-gray-200'
                }`} />
                <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  showTimestamps ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </div>
              <span className="text-sm text-gray-600">Show Timestamps</span>
            </label>
          </div>
          <div className="h-48 overflow-y-auto text-gray-600 whitespace-pre-wrap">
            {showTimestamps && !hasTimestamps && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-lg mb-3">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">
                  No timestamps found. Enable "Transcribe with timestamps" in your next recording or upload session.
                </p>
              </div>
            )}
            {showTimestamps && hasTimestamps
              ? formatTimestampedTranscript(transcriptData)
              : transcriptData.text}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Brain className="w-6 h-6 text-indigo-500 mr-2" />
            <h2 className="text-xl font-semibold">Ask Questions</h2>
          </div>
          
          <div 
            ref={chatContainerRef}
            className={`overflow-y-auto mb-4 space-y-4 scroll-smooth transition-all duration-300 ${
              chatMessages.length === 0 ? 'h-0 opacity-0' : 'h-auto opacity-100'
            }`}
            style={{
              maxHeight: chatMessages.length > 0 
                ? `${Math.min(72 * (chatMessages.length + 1), 72 * 6)}px`
                : '0px',
              minHeight: chatMessages.length > 0 ? '144px' : '0px'
            }}
          >
            {chatMessages.map((msg, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-start">
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                    <p className="font-medium text-gray-900">{msg.question}</p>
                  </div>
                </div>
                <div className="flex items-start justify-end">
                  <div className="bg-blue-50 rounded-lg p-3 max-w-[80%]">
                    {msg.status === 'thinking' ? (
                      <ChatThinking />
                    ) : (
                      <p className="text-gray-800 animate-fadeIn">{msg.answer}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={onQuestionSubmit} className="flex gap-2">
            <input
              type="text"
              value={currentQuestion}
              onChange={(e) => onQuestionChange(e.target.value)}
              placeholder="Ask a question about the transcript..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isAsking}
            />
            <button
              type="submit"
              disabled={isAsking || !currentQuestion.trim()}
              className={`px-4 py-2 rounded-lg text-white ${
                isAsking || !currentQuestion.trim()
                  ? 'bg-gray-400'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};