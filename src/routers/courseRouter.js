import express from "express";
import { getLevels, getDivisions, getGrades, addDivision, addLevel, addGrade, deleteDivision, deleteGrade, deleteLevel } from "../controllers/handleCourse.js";
import adminBarrer from "../middlewares/adminBarrer.js";
import jwtVerify from "../middlewares/jwtVerification.js";
import verificationBarrer from	"../middlewares/verificationBarrer.js";

const courseRouter = express.Router();

courseRouter.use(jwtVerify, adminBarrer, verificationBarrer);
courseRouter.get('/level', getLevels);
courseRouter.get('/division', getDivisions);
courseRouter.get('/grades', getGrades);
courseRouter.post('/division', addDivision);
courseRouter.post('/level', addLevel);
courseRouter.post('/grade', addGrade);
courseRouter.delete('/division', deleteDivision);
courseRouter.delete('/grade', deleteGrade);
courseRouter.delete('/level', deleteLevel);

export default courseRouter;