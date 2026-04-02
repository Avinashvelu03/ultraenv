// =============================================================================
// ultraenv — Shannon Entropy Calculator
// Calculate the information entropy of strings for secret detection.
// =============================================================================

// -----------------------------------------------------------------------------
// Shannon Entropy
// -----------------------------------------------------------------------------

/**
 * Calculate the Shannon entropy of a string in bits per character.
 *
 * Shannon entropy measures the uncertainty (randomness) in a message.
 * Higher values indicate more randomness / less predictability.
 *
 * - Uniform lowercase English text: ~4.0–4.5 bits
 * - Mixed case + digits + symbols: ~5.0–6.0 bits
 * - Random hex strings: ~4.0 bits (per char)
 * - High-entropy secrets (base64, API keys): typically > 3.5 bits
 *
 * @param str - The input string to analyze.
 * @returns Entropy in bits per character (0.0 for empty strings).
 *
 * @example
 * shannonEntropy('hello')     // ~2.85
 * shannonEntropy('a1b2c3d4')  // ~3.0
 * shannonEntropy('xJ9#kL2$mP') // ~4.12
 * shannonEntropy('')          // 0
 */
export function shannonEntropy(str: string): number {
  if (str.length === 0) return 0;

  // Count frequency of each character
  const freq = new Map<string, number>();
  for (const char of str) {
    freq.set(char, (freq.get(char) ?? 0) + 1);
  }

  const len = str.length;
  let entropy = 0;

  for (const count of freq.values()) {
    const probability = count / len;
    // Shannon's formula: H = -Σ p(x) * log2(p(x))
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

// -----------------------------------------------------------------------------
// High-Entropy Detection
// -----------------------------------------------------------------------------

/**
 * Check if a string has high entropy, suggesting it may be a secret or token.
 *
 * Uses Shannon entropy with configurable threshold.
 * Default threshold of 3.5 is calibrated to catch common secret formats
 * (API keys, tokens, passwords) while minimizing false positives on
 * regular text.
 *
 * @param str - The string to check.
 * @param threshold - Minimum entropy to consider "high" (default: 3.5).
 * @returns true if the string's entropy exceeds the threshold.
 *
 * @example
 * isHighEntropy('my-database-password')  // false (~3.1)
 * isHighEntropy('super_secret_token_4eC39HqLyjWDarjtT1zdp7dc')  // true (~4.2)
 * isHighEntropy('a]c!D@f#G$h%J^k&L*m')  // true (~4.0)
 */
export function isHighEntropy(str: string, threshold: number = 3.5): boolean {
  if (str.length === 0) return false;
  return shannonEntropy(str) > threshold;
}

// -----------------------------------------------------------------------------
// Normalized Entropy
// -----------------------------------------------------------------------------

/**
 * Calculate normalized Shannon entropy (0.0–1.0 range).
 * Useful for comparing entropy across strings of different character sets.
 *
 * Normalized entropy = H / log2(|alphabet|)
 * where |alphabet| is the number of unique characters in the string.
 *
 * @param str - The input string.
 * @returns Normalized entropy between 0 and 1.
 */
export function normalizedEntropy(str: string): number {
  if (str.length === 0) return 0;

  const uniqueChars = new Set(str).size;
  if (uniqueChars <= 1) return 0;

  const maxEntropy = Math.log2(uniqueChars);
  const entropy = shannonEntropy(str);

  return entropy / maxEntropy;
}

// -----------------------------------------------------------------------------
// Byte-Level Entropy
// -----------------------------------------------------------------------------

/**
 * Calculate entropy of a Buffer at the byte level.
 * Useful for analyzing binary data or raw file contents.
 *
 * @param buffer - The buffer to analyze.
 * @returns Entropy in bits per byte (max 8.0).
 */
export function byteEntropy(buffer: Buffer): number {
  if (buffer.length === 0) return 0;

  const freq = new Uint32Array(256); // One slot for each possible byte value

  for (let idx = 0; idx < buffer.length; idx++) {
    const byte = buffer[idx] as number;
    freq[byte] = (freq[byte] as number) + 1;
  }

  const len = buffer.length;
  let entropy = 0;

  for (let idx = 0; idx < 256; idx++) {
    const count = freq[idx] as number;
    if (count === 0) continue;
    const probability = count / len;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}
