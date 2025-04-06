import React, { useState, useEffect } from 'react';
import { generateQuiz, type QuizQuestion, type QuizDifficulty } from '../lib/quizGenerator';
import { CheckCircle2, XCircle, RefreshCw, ChevronDown, Download, AlertTriangle } from 'lucide-react';
import { loadMeetingHistory, type MeetingHistory } from '../lib/meetingHistory';
import { QuizLoadingAnimation } from './QuizLoadingAnimation';
import { exportQuizToPDF } from '../lib/quizExport';

interface QuizViewProps {
  transcript: string | null;
}

interface QuestionState {
  selectedAnswer: string | null;
  isAnswered: boolean;
  isCorrect: boolean;
}

interface QuestionGroup {
  questions: QuizQuestion[];
}

interface QuizConfig {
  numQuestions: number;
  difficulty: QuizDifficulty;
}

export const QuizView: React.FC<QuizViewProps> = ({ transcript: initialTranscript }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionGroups, setQuestionGroups] = useState<QuestionGroup[]>([]);
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [meetings, setMeetings] = useState<MeetingHistory[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(initialTranscript);
  const [showConfig, setShowConfig] = useState(false);
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({
    numQuestions: 10,
    difficulty: 'medium'
  });

  useEffect(() => {
    setMeetings(loadMeetingHistory());
  }, []);

  useEffect(() => {
    setTranscript(initialTranscript);
    setSelectedMeetingId(null);
    setShowConfig(false);
  }, [initialTranscript]);

  const organizeQuestionsIntoGroups = (questions: QuizQuestion[]): QuestionGroup[] => {
    const groupSize = 5;
    const groups: QuestionGroup[] = [];
    
    for (let i = 0; i < questions.length; i += groupSize) {
      const groupQuestions = questions.slice(i, i + groupSize);
      groups.push({ questions: groupQuestions });
    }
    
    return groups;
  };

  const loadQuiz = async () => {
    if (!transcript?.trim()) {
      setError('Please select a meeting transcript to generate questions.');
      return;
    }

    if (transcript.trim().length < 50) {
      setError('The selected transcript is too short to generate meaningful questions. Please select a longer transcript.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setShowResults(false);
    try {
      const newQuestions = await generateQuiz(
        transcript,
        quizConfig.numQuestions,
        quizConfig.difficulty
      );
      
      if (!newQuestions || newQuestions.length === 0) {
        throw new Error('No questions could be generated. Try selecting a different difficulty level or using a longer transcript.');
      }

      setQuestions(newQuestions);
      setQuestionGroups(organizeQuestionsIntoGroups(newQuestions));
      setQuestionStates({});
      setShowConfig(false);
    } catch (err) {
      console.error('Quiz generation error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
      setQuestions([]);
      setQuestionGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMeetingSelect = (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      setSelectedMeetingId(meetingId);
      setTranscript(meeting.text);
      setShowConfig(true);
      setQuestions([]);
      setQuestionGroups([]);
      setQuestionStates({});
      setError(null);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || questionStates[questionId]?.isAnswered) return;

    const normalizedAnswer = question.type === 'true-false'
      ? answer.toLowerCase()
      : answer.toUpperCase();

    const isCorrect = normalizedAnswer === question.correctAnswer;
    
    setQuestionStates(prev => ({
      ...prev,
      [questionId]: {
        selectedAnswer: normalizedAnswer,
        isAnswered: true,
        isCorrect
      }
    }));
  };

  const allQuestionsAnswered = questions.every(q => questionStates[q.id]?.isAnswered);
  const correctAnswers = Object.values(questionStates).filter(state => state.isCorrect).length;
  const score = questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0;

  if (!transcript?.trim() && meetings.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No meeting transcript available.</p>
          <p className="text-gray-400">View a meeting summary to start a quiz.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <QuizLoadingAnimation />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-red-500 text-lg mb-4">{error}</p>
            {error.includes('API quota') ? (
              <p className="text-gray-600 mb-4">
                The API quota has been exceeded. This usually means the application has reached its usage limit. 
                Please try again later or contact support if this persists.
              </p>
            ) : null}
            <button
              onClick={() => {
                setShowConfig(true);
                setError(null);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Different Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 max-w-md">
            <h2 className="text-xl font-semibold mb-4">Select Meeting</h2>
            <div className="relative">
              <select
                value={selectedMeetingId || ''}
                onChange={(e) => handleMeetingSelect(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Current Meeting</option>
                {meetings.map((meeting) => (
                  <option key={meeting.id} value={meeting.id}>
                    {meeting.title} ({new Date(meeting.timestamp).toLocaleDateString()})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none w-5 h-5" />
            </div>
          </div>
          
          {questions.length > 0 && (
            <div className="bg-gray-50 px-4 py-2 rounded-lg">
              <div className="text-sm font-medium text-gray-600">
                Progress
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(questionStates).length}/{questions.length}
              </div>
              {allQuestionsAnswered && (
                <div className="text-sm font-medium text-gray-600">
                  Score: {score}%
                </div>
              )}
            </div>
          )}
        </div>

        {showConfig && (
          <div className="mt-8 border-t pt-8">
            <h3 className="text-lg font-semibold mb-6">Quiz Configuration</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions: {quizConfig.numQuestions}
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={quizConfig.numQuestions}
                  onChange={(e) => setQuizConfig(prev => ({
                    ...prev,
                    numQuestions: parseInt(e.target.value)
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <div className="flex gap-4">
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setQuizConfig(prev => ({ ...prev, difficulty: level }))}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                        quizConfig.difficulty === level
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400 text-gray-700'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={loadQuiz}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Generate Quiz
              </button>
            </div>
          </div>
        )}

        {error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => setShowConfig(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Different Settings
            </button>
          </div>
        ) : questionGroups.length === 0 && !showConfig ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Select a meeting to start the quiz.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {questionGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="border rounded-lg p-6">
                <div className="space-y-6">
                  {group.questions.map((question, questionIndex) => (
                    <div key={question.id} className="border-t pt-6 first:border-t-0 first:pt-0">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm font-medium text-gray-500">
                          Question {groupIndex * 5 + questionIndex + 1}
                        </span>
                        {questionStates[question.id]?.isAnswered && (
                          <span className={`text-sm font-medium ${
                            questionStates[question.id].isCorrect ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {questionStates[question.id].isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                      </div>

                      <h4 className="text-lg font-medium mb-4">{question.question}</h4>

                      <div className="space-y-3">
                        {question.type === 'multiple-choice' && question.options && Array.isArray(question.options) ? (
                          question.options.map((option, optionIndex) => {
                            const cleanOption = option && typeof option === 'string' ? option.replace(/^[A-Z]\.\s*/, '') : option || '';
                            const letterOption = String.fromCharCode(65 + optionIndex);
                            return (
                              <button
                                key={optionIndex}
                                onClick={() => handleAnswer(question.id, letterOption)}
                                disabled={questionStates[question.id]?.isAnswered}
                                className={`w-full text-left p-4 rounded-lg transition-colors ${
                                  questionStates[question.id]?.isAnswered
                                    ? letterOption === question.correctAnswer
                                      ? 'bg-green-100 text-green-700'
                                      : questionStates[question.id].selectedAnswer === letterOption
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-700'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                              >
                                {letterOption}. {cleanOption}
                              </button>
                            );
                          })
                        ) : (
                          <div className="flex gap-4">
                            <button
                              onClick={() => handleAnswer(question.id, 'true')}
                              disabled={questionStates[question.id]?.isAnswered}
                              className={`flex-1 p-4 rounded-lg transition-colors ${
                                questionStates[question.id]?.isAnswered
                                  ? question.correctAnswer === 'true'
                                    ? 'bg-green-100 text-green-700'
                                    : questionStates[question.id].selectedAnswer === 'true'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                            >
                              True
                            </button>
                            <button
                              onClick={() => handleAnswer(question.id, 'false')}
                              disabled={questionStates[question.id]?.isAnswered}
                              className={`flex-1 p-4 rounded-lg transition-colors ${
                                questionStates[question.id]?.isAnswered
                                  ? question.correctAnswer === 'false'
                                    ? 'bg-green-100 text-green-700'
                                    : questionStates[question.id].selectedAnswer === 'false'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                            >
                              False
                            </button>
                          </div>
                        )}
                      </div>

                      {questionStates[question.id]?.isAnswered && (
                        <div className="mt-4">
                          <div className={`p-4 rounded-lg ${
                            questionStates[question.id].isCorrect
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-red-50 border border-red-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              {questionStates[question.id].isCorrect ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              <span className={`font-medium ${
                                questionStates[question.id].isCorrect
                                  ? 'text-green-700'
                                  : 'text-red-700'
                              }`}>
                                {questionStates[question.id].isCorrect ? 'Correct!' : (
                                  <>
                                    Incorrect - Correct answer: {
                                      question.type === 'multiple-choice' && question.options && Array.isArray(question.options)
                                        ? `${question.correctAnswer}. ${(question.options[question.correctAnswer.charCodeAt(0) - 65] || '').replace(/^[A-Z]\.\s*/, '')}`
                                        : question.correctAnswer
                                    }
                                  </>
                                )}
                              </span>
                            </div>
                            <p className="text-gray-600">{question.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {questions.length > 0 && allQuestionsAnswered && (
              <div className="mt-8 pt-8 border-t animate-fadeIn">
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-2">Quiz Complete!</h3>
                  <p className="text-lg text-gray-600 mb-4">
                    You scored {correctAnswers} out of {questions.length} ({score}%)
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => exportQuizToPDF({
                        questions,
                        userAnswers: Object.fromEntries(
                          Object.entries(questionStates).map(([id, state]) => [id, state.selectedAnswer || ''])
                        ),
                        score: correctAnswers,
                        totalQuestions: questions.length
                      })}
                      className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Download Results
                    </button>
                    <button
                      onClick={() => {
                        setShowConfig(true);
                        setQuestions([]);
                        setQuestionGroups([]);
                        setQuestionStates({});
                      }}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Try New Questions
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};