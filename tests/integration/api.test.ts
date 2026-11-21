import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { db } from "../../src/prisma/db.js";

describe("Doomsday Ready API Integration Tests", () => {
  let createdMovieId: string;
  let doomsdayMovieId: string;
  let ironManMovieId: string;
  let starCineplexId: string;
  let cinemaHallCId: string;
  const uniqueSuffix = Date.now().toString().slice(-6);

  afterAll(async () => {
    // Cleanup any test-specific entities
    if (createdMovieId) {
      await db.orm.public.Movie.where({ id: createdMovieId }).delete();
    }
    await db.close();
  });

  it("GET /health returns 200 OK", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  describe("Movies API", () => {
    it("GET /api/movies returns all seeded movies", async () => {
      const res = await request(app).get("/api/movies");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(8);

      const doomsday = res.body.data.find(
        (m: { title: string }) => m.title === "Avengers: Doomsday"
      );
      expect(doomsday).toBeDefined();
      doomsdayMovieId = doomsday.id;

      const ironMan = res.body.data.find(
        (m: { title: string }) => m.title === "Iron Man"
      );
      expect(ironMan).toBeDefined();
      ironManMovieId = ironMan.id;
    });

    it("POST /api/movies creates a new movie with prerequisites", async () => {
      const testTitle = `Doctor Strange Multiverse ${uniqueSuffix}`;
      const res = await request(app)
        .post("/api/movies")
        .send({
          title: testTitle,
          releaseYear: 2022,
          runtime: 126,
          watched: false,
          prerequisites: [ironManMovieId],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(testTitle);
      expect(res.body.data.prerequisites).toEqual([ironManMovieId]);
      createdMovieId = res.body.data.id;
    });

    it("POST /api/movies rejects duplicate title with 409", async () => {
      const res = await request(app).post("/api/movies").send({
        title: "Iron Man",
        releaseYear: 2008,
        runtime: 126,
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("DUPLICATE_RESOURCE");
    });

    it("POST /api/movies rejects invalid inputs with 400", async () => {
      const res = await request(app).post("/api/movies").send({
        title: "",
        releaseYear: -2008,
        runtime: 400, // max is 300
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("POST /api/movies rejects non-existent prerequisite with 400", async () => {
      const res = await request(app)
        .post("/api/movies")
        .send({
          title: `Non Existent Prereq Movie ${uniqueSuffix}`,
          releaseYear: 2024,
          runtime: 120,
          prerequisites: ["00000000-0000-0000-0000-000000000000"],
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_PREREQUISITE");
    });

    it("PATCH /api/movies/:id updates movie watched status and runtime", async () => {
      const res = await request(app)
        .patch(`/api/movies/${createdMovieId}`)
        .send({
          watched: true,
          runtime: 130,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.watched).toBe(true);
      expect(res.body.data.runtime).toBe(130);
    });

    it("PATCH /api/movies/:id rejects self-dependency with 409 CIRCULAR_DEPENDENCY", async () => {
      const res = await request(app)
        .patch(`/api/movies/${createdMovieId}`)
        .send({
          prerequisites: [createdMovieId],
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CIRCULAR_DEPENDENCY");
    });

    it("PATCH /api/movies/:id rejects indirect circular dependency with 409", async () => {
      // Iron Man -> (attempt to add createdMovieId as prereq, but createdMovieId depends on Iron Man)
      const res = await request(app)
        .patch(`/api/movies/${ironManMovieId}`)
        .send({
          prerequisites: [createdMovieId],
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CIRCULAR_DEPENDENCY");
    });

    it("PATCH /api/movies/:id returns 404 for unknown movie", async () => {
      const res = await request(app)
        .patch("/api/movies/00000000-0000-0000-0000-000000000000")
        .send({ watched: true });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("GET /api/movies/:id/rewatch-order returns correct topological rewatch plan", async () => {
      const res = await request(app).get(
        `/api/movies/${doomsdayMovieId}/rewatch-order`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.target.title).toBe("Avengers: Doomsday");
      expect(res.body.data.totalMovies).toBe(7);
      expect(res.body.data.movies.map((m: { title: string }) => m.title)).toEqual([
        "Iron Man",
        "Captain America: The First Avenger",
        "The Avengers",
        "Captain America: Civil War",
        "Thor: Ragnarok",
        "Avengers: Infinity War",
        "Avengers: Endgame",
      ]);
    });

    it("GET /api/movies/:id/rewatch-order returns empty list for movie with no prerequisites", async () => {
      const res = await request(app).get(
        `/api/movies/${ironManMovieId}/rewatch-order`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.target.title).toBe("Iron Man");
      expect(res.body.data.totalMovies).toBe(0);
      expect(res.body.data.movies).toEqual([]);
    });

    it("GET /api/movies/:id/rewatch-order returns 404 for unknown movie", async () => {
      const res = await request(app).get(
        "/api/movies/00000000-0000-0000-0000-000000000000/rewatch-order"
      );

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Cinemas & Booking API", () => {
    it("GET /api/cinemas returns all seeded cinemas", async () => {
      const res = await request(app).get("/api/cinemas");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);

      const star = res.body.data.find(
        (c: { name: string }) => c.name === "Star Cineplex"
      );
      expect(star).toBeDefined();
      expect(star.bundleSizes).toEqual([2, 5]);
      starCineplexId = star.id;

      const hallC = res.body.data.find(
        (c: { name: string }) => c.name === "Cinema Hall C"
      );
      expect(hallC).toBeDefined();
      expect(hallC.bundleSizes).toEqual([4, 6]);
      cinemaHallCId = hallC.id;
    });

    it("POST /api/cinemas creates a new cinema", async () => {
      const res = await request(app)
        .post("/api/cinemas")
        .send({
          name: `Starlight IMAX ${uniqueSuffix}`,
          bundleSizes: [3, 8, 15],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(`Starlight IMAX ${uniqueSuffix}`);
      expect(res.body.data.bundleSizes).toEqual([3, 8, 15]);

      // Cleanup
      await db.orm.public.Cinema.where({ id: res.body.data.id }).delete();
    });

    it("POST /api/cinemas rejects duplicate cinema name with 409", async () => {
      const res = await request(app).post("/api/cinemas").send({
        name: "Star Cineplex",
        bundleSizes: [2, 5],
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("DUPLICATE_RESOURCE");
    });

    it("POST /api/cinemas rejects duplicate bundle sizes with 400", async () => {
      const res = await request(app).post("/api/cinemas").send({
        name: `Invalid Bundles Cinema ${uniqueSuffix}`,
        bundleSizes: [2, 2, 5],
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("GET /api/cinemas/:id/booking calculates optimal bundles (group 11 -> 1x5, 3x2)", async () => {
      const res = await request(app).get(
        `/api/cinemas/${starCineplexId}/booking?groupSize=11`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.possible).toBe(true);
      expect(res.body.data.totalBundles).toBe(4);
      expect(res.body.data.bundles).toEqual([
        { size: 5, quantity: 1 },
        { size: 2, quantity: 3 },
      ]);
    });

    it("GET /api/cinemas/:id/booking returns impossible for odd group on even bundles", async () => {
      const res = await request(app).get(
        `/api/cinemas/${cinemaHallCId}/booking?groupSize=7`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.possible).toBe(false);
      expect(res.body.data.totalBundles).toBe(0);
      expect(res.body.data.bundles).toEqual([]);
    });

    it("GET /api/cinemas/:id/booking rejects group size > 10000 with 400", async () => {
      const res = await request(app).get(
        `/api/cinemas/${starCineplexId}/booking?groupSize=10001`
      );

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("GET /api/cinemas/:id/booking returns 404 for unknown cinema", async () => {
      const res = await request(app).get(
        "/api/cinemas/00000000-0000-0000-0000-000000000000/booking?groupSize=5"
      );

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
