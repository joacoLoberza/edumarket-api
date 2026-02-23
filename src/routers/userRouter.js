import express from 'express';
import jwtVerify from '../middlewares/jwtVerification.js';
import multipartProcess from '../middlewares/multipartProcess.js';
import verificationBarrer from '../middlewares/verificationBarrer.js';
import { userLogin, userDelete, userLogout, userRegister, userUpdate, recoverAccount, recoverRequest, userVerification} from '../controllers/handleUser.js';

 const usersRouter = express.Router();
 const recoverRouter = express.Router();

 usersRouter.post('/login', verificationBarrer, userLogin);
 usersRouter.post('/register', multipartProcess({ size: 250 * 1024, widthRestrict: 400, heightRestrict: 400 }), userRegister);
 usersRouter.post('/logout', verificationBarrer, jwtVerify, userLogout);
 usersRouter.delete('/delete', verificationBarrer, jwtVerify, userDelete);
 usersRouter.patch('/update', jwtVerify, multipartProcess({ size: 250 * 1024, widthRestrict: 400, heightRestrict: 400 }), userUpdate);
 usersRouter.patch('/verify', userVerification);
 usersRouter.use('/recover', verificationBarrer, recoverRouter);

 recoverRouter.post('/', recoverAccount);
 recoverRouter.post('/request', recoverRequest);

 export default usersRouter;