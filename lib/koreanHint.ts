const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const INITIAL_CONSONANTS = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
  "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

function getInitialConsonant(char: string): string | null {
  const code = char.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return null;
  const index = Math.floor((code - HANGUL_START) / 28 / 21);
  return INITIAL_CONSONANTS[index];
}

export function getKoreanInitials(
  text: string,
  nonKoreanMode: "keep" | "mask" = "keep"
): string {
  return text
    .split("")
    .map((char) => {
      const initial = getInitialConsonant(char);
      if (initial) return initial;
      if (nonKoreanMode === "mask" && /[^\s]/.test(char)) return "?";
      return char;
    })
    .join("");
}
