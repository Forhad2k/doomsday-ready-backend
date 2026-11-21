import type { Request, Response, NextFunction } from "express";
import { cinemaService } from "../services/cinema.service.js";
import {
  createCinemaSchema,
  bookingQuerySchema,
} from "../validators/cinema.validator.js";

export class CinemaController {
  async getAllCinemas(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const cinemas = await cinemaService.getAllCinemas();
      res.status(200).json({
        success: true,
        data: cinemas,
      });
    } catch (error) {
      next(error);
    }
  }

  async createCinema(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsed = createCinemaSchema.parse(req.body);
      const cinema = await cinemaService.createCinema(parsed);
      res.status(201).json({
        success: true,
        data: cinema,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookingQuote(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params["id"] as string;
      const query = bookingQuerySchema.parse(req.query);
      const quote = await cinemaService.getBookingQuote(id, query.groupSize);
      res.status(200).json({
        success: true,
        data: quote,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const cinemaController = new CinemaController();
