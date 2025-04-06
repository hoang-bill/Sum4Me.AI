import React, { useState } from 'react';
import { format } from 'date-fns';
import { ArrowRight, Trash2, X } from 'lucide-react';
import { ExportButtons } from './ExportButtons';
import type { MeetingHistory } from '../lib/meetingHistory';

interface MeetingHistoryProps {
  meetings: MeetingHistory[];
  onViewMeeting: (id: string) => void;
  onDeleteMeeting: (id: string) => void;
}

interface DeleteConfirmationProps {
  meeting: MeetingHistory;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({ meeting, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
      >
        <X className="w-5 h-5" />
      </button>

      <h3 className="text-xl font-semibold mb-4">Delete Meeting</h3>
      
      <p className="text-gray-600 mb-6">
        Are you sure you want to delete {meeting.title}? This action cannot be undone.
      </p>

      <div className="flex justify-end gap-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

export const MeetingHistoryView: React.FC<MeetingHistoryProps> = ({
  meetings,
  onViewMeeting,
  onDeleteMeeting
}) => {
  const [meetingToDelete, setMeetingToDelete] = useState<MeetingHistory | null>(null);

  if (meetings.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No meeting history available.</p>
          <p className="text-gray-400">Start a new session to record or upload a meeting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <div
          key={meeting.id}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {meeting.title}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {format(new Date(meeting.timestamp), 'PPpp')}
              </p>
              <div className="space-y-2">
                {meeting.summary.map((point, index) => (
                  <p key={index} className="text-gray-600">
                    • {point}
                  </p>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              <ExportButtons meeting={meeting} size="sm" />
              <button
                onClick={() => setMeetingToDelete(meeting)}
                className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete meeting"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewMeeting(meeting.id)}
                className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title="View meeting"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {meetingToDelete && (
        <DeleteConfirmation
          meeting={meetingToDelete}
          onConfirm={() => {
            onDeleteMeeting(meetingToDelete.id);
            setMeetingToDelete(null);
          }}
          onCancel={() => setMeetingToDelete(null)}
        />
      )}
    </div>
  );
};