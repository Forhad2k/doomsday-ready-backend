import { describe, it, expect } from "vitest";
import { calculateMinimumBundles } from "../../src/utils/cinema-bundles.js";

describe("Cinema Booking Algorithm (Unbounded Coin Change DP)", () => {
  it("[1, 3, 4], group 6 -> 2 bundles of size 3", () => {
    const result = calculateMinimumBundles([1, 3, 4], 6);
    expect(result.possible).toBe(true);
    expect(result.groupSize).toBe(6);
    expect(result.totalBundles).toBe(2);
    expect(result.bundles).toEqual([{ size: 3, quantity: 2 }]);
  });

  it("[2, 5], group 11 -> 1 bundle of 5 and 3 bundles of 2", () => {
    const result = calculateMinimumBundles([2, 5], 11);
    expect(result.possible).toBe(true);
    expect(result.groupSize).toBe(11);
    expect(result.totalBundles).toBe(4);
    expect(result.bundles).toEqual([
      { size: 5, quantity: 1 },
      { size: 2, quantity: 3 },
    ]);
  });

  it("[6, 9, 20], group 44 -> 1 bundle of 20, 2 bundles of 9, and 1 bundle of 6", () => {
    const result = calculateMinimumBundles([6, 9, 20], 44);
    expect(result.possible).toBe(true);
    expect(result.groupSize).toBe(44);
    expect(result.totalBundles).toBe(4);
    expect(result.bundles).toEqual([
      { size: 20, quantity: 1 },
      { size: 9, quantity: 2 },
      { size: 6, quantity: 1 },
    ]);
  });

  it("[4, 6], group 7 -> impossible", () => {
    const result = calculateMinimumBundles([4, 6], 7);
    expect(result.possible).toBe(false);
    expect(result.groupSize).toBe(7);
    expect(result.totalBundles).toBe(0);
    expect(result.bundles).toEqual([]);
  });

  it("handles edge case: group size 1 with size 1 bundle", () => {
    const result = calculateMinimumBundles([1, 5, 10], 1);
    expect(result.possible).toBe(true);
    expect(result.totalBundles).toBe(1);
    expect(result.bundles).toEqual([{ size: 1, quantity: 1 }]);
  });

  it("handles large group size 10000 efficiently", () => {
    const start = performance.now();
    const result = calculateMinimumBundles([2, 5, 10, 25, 50, 100], 10000);
    const duration = performance.now() - start;

    expect(result.possible).toBe(true);
    expect(result.totalBundles).toBe(100);
    expect(result.bundles).toEqual([{ size: 100, quantity: 100 }]);
    // Must be fast (< 100ms)
    expect(duration).toBeLessThan(150);
  });

  it("safely ignores duplicate and invalid bundle sizes", () => {
    // 2 is duplicated, 0 and negative are invalid
    const result = calculateMinimumBundles([2, 2, 5, 0, -3], 11);
    expect(result.possible).toBe(true);
    expect(result.totalBundles).toBe(4);
    expect(result.bundles).toEqual([
      { size: 5, quantity: 1 },
      { size: 2, quantity: 3 },
    ]);
  });

  it("throws error on invalid group size", () => {
    expect(() => calculateMinimumBundles([2, 5], 0)).toThrow();
    expect(() => calculateMinimumBundles([2, 5], -5)).toThrow();
    expect(() => calculateMinimumBundles([2, 5], 2.5)).toThrow();
  });

  it("returns impossible when bundle sizes list is empty", () => {
    const result = calculateMinimumBundles([], 10);
    expect(result.possible).toBe(false);
    expect(result.totalBundles).toBe(0);
    expect(result.bundles).toEqual([]);
  });

  it("verifies the algorithm returns the strictly minimal bundle count (not greedy)", () => {
    // For [1, 5, 6] and target 10:
    // Greedy would choose 6 + 1 + 1 + 1 + 1 = 5 bundles
    // Optimal is 5 + 5 = 2 bundles
    const result = calculateMinimumBundles([1, 5, 6], 10);
    expect(result.possible).toBe(true);
    expect(result.totalBundles).toBe(2);
    expect(result.bundles).toEqual([{ size: 5, quantity: 2 }]);
  });
});
