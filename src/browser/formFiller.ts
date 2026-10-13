import { Page } from 'playwright';
import { FormQuestion } from '../conversation/formQuestions.js';

export class FormFiller {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Find matching element on the page, scroll into view, highlight it, and fill the value
   */
  async fillField(question: FormQuestion, value: string): Promise<boolean> {
    for (const selector of question.selectorCandidate) {
      try {
        const element = await this.page.$(selector);
        if (element && (await element.isVisible())) {
          // Highlight with glowing green animation
          await element.evaluate((el) => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (el as HTMLElement).style.outline = '3px solid #10b981';
            (el as HTMLElement).style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.6)';
            (el as HTMLElement).style.transition = 'all 0.3s ease';
          });

          await this.page.waitForTimeout(300);

          // Type out value
          await element.fill(value);

          // Trigger change & input events so AngularJS / reactive frameworks pick it up
          await element.evaluate((el) => {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          });

          return true;
        }
      } catch (e) {
        // Continue to next candidate selector
      }
    }

    console.log(`[FormFiller] Notice: No visible input matching ${question.fieldLabel} on current page view.`);
    return false;
  }
}
