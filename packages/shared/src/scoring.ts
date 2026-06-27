import type { Axis, LikertAnswer, SurveyQuestion } from "./types.js";

const LIKERT_MULTIPLIERS: Record<LikertAnswer, number> = {
  1: -2,
  2: -1,
  3: 0,
  4: 1,
  5: 2,
};

export function computeProfile(
  questions: SurveyQuestion[],
  answers: Array<{ questionId: string; value: LikertAnswer }>
): Record<Axis, number> {
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const axisSums: Record<Axis, number> = { econ: 0, dipl: 0, civil: 0, scty: 0 };
  const axisMax: Record<Axis, number> = { econ: 0, dipl: 0, civil: 0, scty: 0 };

  for (const q of questions) {
    axisMax[q.axis] += Math.abs(q.weight) * 2;
  }

  for (const { questionId, value } of answers) {
    const q = questionMap.get(questionId);
    if (!q) continue;
    axisSums[q.axis] += LIKERT_MULTIPLIERS[value] * q.weight;
  }

  const normalize = (axis: Axis): number => {
    const max = axisMax[axis];
    if (max === 0) return 0;
    return Math.round((axisSums[axis] / max) * 100);
  };

  return {
    econ: normalize("econ"),
    dipl: normalize("dipl"),
    civil: normalize("civil"),
    scty: normalize("scty"),
  };
}

export function getAxisValue(profile: Record<Axis, number>, axis: Axis): number {
  return profile[axis];
}

export function oppositeScore(a: number, b: number): number {
  const signBonus = Math.sign(a) !== Math.sign(b) && a !== 0 && b !== 0 ? 20 : 0;
  return Math.abs(a - b) + signBonus;
}

export function totalDistance(
  a: Record<Axis, number>,
  b: Record<Axis, number>
): number {
  return (
    Math.abs(a.econ - b.econ) +
    Math.abs(a.dipl - b.dipl) +
    Math.abs(a.civil - b.civil) +
    Math.abs(a.scty - b.scty)
  );
}
