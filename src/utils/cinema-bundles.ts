export interface BundleQuote {
  size: number;
  quantity: number;
}

export interface CinemaBookingResult {
  groupSize: number;
  possible: boolean;
  totalBundles: number;
  bundles: BundleQuote[];
}

/**
 * Calculates the minimum number of seat bundles using unbounded coin-change DP.
 * Complexity:
 * - Time: O(groupSize * numberOfBundleSizes)
 * - Space: O(groupSize)
 */
export function calculateMinimumBundles(
  bundleSizes: number[],
  groupSize: number
): CinemaBookingResult {
  if (groupSize < 1 || !Number.isInteger(groupSize)) {
    throw new Error("Group size must be a positive integer.");
  }

  // Clean, deduplicate, and filter positive bundle sizes
  const distinctSizes = Array.from(new Set(bundleSizes))
    .filter((s) => Number.isInteger(s) && s > 0)
    .sort((a, b) => b - a); // sort descending

  if (distinctSizes.length === 0) {
    return {
      groupSize,
      possible: false,
      totalBundles: 0,
      bundles: [],
    };
  }

  const dp = new Array<number>(groupSize + 1).fill(Infinity);
  const previous = new Array<number | null>(groupSize + 1).fill(null);

  dp[0] = 0;

  for (let s = 1; s <= groupSize; s++) {
    for (const size of distinctSizes) {
      if (s >= size) {
        const prevCount = dp[s - size];
        const currentCount = dp[s];
        if (
          prevCount !== undefined &&
          prevCount !== Infinity &&
          currentCount !== undefined &&
          prevCount + 1 < currentCount
        ) {
          dp[s] = prevCount + 1;
          previous[s] = size;
        }
      }
    }
  }

  const total = dp[groupSize];
  if (total === undefined || total === Infinity) {
    return {
      groupSize,
      possible: false,
      totalBundles: 0,
      bundles: [],
    };
  }

  // Reconstruct the bundle counts from target groupSize down to 0
  const bundleCountMap = new Map<number, number>();
  let currentSeats = groupSize;

  while (currentSeats > 0) {
    const size = previous[currentSeats];
    if (size === undefined || size === null) break;
    bundleCountMap.set(size, (bundleCountMap.get(size) || 0) + 1);
    currentSeats -= size;
  }

  const bundles: BundleQuote[] = Array.from(bundleCountMap.entries())
    .map(([size, quantity]) => ({ size, quantity }))
    .sort((a, b) => b.size - a.size);

  return {
    groupSize,
    possible: true,
    totalBundles: total,
    bundles,
  };
}
