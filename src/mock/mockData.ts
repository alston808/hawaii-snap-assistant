export interface HawaiiSnapMockProfile {
  programs: string;             // e.g. "SNAP" or "SNAP + Financial"
  interpreter: string;          // "No" or "Yes"
  primaryLanguage: string;      // "English"
  englishProficiency: string;   // "adequate" | "limited" | "none"
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  gender: 'M' | 'F';
  ssn: string;
  dob: string;                  // YYYY-MM-DD
  email: string;
  resAddressLine1: string;
  resAddressLine2?: string;
  resCity: string;
  resState: string;
  resZip: string;
  spouse: string;               // "None" or name
  householdFoodCount: string;   // "1"
  shelterExpense: string;       // "1200" or "yes"
  electricityExpense: string;   // "150"
  grossIncome: string;          // "1400"
}

export const DEFAULT_MOCK_PROFILE: HawaiiSnapMockProfile = {
  programs: 'SNAP',
  interpreter: 'No',
  primaryLanguage: 'English',
  englishProficiency: 'adequate',
  firstName: 'Kai',
  middleName: 'Keanu',
  lastName: 'Kahale',
  phone: '8085550199',
  gender: 'M',
  ssn: '123-45-6789',
  dob: '1990-05-15',
  email: 'kai.kahale@example.com',
  resAddressLine1: '1234 Ala Moana Blvd',
  resCity: 'Honolulu',
  resState: 'HI',
  resZip: '96814',
  spouse: 'None',
  householdFoodCount: '1',
  shelterExpense: '1200',
  electricityExpense: '150',
  grossIncome: '1400',
};

/**
 * Returns pre-canned transcript responses corresponding to the guided flow steps.
 */
export function getMockTranscriptForStep(stepId: string, profile: HawaiiSnapMockProfile = DEFAULT_MOCK_PROFILE): string {
  switch (stepId) {
    case 'select_programs':
      return profile.programs;
    case 'language_assistance':
      return profile.interpreter;
    case 'primary_language':
      return profile.primaryLanguage;
    case 'english_proficiency':
      return profile.englishProficiency;
    case 'applicant_first_name':
      return profile.firstName;
    case 'applicant_middle_name':
      return profile.middleName;
    case 'applicant_last_name':
      return profile.lastName;
    case 'applicant_phone':
      return profile.phone;
    case 'applicant_gender':
      return profile.gender === 'M' ? 'Male' : 'Female';
    case 'applicant_ssn':
      return profile.ssn;
    case 'applicant_dob':
      return profile.dob;
    case 'applicant_email':
      return profile.email;
    case 'res_address':
      return profile.resAddressLine1;
    case 'res_city':
      return profile.resCity;
    case 'res_zip':
      return profile.resZip;
    case 'recaptcha_gate':
      return 'Ready';
    case 'spouse_info':
      return profile.spouse;
    case 'food_household_counts':
      return profile.householdFoodCount;
    case 'expedited_questions':
      return profile.shelterExpense;
    case 'household_roster':
      return 'Looks good';
    default:
      return 'Yes';
  }
}
