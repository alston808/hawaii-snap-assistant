export interface FormQuestion {
  id: string;
  fieldLabel: string;
  speechPrompt: string;
  selectorCandidate: string[]; // DOM selectors to try to match in Hawaii PAIS portal
  fieldType: 'text' | 'date' | 'number' | 'radio' | 'select';
  extractValue: (transcript: string) => string | null;
}

export const HAWAII_SNAP_QUESTIONS: FormQuestion[] = [
  {
    id: 'first_name',
    fieldLabel: 'First Name',
    speechPrompt: "Aloha! I will help you with your Hawaii Food Stamps application. What is your legal first name?",
    selectorCandidate: [
      'input[name*="firstName" i]',
      'input[id*="firstName" i]',
      'input[placeholder*="First Name" i]',
      'input[ng-model*="firstName" i]',
    ],
    fieldType: 'text',
    extractValue: (text: string) => {
      // E.g. "My first name is Alston" or "Alston"
      const match = text.match(/(?:first name is|name is|i am|it's|it is)?\s*([a-zA-Z\-]+)$/i);
      return match ? match[1] : text.split(' ')[0] || null;
    },
  },
  {
    id: 'last_name',
    fieldLabel: 'Last Name',
    speechPrompt: "Great! What is your legal last name?",
    selectorCandidate: [
      'input[name*="lastName" i]',
      'input[id*="lastName" i]',
      'input[placeholder*="Last Name" i]',
      'input[ng-model*="lastName" i]',
    ],
    fieldType: 'text',
    extractValue: (text: string) => {
      const match = text.match(/(?:last name is|surname is)?\s*([a-zA-Z\-]+)$/i);
      return match ? match[1] : text.trim() || null;
    },
  },
  {
    id: 'dob',
    fieldLabel: 'Date of Birth',
    speechPrompt: "What is your date of birth? You can say month, day, and year.",
    selectorCandidate: [
      'input[name*="dob" i]',
      'input[id*="dob" i]',
      'input[placeholder*="mm/dd/yyyy" i]',
      'input[ng-model*="dob" i]',
      'input[ng-model*="birthDate" i]',
    ],
    fieldType: 'date',
    extractValue: (text: string) => {
      // Parse patterns like "July 4th 1990" or "07/04/1990"
      const dateMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
      if (dateMatch) {
        const m = dateMatch[1].padStart(2, '0');
        const d = dateMatch[2].padStart(2, '0');
        const y = dateMatch[3].length === 2 ? '19' + dateMatch[3] : dateMatch[3];
        return `${m}/${d}/${y}`;
      }
      return text.trim();
    },
  },
  {
    id: 'phone',
    fieldLabel: 'Phone Number',
    speechPrompt: "What is a good contact phone number for DHS to reach you?",
    selectorCandidate: [
      'input[type="tel"]',
      'input[name*="phone" i]',
      'input[id*="phone" i]',
      'input[ng-model*="phone" i]',
    ],
    fieldType: 'text',
    extractValue: (text: string) => {
      const digits = text.replace(/\D/g, '');
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      return digits || text.trim();
    },
  },
  {
    id: 'household_size',
    fieldLabel: 'Household Size',
    speechPrompt: "How many people live in your household and purchase/prepare food together with you?",
    selectorCandidate: [
      'input[name*="household" i]',
      'input[id*="household" i]',
      'input[ng-model*="householdSize" i]',
      'input[ng-model*="membersCount" i]',
    ],
    fieldType: 'number',
    extractValue: (text: string) => {
      const numMatch = text.match(/\b(\d+)\b/);
      if (numMatch) return numMatch[1];
      const wordMap: Record<string, string> = {
        one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', just: '1', me: '1'
      };
      for (const [w, val] of Object.entries(wordMap)) {
        if (text.toLowerCase().includes(w)) return val;
      }
      return '1';
    },
  },
  {
    id: 'street_address',
    fieldLabel: 'Residential Street Address',
    speechPrompt: "What is your physical street address in Hawaii?",
    selectorCandidate: [
      'input[name*="street" i]',
      'input[name*="addressLine1" i]',
      'input[id*="address" i]',
      'input[placeholder*="Street Address" i]',
    ],
    fieldType: 'text',
    extractValue: (text: string) => text.trim(),
  },
  {
    id: 'zip_code',
    fieldLabel: 'ZIP Code',
    speechPrompt: "What is your 5-digit Hawaii ZIP code?",
    selectorCandidate: [
      'input[name*="zip" i]',
      'input[id*="zip" i]',
      'input[placeholder*="Zip" i]',
      'input[ng-model*="zip" i]',
    ],
    fieldType: 'text',
    extractValue: (text: string) => {
      const zipMatch = text.match(/\b(96\d{3})\b/);
      return zipMatch ? zipMatch[1] : text.replace(/\D/g, '').slice(0, 5);
    },
  },
  {
    id: 'monthly_rent',
    fieldLabel: 'Monthly Rent or Mortgage',
    speechPrompt: "Roughly how much do you pay each month for shelter, like rent or mortgage? (Say zero if none).",
    selectorCandidate: [
      'input[name*="rent" i]',
      'input[id*="rent" i]',
      'input[name*="shelter" i]',
      'input[ng-model*="rent" i]',
    ],
    fieldType: 'number',
    extractValue: (text: string) => {
      const numMatch = text.match(/(\d+[\d,]*(?:\.\d{2})?)/);
      if (numMatch) return numMatch[1].replace(/,/g, '');
      if (/none|zero|nothing/i.test(text)) return '0';
      return text.trim();
    },
  },
  {
    id: 'electricity_cost',
    fieldLabel: 'Monthly Electricity Cost',
    speechPrompt: "Do you pay for electricity or Hawaiian Electric? If so, what is your typical monthly bill?",
    selectorCandidate: [
      'input[name*="electric" i]',
      'input[id*="electric" i]',
      'input[name*="utility" i]',
      'input[ng-model*="utility" i]',
    ],
    fieldType: 'number',
    extractValue: (text: string) => {
      const numMatch = text.match(/(\d+[\d,]*(?:\.\d{2})?)/);
      if (numMatch) return numMatch[1].replace(/,/g, '');
      if (/no|none|zero|included/i.test(text)) return '0';
      return text.trim();
    },
  },
  {
    id: 'gross_income',
    fieldLabel: 'Monthly Gross Income',
    speechPrompt: "What is your approximate total monthly income before taxes from all jobs or sources?",
    selectorCandidate: [
      'input[name*="income" i]',
      'input[id*="income" i]',
      'input[placeholder*="Income" i]',
      'input[ng-model*="grossIncome" i]',
    ],
    fieldType: 'number',
    extractValue: (text: string) => {
      const numMatch = text.match(/(\d+[\d,]*(?:\.\d{2})?)/);
      if (numMatch) return numMatch[1].replace(/,/g, '');
      if (/none|zero|unemployed|no income/i.test(text)) return '0';
      return text.trim();
    },
  },
];
