export type PasswordChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  special: boolean;
};

export function checkPassword(p: string): PasswordChecks {
  return {
    length: p.length >= 8,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    digit: /\d/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  };
}

export function getStrengthScore(p: string): number {
  return Object.values(checkPassword(p)).filter(Boolean).length;
}

export function getStrengthLabel(score: number, lang: "tr" | "en"): string {
  if (score <= 2) return lang === "tr" ? "Zayıf" : "Weak";
  if (score <= 4) return lang === "tr" ? "Orta" : "Medium";
  return lang === "tr" ? "Güçlü" : "Strong";
}

export function getStrengthColor(score: number): string {
  if (score <= 2) return "#ef4444";
  if (score <= 4) return "#f59e0b";
  return "#22c55e";
}

export const RULE_LABELS = {
  tr: {
    length:  "En az 8 karakter",
    upper:   "En az 1 büyük harf (A-Z)",
    lower:   "En az 1 küçük harf (a-z)",
    digit:   "En az 1 rakam (0-9)",
    special: "En az 1 özel karakter (!@#$%...)",
  },
  en: {
    length:  "At least 8 characters",
    upper:   "At least 1 uppercase letter (A-Z)",
    lower:   "At least 1 lowercase letter (a-z)",
    digit:   "At least 1 number (0-9)",
    special: "At least 1 special character (!@#$%...)",
  },
};
