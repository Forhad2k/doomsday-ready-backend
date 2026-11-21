import { describe, it, expect } from "vitest";
import {
  computeRewatchOrder,
  wouldCreateCycle,
  CircularDependencyError,
  type MovieNode,
} from "../../src/utils/movie-graph.js";

describe("Movie Graph Algorithm (Topological Sort & Cycle Detection)", () => {
  const sampleMovies: MovieNode[] = [
    {
      id: "1",
      title: "Iron Man",
      releaseYear: 2008,
      runtime: 126,
      watched: true,
      prerequisiteIds: [],
    },
    {
      id: "2",
      title: "Captain America: The First Avenger",
      releaseYear: 2011,
      runtime: 124,
      watched: true,
      prerequisiteIds: [],
    },
    {
      id: "3",
      title: "The Avengers",
      releaseYear: 2012,
      runtime: 143,
      watched: true,
      prerequisiteIds: ["1", "2"],
    },
    {
      id: "4",
      title: "Captain America: Civil War",
      releaseYear: 2016,
      runtime: 147,
      watched: true,
      prerequisiteIds: ["3"],
    },
    {
      id: "5",
      title: "Thor: Ragnarok",
      releaseYear: 2017,
      runtime: 130,
      watched: false,
      prerequisiteIds: [],
    },
    {
      id: "6",
      title: "Avengers: Infinity War",
      releaseYear: 2018,
      runtime: 149,
      watched: false,
      prerequisiteIds: ["4", "5"],
    },
    {
      id: "7",
      title: "Avengers: Endgame",
      releaseYear: 2019,
      runtime: 181,
      watched: false,
      prerequisiteIds: ["6"],
    },
    {
      id: "8",
      title: "Avengers: Doomsday",
      releaseYear: 2026,
      runtime: 180,
      watched: false,
      prerequisiteIds: ["7"],
    },
  ];

  it("movie with no prerequisites returns an empty list", () => {
    const result = computeRewatchOrder("1", sampleMovies);
    expect(result.movies).toEqual([]);
    expect(result.totalMovies).toBe(0);
    expect(result.watchedCount).toBe(0);
    expect(result.unwatchedCount).toBe(0);
    expect(result.unwatchedRuntime).toBe(0);
    expect(result.target.title).toBe("Iron Man");
  });

  it("direct prerequisites are returned", () => {
    const result = computeRewatchOrder("3", sampleMovies);
    expect(result.totalMovies).toBe(2);
    const titles = result.movies.map((m) => m.title);
    expect(titles).toContain("Iron Man");
    expect(titles).toContain("Captain America: The First Avenger");
    expect(titles).not.toContain("The Avengers");
  });

  it("transitive prerequisites are returned and target movie is excluded", () => {
    const result = computeRewatchOrder("8", sampleMovies);
    expect(result.target.title).toBe("Avengers: Doomsday");
    expect(result.totalMovies).toBe(7);
    const titles = result.movies.map((m) => m.title);
    expect(titles).not.toContain("Avengers: Doomsday");
    expect(titles).toEqual([
      "Iron Man",
      "Captain America: The First Avenger",
      "The Avengers",
      "Captain America: Civil War",
      "Thor: Ragnarok",
      "Avengers: Infinity War",
      "Avengers: Endgame",
    ]);
  });

  it("each movie appears exactly once (diamond dependency)", () => {
    const diamondMovies: MovieNode[] = [
      {
        id: "c",
        title: "Base Movie C",
        releaseYear: 2010,
        runtime: 100,
        watched: false,
        prerequisiteIds: [],
      },
      {
        id: "a",
        title: "Movie A",
        releaseYear: 2012,
        runtime: 110,
        watched: false,
        prerequisiteIds: ["c"],
      },
      {
        id: "b",
        title: "Movie B",
        releaseYear: 2013,
        runtime: 120,
        watched: false,
        prerequisiteIds: ["c"],
      },
      {
        id: "d",
        title: "Target D",
        releaseYear: 2015,
        runtime: 130,
        watched: false,
        prerequisiteIds: ["a", "b"],
      },
    ];

    const result = computeRewatchOrder("d", diamondMovies);
    const ids = result.movies.map((m) => m.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    expect(ids.indexOf("c")).toBeLessThan(ids.indexOf("a"));
    expect(ids.indexOf("c")).toBeLessThan(ids.indexOf("b"));
  });

  it("produces a correct topological order where prerequisites always precede dependents", () => {
    const result = computeRewatchOrder("8", sampleMovies);
    const idIndex = new Map(result.movies.map((m, idx) => [m.id, idx]));

    for (const movie of result.movies) {
      const original = sampleMovies.find((m) => m.id === movie.id)!;
      for (const prereqId of original.prerequisiteIds) {
        expect(idIndex.get(prereqId)).toBeLessThan(idIndex.get(movie.id)!);
      }
    }
  });

  it("calculates watched count, unwatched count, and unwatched runtime accurately", () => {
    const result = computeRewatchOrder("8", sampleMovies);
    expect(result.watchedCount).toBe(4);
    expect(result.unwatchedCount).toBe(3);
    expect(result.unwatchedRuntime).toBe(460);
    expect(result.totalMovies).toBe(7);
  });

  it("direct circular dependency is detected and rejected", () => {
    const graph = new Map<string, string[]>([
      ["A", ["B"]],
      ["B", []],
    ]);
    const cycle = wouldCreateCycle(graph, "B", ["A"]);
    expect(cycle).toBe(true);

    const selfCycle = wouldCreateCycle(graph, "A", ["A"]);
    expect(selfCycle).toBe(true);
  });

  it("indirect circular dependency is detected and rejected", () => {
    const graph = new Map<string, string[]>([
      ["A", ["B"]],
      ["B", ["C"]],
      ["C", []],
    ]);
    const cycle = wouldCreateCycle(graph, "C", ["A"]);
    expect(cycle).toBe(true);
  });

  it("computeRewatchOrder throws CircularDependencyError on cyclic graphs", () => {
    const cyclicMovies: MovieNode[] = [
      {
        id: "1",
        title: "Movie 1",
        releaseYear: 2020,
        runtime: 100,
        watched: false,
        prerequisiteIds: ["2"],
      },
      {
        id: "2",
        title: "Movie 2",
        releaseYear: 2021,
        runtime: 100,
        watched: false,
        prerequisiteIds: ["1"],
      },
    ];

    expect(() => computeRewatchOrder("1", cyclicMovies)).toThrow(CircularDependencyError);
  });
});
