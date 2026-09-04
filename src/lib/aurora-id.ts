export type CountryOption = { code: string; dial: string; label: string };

export const COUNTRIES: CountryOption[] = [
  { code: "ID", dial: "62", label: "Indonesia (+62)" },
  { code: "MY", dial: "60", label: "Malaysia (+60)" },
  { code: "SG", dial: "65", label: "Singapore (+65)" },
  { code: "PH", dial: "63", label: "Philippines (+63)" },
  { code: "TH", dial: "66", label: "Thailand (+66)" },
  { code: "VN", dial: "84", label: "Vietnam (+84)" },
  { code: "IN", dial: "91", label: "India (+91)" },
  { code: "AU", dial: "61", label: "Australia (+61)" },
  { code: "US", dial: "1", label: "United States (+1)" },
  { code: "GB", dial: "44", label: "United Kingdom (+44)" },
];

export const digitsOnly = (value: string) => value.replace(/\D/g, "");

/** First 5 letters of the name, uppercased, padded with X when shorter. */
export function namePart(fullName: string): string {
  const letters = fullName.replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters + "XXXXX").slice(0, 5);
}

export function lastThree(phone: string): string {
  const d = digitsOnly(phone);
  return d.slice(-3).padStart(3, "0");
}

export function baseUserId(fullName: string, dial: string, phone: string): string {
  return `${namePart(fullName)}${digitsOnly(dial)}${lastThree(phone)}`;
}

/**
 * When the base ID collides (same 5 letters + same last 3 digits), derive three
 * easy-to-remember alternatives from the FULL WhatsApp number.
 */
export function memorableAlternatives(
  fullName: string,
  dial: string,
  phone: string,
  taken: string[] = [],
): string[] {
  const base = baseUserId(fullName, dial, phone);
  const d = digitsOnly(phone);
  const name5 = namePart(fullName);
  const cc = digitsOnly(dial);
  const takenSet = new Set(taken);

  const middle = d.slice(-5, -3) || d.slice(0, 2).padStart(2, "0");
  const head = (d.startsWith("0") ? d.slice(1) : d).slice(0, 2).padStart(2, "0");
  const digitSum = d.split("").reduce((a, n) => a + Number(n), 0) % 100;
  const mirrored = lastThree(phone).split("").reverse().join("");

  const candidates = [
    `${base}-${middle}`,
    `${name5}${cc}${head}${lastThree(phone)}`,
    `${base}-${mirrored}`,
    `${base}-${String(digitSum).padStart(2, "0")}`,
    `${name5}${cc}${d.slice(-4)}`,
  ];

  const unique: string[] = [];
  for (const c of candidates) {
    if (!takenSet.has(c) && !unique.includes(c)) unique.push(c);
    if (unique.length === 3) break;
  }
  return unique;
}

export function isCollision(
  registry: { fullName: string; phone: string; dial: string }[],
  fullName: string,
  dial: string,
  phone: string,
): boolean {
  const n = namePart(fullName);
  const l = lastThree(phone);
  return registry.some(
    (r) =>
      namePart(r.fullName) === n &&
      lastThree(r.phone) === l &&
      digitsOnly(r.dial) === digitsOnly(dial) &&
      digitsOnly(r.phone) !== digitsOnly(phone),
  );
}

export function maskNik(nik: string): string {
  const d = digitsOnly(nik);
  if (d.length < 6) return "•".repeat(d.length);
  return `${d.slice(0, 4)}${"•".repeat(Math.max(d.length - 8, 0))}${d.slice(-4)}`;
}
