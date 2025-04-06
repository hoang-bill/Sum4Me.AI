import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from 'npm:openai@4.28.0';
import { type QuizQuestion } from '../../../src/types/quiz';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  transcript: string;
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const { transcript, numQuestions, difficulty }: RequestBody = await req.json();

    if (!transcript) {
      throw new Error('Transcript is required');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a quiz generator that creates ${difficulty} difficulty questions based on meeting transcripts. Generate ${numQuestions} questions with explanations.`
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      functions: [
        {
          name: 'createQuestions',
          description: 'Create quiz questions based on the transcript',
          parameters: {
            type: 'object',
            properties: {
              questions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    type: { type: 'string', enum: ['multiple-choice', 'true-false'] },
                    question: { type: 'string' },
                    options: { 
                      type: 'array',
                      items: { type: 'string' }
                    },
                    correctAnswer: { type: 'string' },
                    explanation: { type: 'string' }
                  },
                  required: ['id', 'type', 'question', 'correctAnswer', 'explanation']
                }
              }
            },
            required: ['questions']
          }
        }
      ],
      function_call: { name: 'createQuestions' }
    });

    const functionCall = completion.choices[0].message.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error('Failed to generate questions');
    }

    const { questions } = JSON.parse(functionCall.arguments);

    return new Response(
      JSON.stringify({ questions }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});