import type { Locale } from "../i18n/translations";

export interface LoanCalculationInput {
  amount: number; // so'm
  annualRate: number; // percentage (e.g. 24)
  months: number; // months (e.g. 24)
}

export interface LoanScheduleItem {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface LoanCalculationResult {
  amount: number;
  annualRate: number;
  months: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: LoanScheduleItem[];
}

export interface ProfitCalculationInput {
  revenue: number; // Oylik tushum
  fixedCost: number; // O'zgarmas xarajatlar (ijara, xodimlar maoshi, kommunal)
  variableCost: number; // O'zgaruvchan xarajatlar (xom-ashyo, mahsulot tannarxi, qadoqlash)
  taxRate?: number; // Soliq stavkasi (masalan, 4% aylanma soliq)
  taxAmount?: number; // Yoki hisoblangan soliq summasi
}

export interface ProfitCalculationResult {
  revenue: number;
  fixedCost: number;
  variableCost: number;
  totalCost: number;
  grossProfit: number; // Yalpi foyda = Revenue - VariableCost
  grossMargin: number; // Yalpi marja %
  taxAmount: number;
  netProfit: number; // Sof foyda = Revenue - TotalCost - Tax
  netMargin: number; // Sof marja %
}

export interface BreakEvenInput {
  fixedCost: number; // O'zgarmas xarajatlar
  sellingPrice: number; // 1 dona mahsulot/xizmat narxi
  variableCostPerUnit: number; // 1 dona mahsulotning o'zgaruvchan tannarxi
}

export interface BreakEvenResult {
  fixedCost: number;
  sellingPrice: number;
  variableCostPerUnit: number;
  contributionMargin: number; // Marjinal daromad = Narx - O'zgaruvchan tannarx
  contributionMarginRatio: number; // Marjinal daromad nisbati %
  breakEvenUnits: number; // Zararsizlik nuqtasi (necha dona)
  breakEvenRevenue: number; // Zararsizlik nuqtasi (summada)
  dailyUnits: number; // Kunlik sotilishi kerak bo'lgan dona (30 kunga bo'lganda)
}

export interface CashflowInput {
  revenue: number;
  expenses: number;
  loanPayment?: number;
  tax?: number;
}

export interface CashflowResult {
  revenue: number;
  expenses: number;
  operatingCashflow: number; // Operatsion pul oqimi
  loanPayment: number;
  tax: number;
  netCashflow: number; // Sof pul oqimi
  status: "healthy" | "warning" | "critical";
  statusText: string;
}

export interface DebtBurdenAnalysisInput {
  monthlyRevenue: number;
  monthlyExpenses: number;
  loanAmount: number;
  annualRate: number;
  loanMonths: number;
  otherObligations?: number;
  /** Natija matnlari (verdict, recommendation, taxminlar) shu tilda qaytariladi. Standart: "uz". */
  locale?: Locale;
}

export interface DebtBurdenAnalysisResult {
  operatingCashflow: number;
  monthlyLoanPayment: number;
  remainingCashflow: number;
  /**
   * Qarz yuki %. Operatsion pul oqimi musbat bo'lmasa `null` —
   * bu holda ko'rsatkichni hisoblab bo'lmaydi (ilgari bu yerda 100 sentinel qiymati
   * qaytarilar va UI da haqiqiy o'lchov kabi ko'rinardi).
   */
  debtBurdenPercent: number | null;
  riskLevel: "safe" | "moderate" | "high";
  recommendation: string;
  verdict: string;
  assumptions: string[];
}

export interface BusinessPlanData {
  businessType: string;
  businessName?: string;
  location: string;
  initialCapital: number;
  potentialLoan?: number;
  monthlyExpenses: number;
  expectedRevenue: number;
  employees: number;
  targetCustomer: string;
  /** `generateStructuredBusinessPlan` natija matnlarini shu tilda qaytaradi. Standart: "uz". */
  locale?: Locale;
  sections?: {
    overview: string;
    targetMarket: string;
    productService: string;
    startupCosts: { title: string; amount: number }[];
    monthlyExpensesBreakdown: { title: string; amount: number }[];
    revenueProjection: string;
    profitability: string;
    breakEven: string;
    marketing: string;
    risks: string[];
    fundingStrategy: string;
  };
}
