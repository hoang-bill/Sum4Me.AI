import React, { useState } from 'react';
import { Mail, Download, X } from 'lucide-react';
import { exportMeetingToPDF } from '../lib/meetingExport';
import type { MeetingHistory } from '../lib/meetingHistory';

interface ExportButtonsProps {
  meeting: MeetingHistory;
  size?: 'sm' | 'md';
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({ meeting, size = 'md' }) => {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = () => {
    try {
      exportMeetingToPDF(meeting);
    } catch (err) {
      setError('Failed to download file');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSending(true);
    setError(null);

    try {
      await emailMarkdown(meeting, email);
      setShowEmailDialog(false);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const buttonClasses = size === 'sm'
    ? 'p-1.5 text-gray-500 hover:text-gray-700'
    : 'p-2 text-gray-600 hover:text-gray-800';

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowEmailDialog(true)}
          className={`${buttonClasses} hover:bg-gray-100 rounded-lg transition-colors`}
          title="Email summary"
        >
          <Mail className={iconSize} />
        </button>
        <button
          onClick={handleDownload}
          className={`${buttonClasses} hover:bg-gray-100 rounded-lg transition-colors`}
          title="Download summary"
        >
          <Download className={iconSize} />
        </button>
      </div>

      {showEmailDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
            <button
              onClick={() => setShowEmailDialog(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-semibold mb-4">Email Meeting Summary</h3>
            
            <form onSubmit={handleEmailSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSending || !email}
                className={`w-full py-2 px-4 rounded-lg text-white ${
                  isSending || !email
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isSending ? 'Sending...' : 'Send Summary'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};