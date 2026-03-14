import express from 'express';
import jwtVerify from '../middlewares/jwtVerification.js';
import multipartProcess from '../middlewares/multipartProcess.js';
import verificationBarrer from '../middlewares/verificationBarrer.js';
import adminBarrer from '../middlewares/adminBarrer.js';
import { userLogin, userDelete, userLogout, userRegister, userUpdate, recoverAccount, recoverRequest, userVerification, dniUpdateConfrim, searchAllUsers, getUserProfile, resendRecover, resendVerification} from '../controllers/handleUser.js';

const usersRouter = express.Router();
const recoverRouter = express.Router();
const resendRouter = express.Router();

usersRouter.get('/', jwtVerify, adminBarrer, verificationBarrer, searchAllUsers);
usersRouter.get('/profile', jwtVerify, verificationBarrer, getUserProfile);
usersRouter.post('/login', userLogin);
usersRouter.post('/register', multipartProcess({ size: 250 * 1024, widthRestrict: 400, heightRestrict: 400 }), userRegister);
usersRouter.post('/logout', jwtVerify, verificationBarrer, userLogout);
usersRouter.delete('/delete', jwtVerify, verificationBarrer, userDelete);
usersRouter.patch('/update', jwtVerify, verificationBarrer, multipartProcess({ size: 250 * 1024, widthRestrict: 400, heightRestrict: 400 }), userUpdate);
usersRouter.patch('/change-dni', jwtVerify, verificationBarrer, dniUpdateConfrim);
usersRouter.patch('/verify', userVerification);
usersRouter.use('/recover', recoverRouter);
usersRouter.use('/resend', resendRouter);

recoverRouter.post('/', recoverAccount);
recoverRouter.post('/request', recoverRequest);

resendRouter.post('/verification', resendVerification);
resendRouter.post('/recover', resendRecover);

export default usersRouter;