import express from "express";
import adminBarrer from "../middlewares/adminBarrer.js";
import jwtVerify from "../middlewares/jwtVerification.js";
import multipartProcess from "../middlewares/fileProcesing/multipartProcess.js";
import { imageValidator } from "../middlewares/fileProcesing/imageValidator.js";
import { getCategories, addCategory, quitCategory, updateCategories } from "../controllers/handleCategory.js";
import verificationBarrer from "../middlewares/verificationBarrer.js";

const categoryRouter = express.Router();

categoryRouter.patch('/', jwtVerify, adminBarrer, verificationBarrer, multipartProcess({ size: 10 * 1024, processorType: 'any' }), imageValidator({ widthRestrict: 100, heightRestrict: 100 }), updateCategories);
categoryRouter.get('/', getCategories);
categoryRouter.post('/', jwtVerify, adminBarrer, verificationBarrer, multipartProcess({ size: 10 * 1024, fields:'cat-image'}), imageValidator({ widthRestrict: 100, heightRestrict: 100 }), addCategory);
categoryRouter.delete('/', jwtVerify, adminBarrer, verificationBarrer, quitCategory);

export default categoryRouter;