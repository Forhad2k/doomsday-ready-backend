import { z } from "zod";

export const createMovieSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty"),
  releaseYear: z
    .number()
    .int("Release year must be an integer")
    .positive("Release year must be a positive integer"),
  runtime: z
    .number()
    .int("Runtime must be an integer")
    .min(1, "Runtime must be between 1 and 300 minutes")
    .max(300, "Runtime must be between 1 and 300 minutes"),
  watched: z.boolean().optional().default(false),
  prerequisites: z.array(z.string().trim().min(1)).optional().default([]),
});

export const updateMovieSchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
    releaseYear: z
      .number()
      .int("Release year must be an integer")
      .positive("Release year must be a positive integer")
      .optional(),
    runtime: z
      .number()
      .int("Runtime must be an integer")
      .min(1, "Runtime must be between 1 and 300 minutes")
      .max(300, "Runtime must be between 1 and 300 minutes")
      .optional(),
    watched: z.boolean().optional(),
    prerequisites: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
