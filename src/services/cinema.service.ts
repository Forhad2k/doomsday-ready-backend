import { db } from "../prisma/db.js";
import type { CreateCinemaInput } from "../validators/cinema.validator.js";
import { AppError } from "../middlewares/error.middleware.js";
import {
  calculateMinimumBundles,
  type CinemaBookingResult,
} from "../utils/cinema-bundles.js";

export interface CinemaResponse {
  id: string;
  name: string;
  bundleSizes: number[];
  createdAt: Date;
  updatedAt: Date;
}

export class CinemaService {
  async getAllCinemas(): Promise<CinemaResponse[]> {
    const cinemas = await db.orm.public.Cinema.orderBy((c) =>
      c.name.asc()
    ).all();
    const bundles = await db.orm.public.CinemaBundle.all();

    const bundleMap = new Map<string, number[]>();
    for (const b of bundles) {
      if (!bundleMap.has(b.cinemaId)) {
        bundleMap.set(b.cinemaId, []);
      }
      bundleMap.get(b.cinemaId)!.push(b.size);
    }

    return cinemas.map((c) => ({
      id: c.id,
      name: c.name,
      bundleSizes: (bundleMap.get(c.id) || []).sort((a, b) => a - b),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async getCinemaById(id: string): Promise<CinemaResponse> {
    const cinema = await db.orm.public.Cinema.first({ id });
    if (!cinema) {
      throw new AppError(404, "Cinema not found", "NOT_FOUND");
    }

    const bundles = await db.orm.public.CinemaBundle.where({
      cinemaId: id,
    }).all();

    return {
      id: cinema.id,
      name: cinema.name,
      bundleSizes: bundles.map((b) => b.size).sort((a, b) => a - b),
      createdAt: cinema.createdAt,
      updatedAt: cinema.updatedAt,
    };
  }

  async createCinema(input: CreateCinemaInput): Promise<CinemaResponse> {
    // 1. Check cinema name uniqueness
    const existing = await db.orm.public.Cinema.first({ name: input.name });
    if (existing) {
      throw new AppError(
        409,
        `A cinema with the name "${input.name}" already exists.`,
        "DUPLICATE_RESOURCE"
      );
    }

    // 2. Create cinema
    const cinema = await db.orm.public.Cinema.create({
      name: input.name,
    });

    // 3. Create bundle sizes
    const distinctSizes = Array.from(new Set(input.bundleSizes)).sort(
      (a, b) => a - b
    );
    for (const size of distinctSizes) {
      await db.orm.public.CinemaBundle.create({
        cinemaId: cinema.id,
        size,
      });
    }

    return {
      id: cinema.id,
      name: cinema.name,
      bundleSizes: distinctSizes,
      createdAt: cinema.createdAt,
      updatedAt: cinema.updatedAt,
    };
  }

  async getBookingQuote(
    cinemaId: string,
    groupSize: number
  ): Promise<CinemaBookingResult> {
    const cinema = await this.getCinemaById(cinemaId);
    return calculateMinimumBundles(cinema.bundleSizes, groupSize);
  }
}

export const cinemaService = new CinemaService();
