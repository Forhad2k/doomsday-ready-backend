export interface MovieNode {
  id: string;
  title: string;
  releaseYear: number;
  runtime: number;
  watched: boolean;
  prerequisiteIds: string[];
}

export interface RewatchOrderResult {
  target: {
    id: string;
    title: string;
  };
  movies: Array<{
    id: string;
    title: string;
    releaseYear: number;
    runtime: number;
    watched: boolean;
  }>;
  totalMovies: number;
  watchedCount: number;
  unwatchedCount: number;
  unwatchedRuntime: number;
}

export class CircularDependencyError extends Error {
  readonly code = "CIRCULAR_DEPENDENCY";
  constructor(message = "This dependency would create a circular relationship.") {
    super(message);
    this.name = "CircularDependencyError";
  }
}

/**
 * Checks if adding `newPrerequisiteIds` for `movieId` would introduce a cycle.
 * Graph representation: movieId -> prerequisiteIds.
 * Adding an edge from movieId -> prerequisiteId means prerequisiteId must be watched before movieId.
 * A cycle is formed if any prerequisiteId can already reach movieId through prerequisite edges,
 * or if prerequisiteId === movieId (self-loop).
 */
export function wouldCreateCycle(
  existingGraph: Map<string, string[]>,
  movieId: string,
  newPrerequisiteIds: string[]
): boolean {
  for (const prereqId of newPrerequisiteIds) {
    // 1. Direct self-dependency
    if (prereqId === movieId) {
      return true;
    }

    // 2. DFS to see if prereqId can reach movieId through the existing graph
    const visited = new Set<string>();
    const stack = [prereqId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === movieId) {
        return true;
      }

      if (!visited.has(current)) {
        visited.add(current);
        const nextPrereqs = existingGraph.get(current) || [];
        for (const next of nextPrereqs) {
          if (!visited.has(next)) {
            stack.push(next);
          }
        }
      }
    }
  }

  return false;
}

/**
 * Finds all transitive prerequisites for targetMovieId in valid topological order (earliest first).
 * Excludes the target movie itself.
 * Detects cycles safely using DFS with recursion stack.
 * Tie-breaker for independent prerequisites: releaseYear ascending, then title ascending.
 */
export function computeRewatchOrder(
  targetMovieId: string,
  allMovies: MovieNode[]
): RewatchOrderResult {
  const movieMap = new Map<string, MovieNode>();
  for (const m of allMovies) {
    movieMap.set(m.id, m);
  }

  const targetMovie = movieMap.get(targetMovieId);
  if (!targetMovie) {
    throw new Error(`Target movie with id ${targetMovieId} not found`);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const topologicalList: MovieNode[] = [];

  function dfs(currentId: string) {
    if (visiting.has(currentId)) {
      throw new CircularDependencyError();
    }
    if (visited.has(currentId)) {
      return;
    }

    visiting.add(currentId);

    const movie = movieMap.get(currentId);
    if (!movie) {
      visiting.delete(currentId);
      visited.add(currentId);
      return;
    }

    // Sort prerequisites deterministically: releaseYear asc, then title asc
    const prereqNodes = movie.prerequisiteIds
      .map((id) => movieMap.get(id))
      .filter((n): n is MovieNode => !!n)
      .sort((a, b) => a.releaseYear - b.releaseYear || a.title.localeCompare(b.title));

    for (const prereq of prereqNodes) {
      dfs(prereq.id);
    }

    visiting.delete(currentId);
    visited.add(currentId);

    // Only add to result if not the root target movie
    if (currentId !== targetMovieId) {
      topologicalList.push(movie);
    }
  }

  // Visit all prerequisites of target
  const targetPrereqNodes = targetMovie.prerequisiteIds
    .map((id) => movieMap.get(id))
    .filter((n): n is MovieNode => !!n)
    .sort((a, b) => a.releaseYear - b.releaseYear || a.title.localeCompare(b.title));

  visiting.add(targetMovieId);
  for (const prereq of targetPrereqNodes) {
    dfs(prereq.id);
  }
  visiting.delete(targetMovieId);

  const movies = topologicalList.map((m) => ({
    id: m.id,
    title: m.title,
    releaseYear: m.releaseYear,
    runtime: m.runtime,
    watched: m.watched,
  }));

  const totalMovies = movies.length;
  const watchedCount = movies.filter((m) => m.watched).length;
  const unwatchedCount = totalMovies - watchedCount;
  const unwatchedRuntime = movies
    .filter((m) => !m.watched)
    .reduce((sum, m) => sum + m.runtime, 0);

  return {
    target: {
      id: targetMovie.id,
      title: targetMovie.title,
    },
    movies,
    totalMovies,
    watchedCount,
    unwatchedCount,
    unwatchedRuntime,
  };
}
