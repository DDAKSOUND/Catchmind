import { judgeAnswer, normalizeAnswer, extractAnswerFromCommand } from "./answerJudge";

// normalizeAnswer tests
console.assert(normalizeAnswer("고 양 이") === "고양이", "normalize: spaces");
console.assert(normalizeAnswer("고양이!!") === "고양이", "normalize: special chars");
console.assert(normalizeAnswer("Cat!!") === "cat", "normalize: English + special");
console.assert(normalizeAnswer("  hello  ") === "hello", "normalize: trim");

// extractAnswerFromCommand tests
console.assert(extractAnswerFromCommand("고양이") === null, "extract: no prefix");
console.assert(extractAnswerFromCommand("정답 고양이") === null, "extract: missing !");
console.assert(extractAnswerFromCommand("!정답 고양이") === "고양이", "extract: normal");
console.assert(extractAnswerFromCommand("!정답고양이") === "고양이", "extract: no space");
console.assert(extractAnswerFromCommand("!정답 고 양 이") === "고 양 이", "extract: spaces in answer");
console.assert(extractAnswerFromCommand("!정답") === null, "extract: empty answer");
console.assert(extractAnswerFromCommand("!정답 ") === null, "extract: whitespace only");

// judgeAnswer tests — correct answer: 고양이
const CA = "고양이";
console.assert(judgeAnswer("고양이", CA).isCorrect === false, "judge: no prefix");
console.assert(judgeAnswer("정답 고양이", CA).isCorrect === false, "judge: missing !");
console.assert(judgeAnswer("!정답 고양이", CA).isCorrect === true, "judge: correct");
console.assert(judgeAnswer("!정답고양이", CA).isCorrect === true, "judge: no space between");
console.assert(judgeAnswer("!정답 고 양 이", CA).isCorrect === true, "judge: spaces in answer");
console.assert(judgeAnswer("!정답 고양이!!", CA).isCorrect === true, "judge: special chars");
console.assert(judgeAnswer("!정답 강아지", CA).isCorrect === false, "judge: wrong answer");
console.assert(judgeAnswer("!정답 고양잉", CA).isCorrect === false, "judge: typo");

// isCommand checks
console.assert(judgeAnswer("고양이", CA).isCommand === false, "command: plain chat");
console.assert(judgeAnswer("!정답 강아지", CA).isCommand === true, "command: !정답 prefix");

console.log("✅ All answerJudge tests passed!");
