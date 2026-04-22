import express from 'express';
import { addSchool, getSchools, deleteSchool, editSchool } from '../controllers/handleSchool.js';
import jwtVerify from '../middlewares/jwtVerification.js';
import adminBarrer from '../middlewares/adminBarrer.js';
import verificationBarrer from '../middlewares/verificationBarrer.js';
import multipartProcess from '../middlewares/fileProcesing/multipartProcess.js';
import { imageValidator } from '../middlewares/fileProcesing/imageValidator.js';

const schoolRouter = express.Router();

schoolRouter.use(jwtVerify, adminBarrer, verificationBarrer);
schoolRouter.get('/', getSchools);
schoolRouter.post('/', multipartProcess({size: 50 * 1024, fields: 'schoolImg'}), imageValidator({ widthRestrict: 400, heightRestrict: 400 }), addSchool);
schoolRouter.delete('/', deleteSchool);
schoolRouter.put('/', multipartProcess({size: 50 * 1024, fields: 'schoolImg'}), imageValidator({widthRestrict: 400, heightRestrict: 400 }), editSchool);

export default schoolRouter;