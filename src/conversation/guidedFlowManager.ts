import { Page } from 'playwright';
import { HAWAII_PORTAL_FLOW, FormStepAction } from './formFlow.js';
import { goBackWizard } from '../browser/wizardController.js';
import { AgentBrain, BrainDecision } from '../services/agentBrain.js';

export class GuidedFlowManager {
  private currentIndex = 0;
  private recordedData: Record<string, string> = {};
  private brain = new AgentBrain();

  getCurrentStep(): FormStepAction | null {
    if (this.currentIndex >= HAWAII_PORTAL_FLOW.length) {
      return null;
    }
    return HAWAII_PORTAL_FLOW[this.currentIndex];
  }

  /**
   * Intelligently processes user input using the AI brain.
   * Handles backtracking, skipping, slot sanitization, or standard form filling.
   */
  async processUserInput(page: Page, userInput: string): Promise<{
    decision: BrainDecision;
    step: FormStepAction | null;
    isComplete: boolean;
    nextPrompt: string;
  }> {
    const currentStep = this.getCurrentStep();
    if (!currentStep) {
      return {
        decision: { action: 'fill', cleanValue: '', keokiReply: "Application complete!" },
        step: null,
        isComplete: true,
        nextPrompt: "Application complete! You're ready to submit.",
      };
    }

    // 1. Let the AI Brain decide user intent and clean the value
    const decision = await this.brain.decide(
      currentStep.fieldLabel,
      currentStep.speechPrompt,
      userInput
    );

    console.log(`[Keoki Brain] Decision: ${decision.action} | Clean Value: "${decision.cleanValue}" | Reply: "${decision.keokiReply}"`);

    // 2. Handle BACKTRACKING
    if (decision.action === 'back') {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        await goBackWizard(page);
      }
      const prevStep = this.getCurrentStep();
      const prompt = decision.keokiReply
        ? `${decision.keokiReply} ${prevStep?.speechPrompt || ''}`
        : `Alright, back to ${prevStep?.fieldLabel}. ${prevStep?.speechPrompt || ''}`;

      return {
        decision,
        step: prevStep,
        isComplete: false,
        nextPrompt: prompt,
      };
    }

    // 3. Handle SKIP
    if (decision.action === 'skip') {
      this.currentIndex++;
      const nextStep = this.getCurrentStep();
      return {
        decision,
        step: nextStep,
        isComplete: !nextStep,
        nextPrompt: nextStep ? nextStep.speechPrompt : "That's all the steps!",
      };
    }

    // 4. Handle FILL (Standard advancement with cleaned-up value)
    const sanitizedVal = decision.cleanValue || userInput.trim();
    const res = await currentStep.run(page, sanitizedVal);
    this.recordedData[currentStep.id] = res.value;

    this.currentIndex++;
    const isComplete = this.currentIndex >= HAWAII_PORTAL_FLOW.length;
    const nextStep = this.getCurrentStep();

    let nextPrompt = '';
    if (isComplete) {
      nextPrompt = "Chee-hoo! We filled out all the required sections. Take a quick look on your screen, and you're good to submit!";
    } else if (nextStep) {
      nextPrompt = nextStep.speechPrompt;
    }

    return {
      decision,
      step: currentStep,
      isComplete,
      nextPrompt,
    };
  }

  getCollectedData(): Record<string, string> {
    return { ...this.recordedData };
  }
}
