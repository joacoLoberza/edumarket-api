import { Op, where } from 'sequelize';
import database from '../database/database.js';
import CartItem from '../database/models/CartItem.js';
import Product from '../database/models/Product.js';
import Cart from '../database/models/Cart.js';
import User from '../database/models/User.js';
import ServerError from '../utils/ServerError.js';
import sequelizeErrorManagement from '../utils/sequelizeErrorManagement.js';

export const addItem = async (req, res) => {
	/*
	Expexted Body:
	{
		productId: NUMBER -> The ID of the product to add.
		amount: NUMBER -> The amount of products to add.
	}
	*/
	try {
		const { productId, amount = 1 } = req.body;
		const { id } = req.payload;

		const product = await Product.findByPk(productId, { attributes: [] });
		if (!product) {
			return res.status(404).json( new ServerError(
				"The product doesn't exists.",
				{
					origin: 'server',
					type: 'ResourceNotFound',
				}
			).toFlatObject());
		}

		const cartId = await User.findByPk(id, {
			attributes: [],
			include: {
				model: Cart,
				attributes: ['id']
			}
		})
		if (!cartId) {
			console.warn(`Server|\x1b[33m A user (id = ${id}) haven't a cart.\x1b[0m`)
			const newCart = await Cart.create({
				user: id,
				totalPrice: 0.0,
			});
			cartId = newCart.id;
		}

		const newItem = await CartItem.create({
			product: productId,
			cart: cartId,
			amount
		})

		return res.status(201).json({
			message: "Product added correctly to the cart."
		})

	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error)
		}

		return res.status(500).json( new ServerError(
			"Couldn't add the product to the cart.",
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		).toFlatObject());
	}
}

export const removeItem = async (req, res) => {
	/*
	Expected Body:
	{
		itemId: NUMBER -> The id of the product in the cart.
	}
	*/
	try {
		const { itemId } = req.body;
		const { id } = req.payload;

		const cartItem = await Cart.findOne({
			where: {user: id},
			include: {
				model: CartItem,
				where: { id: itemId },
				required: true,
			}
		})
		if (!cartItem) {
			return res.status(404).json( new ServerError(
				"Can't remove the cart element because it doesn't exists.",
				{
					origin: 'server',
					type: 'ResourceNotFound',
				}
			).toFlatObject());
		}

		await cartItem.destroy();
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}

		return res.status(500).json( new ServerError(
			"Couldn't remove the element from the cart.",
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		).toFlatObject());
	}
}

export const updateAmount = async (req, res) => {
	/*
	Expected Body:
	{
		newAmount: NUMBER -> The new amount of the product in the cart.
	}
	*/
	try {
		const { itemId, newAmount } = req.body;
		const { id } = req.payload;

		const item = await Cart.findOne({
			where: { user: id },
			attributes: [],
			include: {
				model: CartItem,
				where: { id: itemId },
				required: true,
			}
		})
		if (!item) {
			return res.status(404).json( new ServerError(
				"The cart element doesn't exists.",
				{
					origin: 'server',
					type: 'ResourceNotFound',
				}
			).toFlatObject());
		}

		const newItem = await item.update({
			amount: newAmount,
		});

		return res.status(200).json({
			message: "Cart element updated successfuly."
		})
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error)
		}
		
		return res.status(500).json( new ServerError(
			"Couldn't update the cart element amount.",
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		).toFlatObject());
	}
}

//To Do: Update the total price of the cart in the controllers.