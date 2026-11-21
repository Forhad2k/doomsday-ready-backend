import type { Request, Response, NextFunction } from "express";
import { movieService } from "../services/movie.service.js";
import {
  createMovieSchema,
  updateMovieSchema,
} from "../validators/movie.validator.js";

export class MovieController {
  async getAllMovies(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const movies = await movieService.getAllMovies();
      res.status(200).json({
        success: true,
        data: movies,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMovieById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params["id"] as string;
      const movie = await movieService.getMovieById(id);
      res.status(200).json({
        success: true,
        data: movie,
      });
    } catch (error) {
      next(error);
    }
  }

  async createMovie(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsed = createMovieSchema.parse(req.body);
      const movie = await movieService.createMovie(parsed);
      res.status(201).json({
        success: true,
        data: movie,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMovie(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params["id"] as string;
      const parsed = updateMovieSchema.parse(req.body);
      const movie = await movieService.updateMovie(id, parsed);
      res.status(200).json({
        success: true,
        data: movie,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRewatchOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params["id"] as string;
      const plan = await movieService.getRewatchOrder(id);
      res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const movieController = new MovieController();
