import OpenAI from 'openai';

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

function validateQuizQuestion(question: any): question is QuizQuestion {
  if (!question || typeof question !== 'object') return false;

  // Validate basic properties
  if (typeof question.id !== 'string' ||
      !['multiple-choice', 'true-false'].includes(question.type) ||
      typeof question.question !== 'string' ||
      typeof question.correctAnswer !== 'string' ||
      typeof question.explanation !== 'string') {
    return false;
  }

  // Validate multiple-choice specific properties
  if (question.type === 'multiple-choice') {
    if (!Array.isArray(question.options) || 
        question.options.length !== 4 ||
        !question.options.every(opt => typeof opt === 'string') ||
        !['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
      return false;
    }
  }

  // Validate true-false specific properties
  if (question.type === 'true-false') {
    if (question.options !== undefined || 
        !['true', 'false'].includes(question.correctAnswer.toLowerCase())) {
      return false;
    }
  }

  return true;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function generateQuiz(
  transcript: string,
  numQuestions: number = 10,
  difficulty: QuizDifficulty = 'medium'
): Promise<QuizQuestion[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a quiz generator that creates ${difficulty} difficulty questions based on meeting transcripts.
          
Rules for generating questions:
1. For multiple-choice questions:
   - Always provide exactly 4 options
   - Use A, B, C, D as answer choices
   - Make sure the correct answer matches one of these letters
   - Don't include the letter in the option text
2. For true/false questions:
   - Use lowercase 'true' or 'false' as the correct answer
   - Don't include any options
3. Make questions clear and unambiguous
4. Ensure correct answers are properly marked
5. Provide clear explanations`
        },
        {
          role: "user",
          content: `Generate ${numQuestions} ${difficulty} difficulty questions from this transcript:\n${transcript}`
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
    if (!functionCall?.arguments) {
      throw new Error('Failed to generate questions');
    }

    let questions: QuizQuestion[];
    try {
      const { questions: rawQuestions } = JSON.parse(functionCall.arguments);
      
      // Validate and clean up each question
      questions = rawQuestions
        .map((q: any, index: number) => ({
          ...q,
          id: `q-${index + 1}`,
          correctAnswer: q.type === 'true-false' 
            ? q.correctAnswer.toLowerCase()
            : q.correctAnswer.toUpperCase(),
          options: q.type === 'multiple-choice'
            ? q.options?.map((opt: string) => opt.replace(/^[A-D]\.\s*/, '').trim())
            : undefined
        }))
        .filter(validateQuizQuestion);

      if (questions.length === 0) {
        throw new Error('No valid questions were generated');
      }

    } catch (err) {
      console.error('Question parsing error:', err);
      throw new Error('Failed to parse generated questions');
    }

    return questions;
  } catch (error: any) {
    // Handle specific OpenAI API errors
    if (error?.status === 429) {
      throw new Error('OpenAI API quota exceeded. Please try again later or contact support if this persists.');
    }
    
    console.error('Error generating quiz:', error);
    throw error instanceof Error ? error : new Error('Failed to generate quiz questions. Please try again.');
  }
}