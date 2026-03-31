/**
 * Parses a FileMaker event code like "MV8", "W2V8", "M3V8" into structured fields.
 *
 * Pattern: [Gender][Level?][Boat]
 *   - Gender: M or W
 *   - Level: optional digit (2, 3, 4) — indicates varsity level; absent = 1
 *   - Boat: usually "V8" (Varsity 8+), "V4" (Varsity 4+), etc.
 */

export interface ParsedEventCode {
  gender: 'M' | 'F';
  level: number;
  boatClass: string;
  displayName: string;
}

/**
 * Parses a FileMaker event code into structured fields.
 * Returns null if the code can't be parsed.
 */
export function parseEventCode(code: string): ParsedEventCode | null {
  if (!code || code.trim() === '' || code.trim().toUpperCase() === 'TBD') {
    return null;
  }

  const trimmed = code.trim();

  // Pattern: (M|W) optionally followed by a digit (2-9), then the rest (e.g., "V8", "V4")
  const match = trimmed.match(/^([MW])(\d)?(.+)$/i);
  if (!match) return null;

  const genderChar = match[1].toUpperCase();
  const levelDigit = match[2] ? parseInt(match[2], 10) : 1;
  const boatPart = match[3]; // e.g., "V8"

  const gender: 'M' | 'F' = genderChar === 'M' ? 'M' : 'F';

  // Convert boat part to display class (V8 → 8+, V4 → 4+, etc.)
  const boatClass = parseBoatClass(boatPart);

  // Build display name
  const genderLabel = gender === 'M' ? "Men's" : "Women's";
  const levelLabel = levelDigit === 1 ? 'Varsity' : `${ordinal(levelDigit)} Varsity`;
  const displayName = `${genderLabel} ${levelLabel} ${boatClass}`;

  return { gender, level: levelDigit, boatClass, displayName };
}

/**
 * Converts a FileMaker boat code (e.g., "V8") into a display class (e.g., "8+").
 */
function parseBoatClass(boatPart: string): string {
  // Extract the boat size number from the code
  const sizeMatch = boatPart.match(/(\d+)/);
  if (sizeMatch) {
    const size = sizeMatch[1];
    // Eights and fours are coxed boats (8+, 4+)
    if (size === '8' || size === '4') return `${size}+`;
    // Doubles, pairs, singles, etc.
    if (size === '2') return '2-';
    if (size === '1') return '1x';
    return size;
  }
  // Fallback: return the raw code
  return boatPart;
}

/**
 * Returns ordinal suffix for a number (2 → "2nd", 3 → "3rd", etc.)
 */
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Builds a race name from available context when the event code is TBD or empty.
 */
export function buildTBDRaceName(host: string, parentGender?: string): string {
  const genderLabel = parentGender === 'Women' || parentGender === 'F'
    ? "Women's"
    : parentGender === 'Men' || parentGender === 'M'
    ? "Men's"
    : '';

  const hostLabel = host?.trim() || 'Unknown';
  return `${hostLabel} ${genderLabel} Race (TBD)`.replace(/\s+/g, ' ').trim();
}
