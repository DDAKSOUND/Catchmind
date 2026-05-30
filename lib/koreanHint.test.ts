import { getKoreanInitials } from "./koreanHint";

const tests: [string, string][] = [
  ["고양이", "ㄱㅇㅇ"],
  ["바나나", "ㅂㄴㄴ"],
  ["컴퓨터", "ㅋㅍㅌ"],
  ["apple", "apple"],
];

let passed = 0;
for (const [input, expected] of tests) {
  const result = getKoreanInitials(input);
  const ok = result === expected;
  console.log(`${ok ? "✅" : "❌"} "${input}" → "${result}" (expected: "${expected}")`);
  if (ok) passed++;
}
console.log(`\n${passed}/${tests.length} tests passed`);
if (passed !== tests.length) process.exit(1);
