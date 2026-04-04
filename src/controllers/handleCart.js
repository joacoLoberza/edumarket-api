import CartItem from '../database/models/CartItem.js';
import Product from '../database/models/Product.js';
import Cart from '../database/models/Cart.js';
import List from '../database/models/List.js';
import ServerError from '../utils/ServerError.js';
import sequelizeErrorManagement from '../utils/sequelizeErrorManagement.js';

export const addItem = async (req, res) => {
	/*
	Expected Body:
	{
		listId: NUMBER -> The ID of the list to add. | OPTIONAL when productId is used.
		productId: NUMBER -> The ID of the product to add. | OPTIONAL when listId is used.
		amount: NUMBER -> The quantity of the item to add.
	}
	*/
	try {
		const { productId, listId, amount = 1 } = req.body;
		const { id } = req.payload;

		//Validate if the product exists.
		if (productId) {
			const product = await Product.findByPk(productId, { attributes: ['id'] });
			if (!product) {
				return res.status(404).json( new ServerError(
					"The product doesn't exists.",
					{
						origin: 'server',
						type: 'ResourceNotFound',
					}
				).toFlatObject());
			}
		}

		//Validate if the list exists.
		if (listId) {
			const list = await List.findByPk(listId, { attributes: ['id'] });
			if (!list) {
				return res.status(404).json( new ServerError(
					"The list doesn't exists.",
					{
						origin: 'server',
						type: 'ResourceNotFound',
					}
				).toFlatObject());
			}
		}

		// Find the user's cart if it exists.
		let cart = await Cart.findOne({
			attributes: ['id', 'totalPrice'],
			where: {
				user: id,
			},
		})
		if (!cart) {
			console.warn(`Server|\x1b[33m A user (id = ${id}) haven't a cart.\x1b[0m`)
			const newCart = await Cart.create({
				user: id,
				totalPrice: 0.0,
			});
			cartId = newCart.id;
		}
		const cartId = cart.id;

		//The validation about if there references just one product or just one list and is unique in its cart is done in de the model validations and indexes.
		const newItem = await CartItem.create({
			product: productId,
			list: listId,
			cart: cartId,
			amount
		})

		// Pull cart items to recalculate total price.
		const cartItems = await CartItem.findAll({
			where: {
				cart: cartId,
			},
			attributes: ['amount'],
			include: {
				model: Product,
				attributes: ['basePrice', 'offerPrice'],
			}
		})
	
		//Calculate new total price for the cart.
		let totalPrice = cart.totalPrice;

		cartItems.forEach((item) => {
			if (item.Product.offerPrice) {
				totalPrice += item.Product.offerPrice * item.amount;
			} else {
				totalPrice += item.Product.basePrice * item.amount;
			}
		})

		await cart.update({
			totalPrice,
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
		itemId: NUMBER -> The id of the element in the cart.
	}
	*/
	try {
		const { itemId } = req.body;
		const { id } = req.payload;

		//Get cart element.	
		const cartItem = await CartItem.findByPk(itemId, {
			attributes: ['id', 'amount'],
			include: {
				model: Product,
				attributes: ['basePrice', 'offerPrice']
			}
		});
		if (!cartItem) {
			return res.status(404).json( new ServerError(
				"Can't remove the cart element because it doesn't exists.",
				{
					origin: 'server',
					type: 'ResourceNotFound',
				}
			).toFlatObject());
		}

		//Get user's cart.
		let cart = await Cart.findOne({
			where: { user: id }
		})
		if (!cart) {
			console.warn(`Server|\x1b[33m A user (id = ${id}) haven't a cart.\x1b[0m`)
			cart = await Cart.create({
				user: id,
				totalPrice: 0.0,
			});
		}

		//Calculate new total price of the cart.
		let totalPrice = cart.totalPrice;
		if (cartItem.Product.offerPrice) {
			totalPrice -= cartItem.Product.offerPrice * cartItem.amount;
		} else {
			totalPrice -= cartItem.Product.basePrice * cartItem.amount;
		}

		//Update the cart and destroy the element to remove.
		await cart.update({
			totalPrice,
		})

		await cartItem.destroy();

		return res.status(200).json({
			message: 'Cart element removed correctly.'
		})
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
		itemId: NUMBER -> The id of the item to delete.
	}
	*/
	try {
		const { itemId, newAmount } = req.body;
		const { id } = req.payload;

		//Get cart element.
		const item = await CartItem.findByPk(itemId, {
			include: {
				model: Product,
				attributes: ['basePrice', 'offerPrice'],
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

		//Get user's cart.
		let cart = await Cart.findOne({
			where: {user: id}
		});

		if (!cart) {
			console.warn(`Server|\x1b[33m A user (id = ${id}) haven't a cart.\x1b[0m`)
			cart = await Cart.create({
				user: id,
				totalPrice: 0.0,
			});
		}

		//Calculate new total price for the cart.
		let totalPrice = cart.totalPrice;

		if (item.Product.offerPrice) {
			totalPrice += item.Product.offerPrice * (newAmount - item.amount);
		} else {
			totalPrice += item.Product.basePrice * (newAmount - item.amount);
		}

		const newCart = await cart.update({
			totalPrice,
		})

		//Update the amount of the cart element.
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

export const getCart = async (req, res) => {
	try {
		const { id } = req.payload;

		//Look for the user's cart and its elements.
		let cart = await Cart.findAll({
			where: { user: id },
			include: {
				model: CartItem,
				include: {
					model: Product,
					attributes: ['id', 'image', 'name', 'basePrice', 'offerPrice']
				}
			}	
		})
		if (!cart) {
			console.warn(`Server|\x1b[33m A user (id = ${id}) haven't a cart.\x1b[0m`);
			const cart = await Cart.create({
				user: id,
				totalPrice: 0.0,
			})
		}

		return res.status(200).json({
			message: 'Cart got successfully.',
			cart: cart.map(c => c.toJSON()),
		})
	} catch(error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}

		return res.status(500).json( new ServerError(
			"Unknown error getting the user's cart."
		).toFlatObject());
	}
}

//Testear código.