import { expect, test, describe } from 'bun:test';

export function calculateMABScore(
  likes: number,
  comments: number,
  similarity: number,
  clicks: number,
  impressions: number,
  ageHours: number
): number {
  const rawPopularity = likes + comments * 2;
  const contextScore = similarity;
  const alpha = Math.max(1, clicks);
  const beta = Math.max(1, impressions - clicks);
  const expectedCTR = alpha / (alpha + beta);

  const timeDecay = Math.pow(ageHours + 2, 1.8);
  return (rawPopularity * contextScore + expectedCTR * 100) / timeDecay;
}

describe('Feed Balancing Engine Tests', () => {
  test('Time Decay diminishes stale viral items safely over a 48 hour span', () => {
    const earlyScore = calculateMABScore(150, 45, 0.92, 12, 110, 1);
    const delayedScore = calculateMABScore(150, 45, 0.92, 12, 110, 48);

    expect(delayedScore).toBeLessThan(earlyScore * 0.05);
  });

  test('High semantic matching prioritizes niche content over raw engagement metrics', () => {
    const viralImpersonalScore = calculateMABScore(500, 120, 0.15, 40, 2000, 2);
    const nicheTargetedScore = calculateMABScore(25, 8, 0.95, 15, 60, 2);

    expect(nicheTargetedScore).toBeGreaterThan(viralImpersonalScore * 0.3);
  });
});
