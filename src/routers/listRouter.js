import express from "express";
import { createList, deleteList, addListItem, removeListItem, changeAmount, editList, getLists } from "../controllers/handleList.js";
import jwtVerify from '../middlewares/jwtVerification.js';
import verificationBarrer from "../middlewares/verificationBarrer.js";

const listRouter = express.Router();

listRouter.get('/', optionalLogin, getLists);
listRouter.post('/', jwtVerify, verificationBarrer, createList);
listRouter.delete('/:id', jwtVerify, verificationBarrer, deleteList);
listRouter.patch('/:id', jwtVerify, verificationBarrer, editList);
listRouter.post('/:id/item', jwtVerify, verificationBarrer, addListItem);
listRouter.delete('/item/:id', jwtVerify, verificationBarrer, removeListItem);
listRouter.patch('/item/:id', jwtVerify, verificationBarrer, changeAmount);

function optionalLogin (req, res, next) {
	if (req.query.isAssembled === 'true') {
		return jwtVerify(req, res, next);
	} else {
		return next();
	}
}

export default listRouter;