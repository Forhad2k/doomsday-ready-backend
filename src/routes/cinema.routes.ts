import { Router } from "express";
import { cinemaController } from "../controllers/cinema.controller.js";

const router = Router();

router.get("/", (req, res, next) => cinemaController.getAllCinemas(req, res, next));
router.post("/", (req, res, next) => cinemaController.createCinema(req, res, next));
router.get("/:id/booking", (req, res, next) =>
  cinemaController.getBookingQuote(req, res, next)
);

export default router;
