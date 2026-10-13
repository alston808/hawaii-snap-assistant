import { Page } from 'playwright';

/**
 * Automates navigating from Hawaii DHS home directly into the active SNAP application portal
 */
export async function navigateToSnapApplication(page: Page): Promise<Page> {
  console.log('[Navigator] Checking current portal state...');

  // If already directly on the application form page:
  if (page.url().includes('ssp') || page.url().includes('app') || await page.locator('#txtApplicantFirstName').isVisible().catch(() => false)) {
    return page;
  }

  try {
    // 1. If starting from main PAIS landing page (https://pais.dhs.hawaii.gov/)
    const snapLink = page.getByRole('link', { name: /Supplemental Nutrition|SNAP/i });
    if (await snapLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[Navigator] Clicking Supplemental Nutrition link...');
      await snapLink.click();
    }

    // 2. Handle popup if opened
    const snapBenefitsLink = page.getByRole('link', { name: /SNAP BENEFITS and FINANCIAL/i });
    if (await snapBenefitsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[Navigator] Opening SNAP BENEFITS and FINANCIAL portal...');
      const [popup] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
        snapBenefitsLink.click().catch(() => {}),
      ]);
      if (popup) {
        await popup.waitForLoadState('domcontentloaded');
        return await enterApplicationPortal(popup);
      }
    }

    return await enterApplicationPortal(page);
  } catch (err: any) {
    console.log(`[Navigator] Automatic deep link fallback: ${err.message}`);
    return page;
  }
}

async function enterApplicationPortal(targetPage: Page): Promise<Page> {
  // If on landing page, click APPLY NOW
  const applyNow = targetPage.getByRole('button', { name: /APPLY NOW|Start a new/i });
  if (await applyNow.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('[Navigator] Clicking APPLY NOW Start a new...');
    await applyNow.click();
    await targetPage.waitForTimeout(500);
  }

  // If on LEP Language page (/unsecure/getLEPPage), click NEXT (#next-btn)
  const lepNext = targetPage.locator('#next-btn');
  if (await lepNext.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('[Navigator] Advancing past LEP language disclaimer page...');
    await lepNext.click();
    await targetPage.waitForTimeout(500);
  }

  // Now on Applicant Registration page: wait for async jQuery #registration HTML to finish loading!
  try {
    console.log('[Navigator] Waiting for Applicant Registration form fields (#chkSNAP) to load...');
    await targetPage.locator('#chkSNAP').waitFor({ state: 'attached', timeout: 10000 });
    console.log('[Navigator] Registration form fields successfully mounted!');
  } catch (e) {
    console.warn('[Navigator] Timeout waiting for #chkSNAP mount, continuing...');
  }

  return targetPage;
}
