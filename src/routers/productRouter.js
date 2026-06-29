import express from 'express';
import { getPrdocuts, getProdDetails, createProduct, updateProduct, deleteProuct } from '../controllers/handleProduct.js';
import jwtVerify from '../middlewares/jwtVerification.js';
import adminBarrer from '../middlewares/adminBarrer.js';
import verificationBarrer from '../middlewares/verificationBarrer.js';
import multipartProcess from '../middlewares/fileProcesing/multipartProcess.js';
import { imageValidator } from '../middlewares/fileProcesing/imageValidator.js';

const productsRouter = express.Router();

productsRouter.get('/', getPrdocuts);
productsRouter.get('/:id', optionalLogin, getProdDetails);
productsRouter.post('/', jwtVerify, adminBarrer, verificationBarrer, multipartProcess({ size: 75 * 1024, fields: 'prodImg' }), imageValidator({widthRestrict: 550, heightRestrict: 475}), createProduct);
productsRouter.patch('/:id', jwtVerify, adminBarrer, verificationBarrer, multipartProcess({ size: 75 * 1024, fields: 'prodImg' }), imageValidator({widthRestrict: 550, heightRestrict: 475}), updateProduct);
productsRouter.delete('/:id', jwtVerify, adminBarrer, verificationBarrer, deleteProuct);

async function optionalLogin (req, res, next) {
	if (req.headers?.authorization) {
		return await jwtVerify(req, res, () => {
			if (req.payload.role === 'admin') {
				adminBarrer(req, res, async () => {
					await verificationBarrer(req, res, next); 
				});
			} else next();
		});
  } else {
		return next();
	}
}

export default productsRouter;