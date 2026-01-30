/**
 * Mock "earnings per challenge" data for UI preview when real data is empty.
 * Used in PlayerProfileModal and /app/profile/:address.
 */

export interface MockEarningRow {
  challengeId: string;
  title?: string;
  game?: string;
  amount: number;
  completedAt: Date;
  format?: "standard" | "tournament";
}

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

export const MOCK_EARNINGS_BY_CHALLENGE: MockEarningRow[] = [
  {
    challengeId: "mock-1",
    title: "Street Fighter 6 1v1",
    game: "Street Fighter 6",
    amount: 150,
    completedAt: new Date(now - 2 * day),
    format: "standard",
  },
  {
    challengeId: "mock-2",
    title: "Tekken 8 Tournament",
    game: "Tekken 8",
    amount: 500,
    completedAt: new Date(now - 5 * day),
    format: "tournament",
  },
  {
    challengeId: "mock-3",
    title: "Mortal Kombat 1",
    game: "Mortal Kombat 1",
    amount: 75,
    completedAt: new Date(now - 12 * day),
    format: "standard",
  },
  {
    challengeId: "mock-4",
    title: "FIFA 25 PS5",
    game: "EA Sports FC 25",
    amount: 200,
    completedAt: new Date(now - 18 * day),
    format: "standard",
  },
  {
    challengeId: "mock-5",
    title: "Guilty Gear Strive",
    game: "Guilty Gear -Strive-",
    amount: 100,
    completedAt: new Date(now - 25 * day),
    format: "standard",
  },
  {
    challengeId: "mock-6",
    title: "Founder Tournament",
    game: "Multiple",
    amount: 350,
    completedAt: new Date(now - 32 * day),
    format: "tournament",
  },
];
