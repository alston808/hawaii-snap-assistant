import { DialogManager } from './src/conversation/dialogManager.js';

console.log('Testing Dialog State Machine...');
const dialog = new DialogManager();

const q1 = dialog.getCurrentQuestion();
console.log('Q1:', q1?.speechPrompt);
const a1 = dialog.processUserAnswer('My name is Alston');
console.log('Parsed Q1 Value:', a1?.extractedValue);

const q2 = dialog.getCurrentQuestion();
console.log('Q2:', q2?.speechPrompt);
const a2 = dialog.processUserAnswer('Kalani');
console.log('Parsed Q2 Value:', a2?.extractedValue);

const q3 = dialog.getCurrentQuestion();
console.log('Q3:', q3?.speechPrompt);
const a3 = dialog.processUserAnswer('07/04/1990');
console.log('Parsed Q3 Value:', a3?.extractedValue);

const q4 = dialog.getCurrentQuestion();
console.log('Q4:', q4?.speechPrompt);
const a4 = dialog.processUserAnswer('8085551234');
console.log('Parsed Q4 Value:', a4?.extractedValue);

console.log('All collected test values:', dialog.getCollectedData());
console.log('✅ Dialog tests completed successfully!');
