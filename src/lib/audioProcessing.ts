import axios from 'axios';
import FormData from 'form-data';

interface TranscriptionProgress {
  stage: 'processing' | 'transcribing';
  progress: number;
}

interface TimestampedTranscript {
  text: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

const WHISPER_API_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
const WHISPER_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const SUPPORTED_FORMATS = [
  'audio/flac',
  'audio/m4a',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/mpga',
  'audio/oga',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'video/mp4',
  'video/webm'
];

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export async function transcribeAudioFile(
  audioFile: File,
  withTimestamps: boolean = false,
  onProgress?: (progress: TranscriptionProgress) => void
): Promise<TimestampedTranscript> {
  try {
    // Check file size
    if (audioFile.size > 25 * 1024 * 1024) {
      throw new Error('File size must be less than 25MB');
    }

    // Check file format
    const fileType = audioFile.type.toLowerCase();
    if (!SUPPORTED_FORMATS.includes(fileType)) {
      throw new Error(
        `Unsupported file format. Please upload one of the following formats: FLAC, M4A, MP3, MP4, MPEG, MPGA, OGA, OGG, WAV, or WEBM`
      );
    }

    onProgress?.({ stage: 'processing', progress: 0 });

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', withTimestamps ? 'verbose_json' : 'text');
    if (withTimestamps) {
      formData.append('timestamp_granularities', ['segment']);
    }

    onProgress?.({ stage: 'transcribing', progress: 50 });

    const response = await axios.post(WHISPER_API_ENDPOINT, formData, {
      headers: {
        'Authorization': `Bearer ${WHISPER_API_KEY}`,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const progress = progressEvent.total
          ? (progressEvent.loaded / progressEvent.total) * 100
          : 0;
        onProgress?.({ stage: 'processing', progress });
      },
    });

    onProgress?.({ stage: 'transcribing', progress: 100 });

    if (withTimestamps) {
      const data = response.data;
      return {
        text: data.text,
        segments: data.segments.map((segment: any) => ({
          start: segment.start,
          end: segment.end,
          text: segment.text
        }))
      };
    }

    return {
      text: response.data.trim()
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      if (error.response?.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
      } else if (error.response?.status === 400) {
        throw new Error(`Invalid request: ${errorMessage}`);
      } else if (error.response?.status === 413) {
        throw new Error('File size too large. Please upload a file smaller than 25MB.');
      }
      throw new Error(`Transcription failed: ${errorMessage}`);
    }
    throw error instanceof Error ? error : new Error('Failed to transcribe audio. Please try again.');
  }
}

export async function transcribeRecording(
  audioBlob: Blob,
  withTimestamps: boolean = false,
  onProgress?: (progress: TranscriptionProgress) => void
): Promise<TimestampedTranscript> {
  // Ensure the blob is converted to a WAV file with the correct MIME type
  const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
  return transcribeAudioFile(file, withTimestamps, onProgress);
}

export function formatTimestampedTranscript(transcript: TimestampedTranscript): string {
  if (!transcript.segments) {
    return transcript.text;
  }

  return transcript.segments
    .map(segment => `[${formatTime(segment.start)} - ${formatTime(segment.end)}] ${segment.text}`)
    .join('\n');
}