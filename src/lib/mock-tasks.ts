export type MockTask = {
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
};

const VERBS = [
  "Review",
  "Update",
  "Write",
  "Fix",
  "Prepare",
  "Draft",
  "Test",
  "Refactor",
  "Plan",
  "Send",
  "Document",
  "Investigate",
];

const TOPICS = [
  "the quarterly report",
  "the onboarding guide",
  "the payment flow",
  "the login page",
  "the invoice export",
  "the dashboard charts",
  "the API rate limits",
  "the release notes",
  "the customer feedback",
  "the search filters",
  "the email templates",
  "the database indexes",
];

const DESCRIPTIONS = [
  "Check the edge cases with the team.",
  "Blocked until the design review is done.",
  "Follow up after the next sprint planning.",
  "Nice to have before the demo.",
  "Confirm the numbers with finance first.",
];

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 60;

// mulberry32: small, fast PRNG. The same seed always yields the same tasks.
export function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] as T;
}

export function generateMockTasks({ count, seed, now }: { count: number; seed: number; now: number }): MockTask[] {
  const random = createRandom(seed);

  return Array.from({ length: count }, () => {
    const description = random() < 0.5 ? pick(DESCRIPTIONS, random) : undefined;
    return {
      title: `${pick(VERBS, random)} ${pick(TOPICS, random)}`,
      description,
      completed: random() < 0.3,
      createdAt: new Date(now - Math.floor(random() * HISTORY_DAYS * DAY_MS)),
    };
  });
}
