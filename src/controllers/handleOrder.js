import { Preference } from 'mercadopago';
import Order from '../database/models/Order.js';
import OrderItem from '../database/models/OrderItem.js';
import Product from '../database/models/Product.js';
import Cart from '../database/models/Cart.js';
import CartItem from '../database/models/CartItem.js';
import List from '../database/models/List.js';
import ListItem from '../database/models/ListItem.js';
import sequelizeErrorManagement from '../utils/sequelizeErrorManagement.js';
import ServerError from '../utils/ServerError.js';
import mpClient from '../config/mpClient.js';

export const getOrders = async (req, res) => {

}

export const createOrder = async (req, res) => {
	/*
	Expected Body:
	{
		prductId: NUMBER -> The id of the product if the order is a "Buy Now".
		amount: NUMBER -> The amount of the product for the same case.
	}
	*/
	try {
		const { id:userId } = req.payload; 

		const cart = await Cart.findAll({
			attributes: ['id', 'totalPrice'],
			where: {
				user: userId,
			},
			include: {
				model: CartItem,
				key: 'id',
				attributes: ['id', 'product', 'list', 'amount'],
				include: {
					model: Product,
					key: 'id',
					attributes: ['id', 'name', 'basePrice', 'offerPrice'],
				},
				include: {
					model: List,
					key: 'id',
					attributes: ['id'],
					include: {
						model: ListItem,
						key: 'id',
						attributes: ['id'],
						include: {
							model: Product,
							key: 'id',
							attributes: ['id', 'name', 'basePrice', 'offerPrice'],
						}
					}
				}
			}
		})
		if (!cart || cart[0]?.CartItem.length === 0) {
			return res.status(404).json( new ServerError("Can't create a new order, cart empty.", { origin: 'server', type: 'ResourceNotFound'}));
		}

		const preferenceItems = cart[0].CartItem.flatMap(item => {
			if (item.list) {
				return item.List.ListItem.map(liItem => ({
					id: liItem.Product.id,
					title: liItem.Product.name,
					unit_price: liItem.Product.offerPrice?
						liItem.Product.offerPrice: 
						liItem.Product.basePrice,
					quantity: liItem.amount * item.amount,
				}))
			} else if (item.product) {
				return {
					id: item.Product.id,
					title: item.Product.name,
					unit_price: item.Product.offerPrice?
						item.Product.offerPrice:
						item.Product.basePrice,
					quantity: item.amount,
				}
			}
		})

		const preference = new Preference(mpClient);
		preference.create({
			body: {
				items: preferenceItems,
				notification_url: process.env.API_URL + '/webhooks/mp' || 'http://localhost:3000/webhooks/mp',
				back_urls: {
					success: process.env.CLIENT_URL + '/payment/success' || 'http://localhost:5173/payment/success',
					failure: process.env.CLIENT_URL + '/payment/failure' || 'http://localhost:5173/payment/failure',
				}
			}
		})

		//Continue this creating a new order and adding necessary fields to the order model.
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req);
		}
		return res.status(500).json( new ServerError("Couldn't create the order, operation aborted.", { origin: 'unknown', type: 'Unknown'}))
	}
}

export const cancelOrder = async (req, res) => {
	
}