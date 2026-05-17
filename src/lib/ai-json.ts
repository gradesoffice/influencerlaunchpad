export const parseJsonFromAiText = (text: string): unknown => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstObject = candidate.indexOf("{");
    const firstArray = candidate.indexOf("[");
    const starts = [firstObject, firstArray].filter((i) => i >= 0);
    const start = starts.length ? Math.min(...starts) : -1;
    const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error("AI belum mengembalikan JSON yang valid. Coba kurangi konten per hari atau generate ulang.");
  }
};

export const repairJsonText = async ({ text }: { text: string }): Promise<string | null> => {
  try {
    return JSON.stringify(parseJsonFromAiText(text));
  } catch {
    return null;
  }
};

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export const asString = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
};

export const asNumber = (value: unknown, fallback = 0): number => {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

export const asStringArray = (value: unknown, fallback: string[] = []): string[] => {
  if (Array.isArray(value)) {
    const items = value.map((item) => asString(item)).filter(Boolean);
    return items.length ? items : fallback;
  }
  const single = asString(value);
  return single ? [single] : fallback;
};