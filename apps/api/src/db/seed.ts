import type { Axis, SurveyQuestion, Topic } from "@parallax/shared";

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: "q1",
    text: "Capital gains should be taxed at the same rate as wages.",
    axis: "econ",
    weight: 1,
    active: true,
  },
  {
    id: "q2",
    text: "The free market allocates resources better than government planning.",
    axis: "econ",
    weight: 1,
    active: true,
  },
  {
    id: "q3",
    text: "National interest should come before international cooperation.",
    axis: "dipl",
    weight: 1,
    active: true,
  },
  {
    id: "q4",
    text: "Countries should prioritize global agreements over unilateral action.",
    axis: "dipl",
    weight: -1,
    active: true,
  },
  {
    id: "q5",
    text: "Government surveillance is acceptable if it reduces crime.",
    axis: "civil",
    weight: -1,
    active: true,
  },
  {
    id: "q6",
    text: "Individual privacy should rarely be compromised for security.",
    axis: "civil",
    weight: 1,
    active: true,
  },
  {
    id: "q7",
    text: "Social change should happen gradually, not rapidly.",
    axis: "scty",
    weight: -1,
    active: true,
  },
  {
    id: "q8",
    text: "Society should embrace progressive reforms even when they disrupt tradition.",
    axis: "scty",
    weight: 1,
    active: true,
  },
  {
    id: "q9",
    text: "Wealthy individuals and corporations should pay higher taxes to fund public services.",
    axis: "econ",
    weight: -1,
    active: true,
  },
  {
    id: "q10",
    text: "Immigration strengthens a nation's economy and culture.",
    axis: "dipl",
    weight: 1,
    active: true,
  },
];

export const TOPICS: Topic[] = [
  {
    id: "topic-cap-gains",
    slug: "capital-gains-tax",
    question: "Should capital gains be taxed as ordinary income?",
    primaryAxis: "econ" as Axis,
    active: true,
  },
  {
    id: "topic-immigration",
    slug: "immigration-policy",
    question: "Should immigration limits be significantly reduced?",
    primaryAxis: "dipl" as Axis,
    active: true,
  },
  {
    id: "topic-climate",
    slug: "climate-regulation",
    question: "Should governments impose strict regulations to combat climate change?",
    primaryAxis: "scty" as Axis,
    active: true,
  },
  {
    id: "topic-surveillance",
    slug: "government-surveillance",
    question: "Is expanded government surveillance justified for public safety?",
    primaryAxis: "civil" as Axis,
    active: true,
  },
  {
    id: "topic-healthcare",
    slug: "universal-healthcare",
    question: "Should healthcare be primarily funded and managed by the government?",
    primaryAxis: "econ" as Axis,
    active: true,
  },
];
