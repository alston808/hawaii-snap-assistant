import { HAWAII_SNAP_QUESTIONS, FormQuestion } from './formQuestions.js';

export class DialogManager {
  private currentIndex = 0;
  private collectedAnswers: Record<string, string> = {};

  getCurrentQuestion(): FormQuestion | null {
    if (this.currentIndex >= HAWAII_SNAP_QUESTIONS.length) {
      return null;
    }
    return HAWAII_SNAP_QUESTIONS[this.currentIndex];
  }

  processUserAnswer(transcript: string): {
    question: FormQuestion;
    extractedValue: string;
    isComplete: boolean;
    nextQuestion: FormQuestion | null;
  } | null {
    const question = this.getCurrentQuestion();
    if (!question) return null;

    const extractedValue = question.extractValue(transcript) || transcript.trim();
    this.collectedAnswers[question.id] = extractedValue;

    this.currentIndex++;
    const isComplete = this.currentIndex >= HAWAII_SNAP_QUESTIONS.length;
    const nextQuestion = this.getCurrentQuestion();

    return {
      question,
      extractedValue,
      isComplete,
      nextQuestion,
    };
  }

  getCollectedData(): Record<string, string> {
    return { ...this.collectedAnswers };
  }

  reset() {
    this.currentIndex = 0;
    this.collectedAnswers = {};
  }
}
