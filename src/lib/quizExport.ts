import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { QuizQuestion } from './quizGenerator';

interface QuizResult {
  questions: QuizQuestion[];
  userAnswers: Record<string, string>;
  score: number;
  totalQuestions: number;
}

export function exportQuizToPDF(result: QuizResult) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPos = 20;
  const lineHeight = 7;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Title
  pdf.setFontSize(20);
  pdf.text('Quiz Results', pageWidth / 2, yPos, { align: 'center' });
  yPos += lineHeight * 2;

  // Date and Score
  pdf.setFontSize(12);
  pdf.text(`Date: ${format(new Date(), 'PPpp')}`, margin, yPos);
  yPos += lineHeight;
  pdf.text(`Score: ${result.score}/${result.totalQuestions} (${Math.round((result.score / result.totalQuestions) * 100)}%)`, margin, yPos);
  yPos += lineHeight * 2;

  // Questions and Answers
  result.questions.forEach((question, index) => {
    const questionNumber = index + 1;
    const userAnswer = result.userAnswers[question.id];
    const isCorrect = userAnswer === question.correctAnswer;

    // Add page if needed
    if (yPos > pdf.internal.pageSize.getHeight() - 40) {
      pdf.addPage();
      yPos = 20;
    }

    // Question
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    const questionText = `Question ${questionNumber}: ${question.question}`;
    const splitQuestion = pdf.splitTextToSize(questionText, contentWidth);
    pdf.text(splitQuestion, margin, yPos);
    yPos += lineHeight * splitQuestion.length;

    // Options for multiple choice
    pdf.setFont(undefined, 'normal');
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach((option, optIndex) => {
        const letter = String.fromCharCode(65 + optIndex);
        const optionText = `${letter}. ${option}`;
        const splitOption = pdf.splitTextToSize(optionText, contentWidth - 5);
        pdf.text(splitOption, margin + 5, yPos);
        yPos += lineHeight * splitOption.length;
      });
    }

    // User's answer and correct answer
    yPos += lineHeight;
    pdf.setTextColor(isCorrect ? '#006400' : '#FF0000');
    pdf.text(`Your answer: ${userAnswer}`, margin, yPos);
    if (!isCorrect) {
      yPos += lineHeight;
      pdf.text(`Correct answer: ${question.correctAnswer}`, margin, yPos);
    }
    pdf.setTextColor('#000000');

    // Explanation
    yPos += lineHeight;
    const explanationText = `Explanation: ${question.explanation}`;
    const splitExplanation = pdf.splitTextToSize(explanationText, contentWidth);
    pdf.text(splitExplanation, margin, yPos);
    yPos += (lineHeight * splitExplanation.length) + lineHeight;
  });

  // Save the PDF
  pdf.save('quiz-results.pdf');
}