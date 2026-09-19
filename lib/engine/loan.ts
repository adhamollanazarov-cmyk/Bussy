import { LoanCalculationInput, LoanCalculationResult, LoanScheduleItem } from "./types";

/**
 * calculateLoan
 * Aniq annuitet kredit hisob-kitobi.
 * Formula:
 * r = (annualRate / 100) / 12
 * M = P * (r * (1 + r)^n) / ((1 + r)^n - 1)
 */
export function calculateLoan(input: LoanCalculationInput): LoanCalculationResult {
  const { amount, annualRate, months } = input;

  if (amount <= 0 || months <= 0) {
    return {
      amount,
      annualRate,
      months,
      monthlyPayment: 0,
      totalPayment: 0,
      totalInterest: 0,
      schedule: [],
    };
  }

  // Foizsiz qarz holati
  if (annualRate <= 0) {
    const monthlyPayment = amount / months;
    const schedule: LoanScheduleItem[] = [];
    let remaining = amount;
    for (let m = 1; m <= months; m++) {
      remaining -= monthlyPayment;
      schedule.push({
        month: m,
        // Asosiy tarmoq kabi yaxlitlanadi — chaqiruvchilar bir xil formatni oladi.
        payment: Math.round(monthlyPayment),
        principal: Math.round(monthlyPayment),
        interest: 0,
        remainingBalance: Math.round(Math.max(0, remaining)),
      });
    }
    return {
      amount: Math.round(amount),
      annualRate: 0,
      months,
      monthlyPayment: Math.round(monthlyPayment),
      totalPayment: Math.round(amount),
      totalInterest: 0,
      schedule,
    };
  }

  const monthlyRate = annualRate / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, months);
  const monthlyPayment = (amount * (monthlyRate * factor)) / (factor - 1);
  const totalPayment = monthlyPayment * months;
  const totalInterest = totalPayment - amount;

  const schedule: LoanScheduleItem[] = [];
  let remainingBalance = amount;

  for (let m = 1; m <= months; m++) {
    const interest = remainingBalance * monthlyRate;
    const principal = monthlyPayment - interest;
    remainingBalance = Math.max(0, remainingBalance - principal);

    schedule.push({
      month: m,
      payment: Math.round(monthlyPayment),
      principal: Math.round(principal),
      interest: Math.round(interest),
      remainingBalance: Math.round(remainingBalance),
    });
  }

  return {
    amount: Math.round(amount),
    annualRate,
    months,
    monthlyPayment: Math.round(monthlyPayment),
    totalPayment: Math.round(totalPayment),
    totalInterest: Math.round(totalInterest),
    schedule,
  };
}
