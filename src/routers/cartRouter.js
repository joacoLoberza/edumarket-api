import express from 'express';
import jwtVerify from '../middlewares/jwtVerification.js';
import { addItem, removeItem, updateAmount, getCart } from '../controllers/handleCart.js';

const cartRouter = express.Router();
cartRouter.post('/', jwtVerify, addItem);
cartRouter.delete('/', jwtVerify, removeItem);
cartRouter.get('/', jwtVerify, getCart);
cartRouter.patch('/', jwtVerify, updateAmount)

export default cartRouter;