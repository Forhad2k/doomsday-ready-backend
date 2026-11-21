import { db } from "./db.js";

interface MovieSeed {
  title: string;
  releaseYear: number;
  runtime: number;
  watched: boolean;
  prerequisites: string[]; // Titles of prerequisites
}

const seedMovies: MovieSeed[] = [
  {
    title: "Iron Man",
    releaseYear: 2008,
    runtime: 126,
    watched: false,
    prerequisites: [],
  },
  {
    title: "Captain America: The First Avenger",
    releaseYear: 2011,
    runtime: 124,
    watched: false,
    prerequisites: [],
  },
  {
    title: "The Avengers",
    releaseYear: 2012,
    runtime: 143,
    watched: false,
    prerequisites: ["Iron Man", "Captain America: The First Avenger"],
  },
  {
    title: "Captain America: Civil War",
    releaseYear: 2016,
    runtime: 147,
    watched: false,
    prerequisites: ["The Avengers"],
  },
  {
    title: "Thor: Ragnarok",
    releaseYear: 2017,
    runtime: 130,
    watched: false,
    prerequisites: [],
  },
  {
    title: "Avengers: Infinity War",
    releaseYear: 2018,
    runtime: 149,
    watched: false,
    prerequisites: ["Captain America: Civil War", "Thor: Ragnarok"],
  },
  {
    title: "Avengers: Endgame",
    releaseYear: 2019,
    runtime: 181,
    watched: false,
    prerequisites: ["Avengers: Infinity War"],
  },
  {
    title: "Avengers: Doomsday",
    releaseYear: 2026,
    runtime: 180,
    watched: false,
    prerequisites: ["Avengers: Endgame"],
  },
];

const seedCinemas = [
  { name: "Star Cineplex", bundleSizes: [2, 5] },
  { name: "Cinema Hall A", bundleSizes: [1, 3, 4] },
  { name: "Cinema Hall B", bundleSizes: [6, 9, 20] },
  { name: "Cinema Hall C", bundleSizes: [4, 6] },
];

export async function runSeed(): Promise<void> {
  console.log("🌱 Starting database seeding...");

  // 1. Seed Movies (idempotent)
  const movieTitleToId = new Map<string, string>();

  for (const m of seedMovies) {
    let existing = await db.orm.public.Movie.first({ title: m.title });
    if (!existing) {
      existing = await db.orm.public.Movie.create({
        title: m.title,
        releaseYear: m.releaseYear,
        runtime: m.runtime,
        watched: m.watched,
      });
      console.log(`  + Created movie: ${m.title}`);
    } else {
      console.log(`  ~ Movie already exists: ${m.title}`);
    }
    movieTitleToId.set(m.title, existing.id);
  }

  // 2. Seed Movie Dependencies (idempotent)
  for (const m of seedMovies) {
    const movieId = movieTitleToId.get(m.title)!;
    for (const prereqTitle of m.prerequisites) {
      const prereqId = movieTitleToId.get(prereqTitle);
      if (!prereqId) {
        console.warn(`  ! Prerequisite not found: ${prereqTitle}`);
        continue;
      }

      const existingDep = await db.orm.public.MovieDependency.first({
        movieId,
        prerequisiteId: prereqId,
      });

      if (!existingDep) {
        await db.orm.public.MovieDependency.create({
          movieId,
          prerequisiteId: prereqId,
        });
        console.log(`  + Dependency added: "${m.title}" -> "${prereqTitle}"`);
      }
    }
  }

  // 3. Seed Cinemas and Bundle Sizes (idempotent)
  for (const c of seedCinemas) {
    let cinema = await db.orm.public.Cinema.first({ name: c.name });
    if (!cinema) {
      cinema = await db.orm.public.Cinema.create({ name: c.name });
      console.log(`  + Created cinema: ${c.name}`);
    } else {
      console.log(`  ~ Cinema already exists: ${c.name}`);
    }

    for (const size of c.bundleSizes) {
      const existingBundle = await db.orm.public.CinemaBundle.first({
        cinemaId: cinema.id,
        size,
      });

      if (!existingBundle) {
        await db.orm.public.CinemaBundle.create({
          cinemaId: cinema.id,
          size,
        });
        console.log(`  + Added bundle size ${size} to cinema "${c.name}"`);
      }
    }
  }

  console.log("✅ Database seeding complete!");
}

// Run standalone if executed directly
if (process.argv[1]?.endsWith("seed.ts")) {
  runSeed()
    .then(async () => {
      await db.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("❌ Seed failed:", err);
      await db.close();
      process.exit(1);
    });
}
