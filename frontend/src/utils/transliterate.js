/**
 * Gujarati Transliteration Utility
 * Converts English phonetic text to Gujarati script using Google Input Tools API
 */

// Check if text contains Gujarati characters (Unicode range: 0A80–0AFF)
export function isGujarati(text) {
  return /[\u0A80-\u0AFF]/.test(text);
}

// Transliterate a single word via Google Input Tools
async function transliterateWord(word) {
  if (!word || word.trim() === '') return word;
  if (isGujarati(word)) return word;

  try {
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=gu-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=test`;
    const res = await fetch(url);
    const data = await res.json();
    if (data[0] === 'SUCCESS' && data[1]?.[0]?.[1]?.[0]) {
      return data[1][0][1][0];
    }
    return word;
  } catch {
    return word;
  }
}

/**
 * Transliterate full English text to Gujarati
 * Handles multi-word strings by splitting on spaces
 * Skips words that already contain Gujarati characters
 * @param {string} text - Input text (English phonetic)
 * @returns {Promise<string>} - Gujarati transliterated text
 */
export async function transliterateToGujarati(text) {
  if (!text || text.trim() === '') return text;
  if (isGujarati(text)) return text; // Already Gujarati

  const words = text.trim().split(/\s+/);
  const results = await Promise.all(words.map(transliterateWord));
  return results.join(' ');
}
