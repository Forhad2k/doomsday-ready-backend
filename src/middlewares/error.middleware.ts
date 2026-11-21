import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { CircularDependencyError } from "../utils/movie-graph.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // 1. Circular dependency error -> HTTP 409
  if (err instanceof CircularDependencyError) {
    res.status(409).json({
      success: false,
      code: "CIRCULAR_DEPENDENCY",
      message: err.message,
    });
    return;
  }

  // 2. Zod validation error -> HTTP 400
  if (err instanceof ZodError || (err as { name?: string })?.name === "ZodError") {
    const zodErr = err as ZodError;
    const issues =
      zodErr.issues ||
      (zodErr as unknown as { errors?: Array<{ path: (string | number)[]; message: string }> }).errors ||
      [];

    res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      errors: issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // 3. Custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
    return;
  }

  // 4. Postgres Unique constraint violation
  const anyErr = err as { code?: string; message?: string; detail?: string };
  if (anyErr?.code === "23505" || anyErr?.message?.includes("unique constraint")) {
    res.status(409).json({
      success: false,
      code: "DUPLICATE_RESOURCE",
      message: "A resource with these unique properties already exists.",
    });
    return;
  }

  // 5. Default 500 error (safe for production: no stack traces)
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
  });
}
