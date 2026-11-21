import { Router } from "express";
import movieRoutes from "./movie.routes.js";
import cinemaRoutes from "./cinema.routes.js";

const router = Router();

router.use("/movies", movieRoutes);
router.use("/cinemas", cinemaRoutes);

export default router;
