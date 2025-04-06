import { format } from 'date-fns';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface MeetingHistory {
  id: string;
  title: string;
  timestamp: string;
  summary: string[];
  actionItems: string[];
  sentiment: {
    overall: string;
    positive: number;
    negative: number;
  };
  text: string;
}

async function generateTitle(summary: string[]): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Generate a concise, descriptive title (max 6 words) for a meeting based on its summary points. The title should capture the main topic or purpose of the meeting. Do not include quotes in the title."
        },
        {
          role: "user",
          content: `Generate a title for a meeting with these summary points:\n${summary.join('\n')}`
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    });

    // Remove any quotes from the title
    return completion.choices[0]?.message?.content?.trim().replace(/['"]/g, '') || 'Meeting Summary';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'Meeting Summary';
  }
}

const STORAGE_KEY = 'meeting-histories';

export async function saveMeetingHistory(data: Omit<MeetingHistory, 'id' | 'title' | 'timestamp'>): Promise<string> {
  const timestamp = new Date().toISOString();
  const id = `meeting-${timestamp.replace(/[:.]/g, '-')}`;
  const title = await generateTitle(data.summary);

  const meetingData: MeetingHistory = {
    id,
    title,
    timestamp,
    summary: data.summary,
    actionItems: data.actionItems,
    sentiment: data.sentiment,
    text: data.text
  };

  const existingData = loadMeetingHistory();
  const updatedData = [meetingData, ...existingData];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));

  return id;
}

export function loadMeetingHistory(): MeetingHistory[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const meetings = JSON.parse(data);
    // Clean up any existing quotes in titles
    return meetings.map((meeting: MeetingHistory) => ({
      ...meeting,
      title: meeting.title.replace(/['"]/g, '')
    }));
  } catch (error) {
    console.error('Error loading meeting history:', error);
    return [];
  }
}

export function deleteMeetingHistory(id: string): void {
  const meetings = loadMeetingHistory();
  const updatedMeetings = meetings.filter(meeting => meeting.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMeetings));
}

export function loadMeetingById(id: string): MeetingHistory | null {
  const meetings = loadMeetingHistory();
  const meeting = meetings.find(meeting => meeting.id === id);
  if (meeting) {
    // Clean up any quotes in the title
    return {
      ...meeting,
      title: meeting.title.replace(/['"]/g, '')
    };
  }
  return null;
}