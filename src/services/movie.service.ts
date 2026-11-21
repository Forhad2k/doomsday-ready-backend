import { db } from "../prisma/db.js";
import type {
  CreateMovieInput,
  UpdateMovieInput,
} from "../validators/movie.validator.js";
import { AppError } from "../middlewares/error.middleware.js";
import {
  computeRewatchOrder,
  wouldCreateCycle,
  CircularDependencyError,
  type MovieNode,
  type RewatchOrderResult,
} from "../utils/movie-graph.js";

export interface MovieResponse {
  id: string;
  title: string;
  releaseYear: number;
  runtime: number;
  watched: boolean;
  prerequisites: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class MovieService {
  async getAllMovies(): Promise<MovieResponse[]> {
    const movies = await db.orm.public.Movie.orderBy((m) =>
      m.releaseYear.asc()
    ).all();
    const dependencies = await db.orm.public.MovieDependency.all();

    const prereqMap = new Map<string, string[]>();
    for (const dep of dependencies) {
      if (!prereqMap.has(dep.movieId)) {
        prereqMap.set(dep.movieId, []);
      }
      prereqMap.get(dep.movieId)!.push(dep.prerequisiteId);
    }

    return movies.map((m) => ({
      id: m.id,
      title: m.title,
      releaseYear: m.releaseYear,
      runtime: m.runtime,
      watched: m.watched,
      prerequisites: prereqMap.get(m.id) || [],
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
  }

  async getMovieById(id: string): Promise<MovieResponse> {
    const movie = await db.orm.public.Movie.first({ id });
    if (!movie) {
      throw new AppError(404, "Movie not found", "NOT_FOUND");
    }

    const dependencies = await db.orm.public.MovieDependency.where({
      movieId: id,
    }).all();

    return {
      id: movie.id,
      title: movie.title,
      releaseYear: movie.releaseYear,
      runtime: movie.runtime,
      watched: movie.watched,
      prerequisites: dependencies.map((d) => d.prerequisiteId),
      createdAt: movie.createdAt,
      updatedAt: movie.updatedAt,
    };
  }

  async createMovie(input: CreateMovieInput): Promise<MovieResponse> {
    // 1. Check title uniqueness
    const existing = await db.orm.public.Movie.first({ title: input.title });
    if (existing) {
      throw new AppError(
        409,
        `A movie with the title "${input.title}" already exists.`,
        "DUPLICATE_RESOURCE"
      );
    }

    // 2. Validate prerequisites exist
    const uniquePrereqs = Array.from(new Set(input.prerequisites));
    if (uniquePrereqs.length > 0) {
      const allMovies = await db.orm.public.Movie.all();
      const existingIds = new Set(allMovies.map((m) => m.id));

      for (const prereqId of uniquePrereqs) {
        if (!existingIds.has(prereqId)) {
          throw new AppError(
            400,
            `Prerequisite movie with ID "${prereqId}" does not exist.`,
            "INVALID_PREREQUISITE"
          );
        }
      }
    }

    // 3. Create movie
    const movie = await db.orm.public.Movie.create({
      title: input.title,
      releaseYear: input.releaseYear,
      runtime: input.runtime,
      watched: input.watched ?? false,
    });

    // 4. Create dependencies
    for (const prereqId of uniquePrereqs) {
      await db.orm.public.MovieDependency.create({
        movieId: movie.id,
        prerequisiteId: prereqId,
      });
    }

    return {
      id: movie.id,
      title: movie.title,
      releaseYear: movie.releaseYear,
      runtime: movie.runtime,
      watched: movie.watched,
      prerequisites: uniquePrereqs,
      createdAt: movie.createdAt,
      updatedAt: movie.updatedAt,
    };
  }

  async updateMovie(
    id: string,
    input: UpdateMovieInput
  ): Promise<MovieResponse> {
    const movie = await db.orm.public.Movie.first({ id });
    if (!movie) {
      throw new AppError(404, "Movie not found", "NOT_FOUND");
    }

    // 1. Check title uniqueness if changing title
    if (input.title && input.title !== movie.title) {
      const existing = await db.orm.public.Movie.first({ title: input.title });
      if (existing) {
        throw new AppError(
          409,
          `A movie with the title "${input.title}" already exists.`,
          "DUPLICATE_RESOURCE"
        );
      }
    }

    // 2. If prerequisites are updated, validate & check circular dependencies
    if (input.prerequisites !== undefined) {
      const uniquePrereqs = Array.from(new Set(input.prerequisites));

      // Self-dependency check
      if (uniquePrereqs.includes(id)) {
        throw new CircularDependencyError();
      }

      // Check all prerequisites exist
      const allMovies = await db.orm.public.Movie.all();
      const existingIds = new Set(allMovies.map((m) => m.id));
      for (const p of uniquePrereqs) {
        if (!existingIds.has(p)) {
          throw new AppError(
            400,
            `Prerequisite movie with ID "${p}" does not exist.`,
            "INVALID_PREREQUISITE"
          );
        }
      }

      // Check for cycles in the dependency graph
      const allDeps = await db.orm.public.MovieDependency.all();
      const graph = new Map<string, string[]>();
      for (const d of allDeps) {
        if (d.movieId === id) continue; // replace current movie's prereqs with the new ones
        if (!graph.has(d.movieId)) graph.set(d.movieId, []);
        graph.get(d.movieId)!.push(d.prerequisiteId);
      }

      if (wouldCreateCycle(graph, id, uniquePrereqs)) {
        throw new CircularDependencyError();
      }

      // Delete old dependencies and insert new ones
      await db.orm.public.MovieDependency.where({ movieId: id }).deleteAll();
      for (const prereqId of uniquePrereqs) {
        await db.orm.public.MovieDependency.create({
          movieId: id,
          prerequisiteId: prereqId,
        });
      }
    }

    // 3. Update movie properties
    const updateData: {
      title?: string;
      releaseYear?: number;
      runtime?: number;
      watched?: boolean;
    } = {};

    if (input.title !== undefined) updateData.title = input.title;
    if (input.releaseYear !== undefined) updateData.releaseYear = input.releaseYear;
    if (input.runtime !== undefined) updateData.runtime = input.runtime;
    if (input.watched !== undefined) updateData.watched = input.watched;

    if (Object.keys(updateData).length > 0) {
      await db.orm.public.Movie.where({ id }).update(updateData);
    }

    return this.getMovieById(id);
  }

  async getRewatchOrder(targetMovieId: string): Promise<RewatchOrderResult> {
    const target = await db.orm.public.Movie.first({ id: targetMovieId });
    if (!target) {
      throw new AppError(404, "Movie not found", "NOT_FOUND");
    }

    const allMovies = await db.orm.public.Movie.all();
    const allDeps = await db.orm.public.MovieDependency.all();

    const prereqMap = new Map<string, string[]>();
    for (const d of allDeps) {
      if (!prereqMap.has(d.movieId)) prereqMap.set(d.movieId, []);
      prereqMap.get(d.movieId)!.push(d.prerequisiteId);
    }

    const nodes: MovieNode[] = allMovies.map((m) => ({
      id: m.id,
      title: m.title,
      releaseYear: m.releaseYear,
      runtime: m.runtime,
      watched: m.watched,
      prerequisiteIds: prereqMap.get(m.id) || [],
    }));

    return computeRewatchOrder(targetMovieId, nodes);
  }
}

export const movieService = new MovieService();
