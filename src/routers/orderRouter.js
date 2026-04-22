import express from 'express';
import { createOrder, getOrders } from '../controllers/handleOrder.js';

const orderRouter = express.Router();
orderRouter.get('/', getOrders);
orderRouter.post('/', createOrder);

export default orderRouter;