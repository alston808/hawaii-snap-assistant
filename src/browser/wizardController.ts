import { Page } from 'playwright';

/**
 * Click the visible "NEXT" button within the currently active fieldset
 */
export async function advanceWizard(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const fieldsets = Array.from(document.querySelectorAll('form.msform fieldset'));
    const active = fieldsets.find(fs => window.getComputedStyle(fs).display !== 'none');
    if (active) {
      const nextBtn = Array.from(active.querySelectorAll('input[type="button"], button'))
        .find(b => (b as HTMLInputElement).value === 'NEXT' || (b as HTMLElement).innerText.includes('NEXT')) as HTMLElement;
      if (nextBtn) {
        nextBtn.click();
        return true;
      }
    }
    // Fallback to any visible next button
    const anyNext = Array.from(document.querySelectorAll('input[value="NEXT"], #next-btn'))
      .find(b => (b as HTMLElement).offsetWidth > 0) as HTMLElement;
    if (anyNext) {
      anyNext.click();
      return true;
    }
    return false;
  });
}

/**
 * Click the visible "BACK" button within the currently active fieldset to backtrack
 */
export async function goBackWizard(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const fieldsets = Array.from(document.querySelectorAll('form.msform fieldset'));
    const active = fieldsets.find(fs => window.getComputedStyle(fs).display !== 'none');
    if (active) {
      const backBtn = Array.from(active.querySelectorAll('input[type="button"], button'))
        .find(b => (b as HTMLInputElement).value === 'BACK' || (b as HTMLElement).innerText.includes('BACK')) as HTMLElement;
      if (backBtn) {
        backBtn.click();
        return true;
      }
    }
    const anyBack = Array.from(document.querySelectorAll('input[value="BACK"]'))
      .find(b => (b as HTMLElement).offsetWidth > 0) as HTMLElement;
    if (anyBack) {
      anyBack.click();
      return true;
    }
    return false;
  });
}

/**
 * Helper to safely click an input or label by ID and trigger change
 */
export async function checkInput(page: Page, id: string): Promise<boolean> {
  return await page.evaluate((inputId) => {
    const el = document.getElementById(inputId) as HTMLInputElement;
    if (el) {
      if (!el.checked) {
        const label = document.querySelector(`label[for="${inputId}"]`) as HTMLElement;
        if (label) {
          label.click();
        } else {
          el.click();
        }
      }
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  }, id);
}

/**
 * Helper to safely fill an input by ID with visual highlighting
 */
export async function fillInput(page: Page, id: string, value: string): Promise<boolean> {
  return await page.evaluate(({ inputId, val }) => {
    const el = document.getElementById(inputId) as HTMLInputElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.outline = '3px solid #10b981';
      el.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.6)';
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }, { inputId: id, val: value });
}
