import OpenAI from 'openai';

interface AnalysisResult {
  summary: string[];
  actionItems: string[];
  sentiment: {
    overall: string;
    positive: number;
    negative: number;
  };
}

function validateAnalysisResult(data: any): data is AnalysisResult {
  if (!data || typeof data !== 'object') return false;
  
  // Validate summary array
  if (!Array.isArray(data.summary) || 
      !data.summary.every(item => typeof item === 'string')) {
    return false;
  }
  
  // Validate actionItems array
  if (!Array.isArray(data.actionItems) || 
      !data.actionItems.every(item => typeof item === 'string')) {
    return false;
  }
  
  // Validate sentiment object
  if (!data.sentiment || typeof data.sentiment !== 'object') return false;
  
  if (typeof data.sentiment.overall !== 'string' ||
      typeof data.sentiment.positive !== 'number' ||
      typeof data.sentiment.negative !== 'number') {
    return false;
  }
  
  return true;
}

function transformAnalysisResult(data: any): AnalysisResult {
  // Transform summary
  const summary = Array.isArray(data.summary) 
    ? data.summary.map(String)
    : typeof data.summary === 'string' 
      ? [data.summary]
      : [];

  // Transform actionItems
  const actionItems = Array.isArray(data.actionItems)
    ? data.actionItems.map(String)
    : typeof data.actionItems === 'string'
      ? [data.actionItems]
      : [];

  // Transform sentiment
  const sentiment = {
    overall: String(data.sentiment?.overall || 'neutral'),
    positive: Number(data.sentiment?.positive || 0),
    negative: Number(data.sentiment?.negative || 0)
  };

  return {
    summary,
    actionItems,
    sentiment
  };
}

function validateEnvironmentVariables() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY environment variable is not set');
  }

  return apiKey;
}

const openai = new OpenAI({
  apiKey: validateEnvironmentVariables(),
  dangerouslyAllowBrowser: true // Note: Only for development. In production, use a backend proxy
});

export async function analyzeTranscript(text: string): Promise<AnalysisResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant that analyzes meeting transcripts. Always respond with a valid JSON object containing summary points, action items, and sentiment analysis."
        },
        {
          role: "user",
          content: `Analyze this meeting transcript and return ONLY a JSON object with this exact structure:
{
  "summary": ["point 1", "point 2", ...],
  "actionItems": ["item 1", "item 2", ...],
  "sentiment": {
    "overall": "positive/negative/neutral",
    "positive": 0.0-1.0,
    "negative": 0.0-1.0
  }
}

Transcript:
${text}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(response);
    } catch (err) {
      console.error('Failed to parse OpenAI response:', err);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // First try to validate the raw response
    if (validateAnalysisResult(parsedResponse)) {
      return parsedResponse;
    }

    // If validation fails, try to transform the data
    console.log('Raw response failed validation, attempting to transform...');
    const transformedData = transformAnalysisResult(parsedResponse);

    // Validate the transformed data
    if (!validateAnalysisResult(transformedData)) {
      throw new Error('Failed to validate or transform analysis result');
    }

    return transformedData;
  } catch (error) {
    console.error('Analysis error:', error);
    if (error instanceof Error && error.message.includes('environment variable')) {
      throw error; // Re-throw environment variable errors
    }
    // Return a valid fallback format to prevent UI crashes
    return {
      summary: ['Unable to generate summary.'],
      actionItems: ['No action items identified.'],
      sentiment: {
        overall: 'neutral',
        positive: 0,
        negative: 0
      }
    };
  }
}

export async function askQuestion(transcript: string, question: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant that answers questions about meeting transcripts. Be concise and direct in your answers."
        },
        {
          role: "user",
          content: `Based on this meeting transcript, answer the following question:

Transcript:
${transcript}

Question:
${question}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const answer = completion.choices[0]?.message?.content;
    if (!answer) {
      throw new Error('No response from OpenAI');
    }

    return answer;
  } catch (error) {
    console.error('Question error:', error);
    if (error instanceof Error && error.message.includes('environment variable')) {
      throw error;
    }
    throw new Error('Failed to get answer');
  }
}