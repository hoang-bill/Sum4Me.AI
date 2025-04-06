import React, { useState, useEffect, useRef } from 'react';
import { Upload, Mic, StopCircle, ArrowLeft } from 'lucide-react';
import { analyzeTranscript, askQuestion } from './lib/openai';
import { transcribeAudioFile, transcribeRecording } from './lib/audioProcessing';
import { AudioRecorder } from './lib/audioRecording';
import { Navigation } from './components/Navigation';
import { MeetingSummary } from './components/HomeView';
import { MeetingHistoryView } from './components/MeetingHistory';
import { QuizView } from './components/QuizView';
import { saveMeetingHistory, loadMeetingHistory, deleteMeetingHistory, loadMeetingById, type MeetingHistory } from './lib/meetingHistory';

interface TranscriptData extends MeetingHistory {
  text: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  summary: string[];
  actionItems: string[];
  sentiment: {
    overall: string;
    positive: number;
    negative: number;
  };
}

interface ChatMessage {
  question: string;
  answer: string;
  status: 'thinking' | 'complete';
}

type Mode = 'select' | 'record' | 'upload' | 'results';
type Tab = 'new' | 'summary' | 'history' | 'quiz';

interface LoadingIndicatorProps {
  isLoading: boolean;
  progress: number;
  mode?: 'processing' | 'question';
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ isLoading, progress = 0, mode = 'processing' }) => {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  
  const processingPhrases = [
    "Initializing audio processing...",
    "Analyzing audio content...",
    "Transcribing speech to text...",
    "Processing transcript...",
    "Generating summary...",
    "Identifying action items...",
    "Analyzing sentiment...",
    "Finalizing results..."
  ];

  const questionPhrases = [
    "Analyzing transcript...",
    "Looking for answers...",
    "Processing your question...",
    "Reviewing meeting content..."
  ];

  const loadingPhrases = mode === 'processing' ? processingPhrases : questionPhrases;

  useEffect(() => {
    if (!isLoading || mode !== 'processing') return;
    
    const phraseIndex = Math.min(
      Math.floor((progress / 100) * loadingPhrases.length),
      loadingPhrases.length - 1
    );
    
    setCurrentPhrase(phraseIndex);
  }, [isLoading, progress, mode, loadingPhrases.length]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex flex-col items-center">
          <div className="mb-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-3 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <div className="h-16 flex items-center justify-center">
            <p className="text-xl text-center font-medium text-gray-700">
              {loadingPhrases[currentPhrase]}
            </p>
          </div>
          
          {mode === 'processing' && (
            <>
              <div className="w-full mt-4 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [mode, setMode] = useState<Mode>('select');
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recorder] = useState(new AudioRecorder());
  const [includeSystemAudio, setIncludeSystemAudio] = useState(false);
  const [withTimestamps, setWithTimestamps] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [meetings, setMeetings] = useState<MeetingHistory[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  useEffect(() => {
    setMeetings(loadMeetingHistory());
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      handleProcessFile(uploadedFile);
    }
  };

  const handleProcessFile = async (uploadedFile: File) => {
    setIsProcessing(true);
    setError(null);
    setTranscriptionProgress(0);
    
    try {
      const transcriptResult = await transcribeAudioFile(uploadedFile, withTimestamps, (progress) => {
        setTranscriptionProgress(progress.progress);
      });
      
      if (!transcriptResult?.text) {
        throw new Error('No speech was detected in the audio file');
      }
      
      const analysis = await analyzeTranscript(transcriptResult.text);
      
      // Validate the analysis result has all required properties
      if (!analysis || 
          !Array.isArray(analysis.summary) || 
          !Array.isArray(analysis.actionItems) || 
          !analysis.sentiment || 
          typeof analysis.sentiment.overall !== 'string' || 
          typeof analysis.sentiment.positive !== 'number' || 
          typeof analysis.sentiment.negative !== 'number') {
        throw new Error('Invalid analysis result format');
      }

      const data: TranscriptData = {
        text: transcriptResult.text,
        segments: transcriptResult.segments,
        summary: analysis.summary,
        actionItems: analysis.actionItems,
        sentiment: analysis.sentiment
      };

      const meetingId = await saveMeetingHistory(data);
      setMeetings(loadMeetingHistory());
      setSelectedMeetingId(meetingId);
      setTranscriptData(data);
      setMode('results');
      setActiveTab('summary');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process audio file';
      setError(`Analysis failed: ${errorMessage}`);
      console.error('Analysis error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      await recorder.startRecording(includeSystemAudio);
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      console.error(err);
    }
  };

  const stopRecording = async () => {
    try {
      const audioBlob = await recorder.stopRecording();
      setIsRecording(false);
      setIsProcessing(true);
      setTranscriptionProgress(0);
      
      const transcriptResult = await transcribeRecording(audioBlob, withTimestamps, (progress) => {
        setTranscriptionProgress(progress.progress);
      });
      
      if (!transcriptResult?.text) {
        throw new Error('No speech was detected in the recording');
      }
      
      const analysis = await analyzeTranscript(transcriptResult.text);
      
      // Validate the analysis result has all required properties
      if (!analysis || 
          !Array.isArray(analysis.summary) || 
          !Array.isArray(analysis.actionItems) || 
          !analysis.sentiment || 
          typeof analysis.sentiment.overall !== 'string' || 
          typeof analysis.sentiment.positive !== 'number' || 
          typeof analysis.sentiment.negative !== 'number') {
        throw new Error('Invalid analysis result format');
      }

      const data: TranscriptData = {
        text: transcriptResult.text,
        segments: transcriptResult.segments,
        summary: analysis.summary,
        actionItems: analysis.actionItems,
        sentiment: analysis.sentiment
      };

      const meetingId = await saveMeetingHistory(data);
      setMeetings(loadMeetingHistory());
      setSelectedMeetingId(meetingId);
      setTranscriptData(data);
      setMode('results');
      setActiveTab('summary');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process recording';
      setError(`Analysis failed: ${errorMessage}`);
      console.error('Analysis error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim() || !transcriptData?.text || isAsking) return;

    const newMessage: ChatMessage = {
      question: currentQuestion,
      answer: '',
      status: 'thinking'
    };

    setChatMessages(prev => [...prev, newMessage]);
    setCurrentQuestion('');
    setIsAsking(true);

    try {
      const instructionForConciseness = "Please provide the most concise answer possible. Use phrases instead of sentences. Omit unnecessary words and explanations. Be direct and to the point.";
      const questionWithInstruction = `${instructionForConciseness} Question: ${currentQuestion}`;
      
      let answer = await askQuestion(transcriptData.text, questionWithInstruction);
      
      answer = answer
        .replace(/^(I |The |It |This |That |These |Those |We |They )/g, '')
        .replace(/\. /g, '. ')
        .trim();

      setChatMessages(prev => 
        prev.map((msg, idx) => 
          idx === prev.length - 1 
            ? { ...msg, answer, status: 'complete' }
            : msg
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
      setChatMessages(prev => prev.slice(0, -1));
    } finally {
      setIsAsking(false);
    }
  };

  const handleNewSession = () => {
    setMode('select');
    setTranscriptData(null);
    setChatMessages([]);
    setWithTimestamps(false);
    setSelectedMeetingId(null);
  };

  const handleViewMeeting = (id: string) => {
    const meeting = loadMeetingById(id);
    if (meeting) {
      setTranscriptData(meeting as TranscriptData);
      setSelectedMeetingId(id);
      setActiveTab('summary');
    }
  };

  const handleDeleteMeeting = (id: string) => {
    if (id === selectedMeetingId) {
      setSelectedMeetingId(null);
      setTranscriptData(null);
    }
    deleteMeetingHistory(id);
    setMeetings(loadMeetingHistory());
  };

  const renderSelectMode = () => (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => setMode('record')}
          className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex flex-col items-center">
            <Mic className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Record Meeting</h3>
            <p className="text-gray-600 text-center">
              Record a live meeting with your microphone
            </p>
          </div>
        </button>

        <button
          onClick={() => setMode('upload')}
          className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Upload Recording</h3>
            <p className="text-gray-600 text-center">
              Upload an existing audio recording
            </p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderRecordMode = () => (
    <div className="max-w-xl mx-auto">
      <button
        onClick={() => setMode('select')}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Selection
      </button>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center space-x-4 mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeSystemAudio}
              onChange={(e) => setIncludeSystemAudio(e.target.checked)}
              className="mr-2"
            />
            Include system audio
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={withTimestamps}
              onChange={(e) => setWithTimestamps(e.target.checked)}
              className="mr-2"
            />
            Transcribe with timestamps
          </label>
        </div>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-full flex items-center justify-center px-4 py-2 rounded-lg text-white ${
            isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isRecording ? (
            <>
              <StopCircle className="w-5 h-5 mr-2" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 mr-2" />
              Start Recording
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderUploadMode = () => (
    <div className="max-w-xl mx-auto">
      <button
        onClick={() => setMode('select')}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Selection
      </button>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={withTimestamps}
              onChange={(e) => setWithTimestamps(e.target.checked)}
              className="mr-2"
            />
            Transcribe with timestamps
          </label>
        </div>
        <p className="text-sm text-gray-600 mb-4">Maximum file size: 25MB</p>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-gray-500" />
            <p className="text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">MP3, WAV, or MP4 files</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".mp3,.wav,.mp4"
            onChange={handleFileUpload}
          />
        </label>
      </div>
    </div>
  );

  const renderMainContent = () => {
    if (activeTab === 'history') {
      return (
        <MeetingHistoryView
          meetings={meetings}
          onViewMeeting={handleViewMeeting}
          onDeleteMeeting={handleDeleteMeeting}
        />
      );
    }

    if (activeTab === 'quiz') {
      return (
        <QuizView transcript={transcriptData?.text || null} />
      );
    }

    if (activeTab === 'summary') {
      return (
        <MeetingSummary
          transcriptData={transcriptData}
          chatMessages={chatMessages}
          chatContainerRef={chatContainerRef}
          currentQuestion={currentQuestion}
          isAsking={isAsking}
          onQuestionChange={(value) => setCurrentQuestion(value)}
          onQuestionSubmit={handleQuestionSubmit}
          onMeetingSelect={(id) => handleViewMeeting(id)}
          selectedMeetingId={selectedMeetingId}
        />
      );
    }

    switch (mode) {
      case 'record':
        return renderRecordMode();
      case 'upload':
        return renderUploadMode();
      default:
        return renderSelectMode();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <LoadingIndicator 
        isLoading={isProcessing} 
        progress={transcriptionProgress} 
        mode="processing"
      />
      
      <div className="h-screen flex">
        <Navigation 
          onNewSession={handleNewSession}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="max-w-xl mx-auto mt-8 mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {!isProcessing && (
            <div className="max-w-7xl mx-auto">
              <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">
                  {mode === 'record' ? 'Record Meeting' :
                   mode === 'upload' ? 'Upload Recording' :
                   activeTab === 'new' ? 'Start New Session' :
                   activeTab === 'history' ? 'Meeting History' :
                   activeTab === 'quiz' ? 'Meeting Quiz' : 'Meeting Summary'}
                </h1>
              </header>
              
              {renderMainContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;