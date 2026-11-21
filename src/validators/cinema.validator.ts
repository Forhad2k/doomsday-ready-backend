import { z } from "zod";

export const createCinemaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Cinema name cannot be empty"),
  bundleSizes: z
    .array(
      z
        .number()
        .int("Bundle size must be an integer")
        .min(1, "Bundle size must be between 1 and 500")
        .max(500, "Bundle size must be between 1 and 500")
    )
    .min(1, "At least 1 bundle size is required")
    .max(10, "At most 10 bundle sizes are allowed")
    .refine(
      (sizes) => new Set(sizes).size === sizes.length,
      "Bundle sizes must contain distinct values"
    ),
});

export const bookingQuerySchema = z.object({
  groupSize: z
    .string()
    .refine((val) => /^\d+$/.test(val), "groupSize must be a positive integer")
    .transform((val) => parseInt(val, 10))
    .refine(
      (val) => val >= 1 && val <= 10000,
      "Group size must be between 1 and 10000"
    ),
});

export type CreateCinemaInput = z.infer<typeof createCinemaSchema>;
export type BookingQueryInput = z.infer<typeof bookingQuerySchema>;
