import express from "express";
import { createSession, getSession, getSessionById, deleteSession, submitAnswer, endSession } from "../Controllers/sessionController.js";
import { protect } from "../middleware/auth.js";
import { uploadSingleAudio } from "../middleware/upploadmiddelware.js";

const router = express.Router();

router.use(protect);
router.route("/").post(createSession).get(getSession);
router.route("/:id").get(getSessionById).delete(deleteSession);
router.route("/:id/submit-answer").post(uploadSingleAudio, submitAnswer);
router.route("/:id/end-session").post(endSession);

export default router;

