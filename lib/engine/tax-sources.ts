export interface TaxSource {
  rateId: string;
  legalBasis: string;
  effectiveFrom: string;
  verifiedBy?: string;
}

/** Har bir stavkaning huquqiy asosi buxgalter tomonidan tekshiriladi. */
export const TAX_SOURCES = {
  turnover: {
    rateId: "turnover",
    legalBasis: "", // TODO: заполнить после проверки бухгалтером.
    effectiveFrom: "2026-01-01",
  },
  profit: {
    rateId: "profit",
    legalBasis: "", // TODO: заполнить после проверки бухгалтером.
    effectiveFrom: "2026-01-01",
  },
  vat: {
    rateId: "vat",
    legalBasis: "", // TODO: заполнить после проверки бухгалтером.
    effectiveFrom: "2026-01-01",
  },
  individual: {
    rateId: "individual",
    legalBasis: "", // TODO: заполнить после проверки бухгалтером.
    effectiveFrom: "2026-01-01",
  },
  social: {
    rateId: "social",
    legalBasis: "", // TODO: заполнить после проверки бухгалтером.
    effectiveFrom: "2026-01-01",
  },
} satisfies Record<string, TaxSource>;
