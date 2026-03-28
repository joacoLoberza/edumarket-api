import express from 'express';
import jwtVerify from '../middlewares/jwtVerification.js';
import multipartProcess from '../middlewares/fileProcesing/multipartProcess.js';
import verificationBarrer from '../middlewares/verificationBarrer.js';
import { imageValidator } from '../middlewares/fileProcesing/imageValidator.js';
import adminBarrer from '../middlewares/adminBarrer.js';
import { userLogin, userDelete, userLogout, userRegister, userUpdate, recoverAccount, recoverRequest, userVerification, dniUpdateConfrim, searchAllUsers, getUserProfile, resendRecover, resendVerification} from '../controllers/handleUser.js';

const usersRouter = express.Router();
const recoverRouter = express.Router();
const resendRouter = express.Router();

usersRouter.get('/', jwtVerify, adminBarrer, verificationBarrer, searchAllUsers);
usersRouter.get('/profile', jwtVerify, getUserProfile);
usersRouter.post('/login', userLogin);
usersRouter.post('/register', multipartProcess({ size: 50 * 1024, fields: 'profileImg' }), imageValidator({widthRestrict: 400, heightRestrict: 400}), userRegister);
usersRouter.post('/logout', jwtVerify, userLogout);
usersRouter.delete('/delete', jwtVerify, verificationBarrer, userDelete);
usersRouter.patch('/update', jwtVerify, verificationBarrer, multipartProcess({ size: 50 * 1024, fields: 'profileImg' }), imageValidator({ widthRestrict: 400, heightRestrict: 400 }), userUpdate);
usersRouter.patch('/change-dni', jwtVerify, verificationBarrer, dniUpdateConfrim);
usersRouter.patch('/verify', userVerification);
usersRouter.use('/recover', recoverRouter);
usersRouter.use('/resend', resendRouter);

recoverRouter.post('/', recoverAccount);
recoverRouter.post('/request', recoverRequest);

resendRouter.post('/verification', resendVerification);
resendRouter.post('/recover', resendRecover);

export default usersRouter;