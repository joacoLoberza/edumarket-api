import database from '../database/database.js';
import { Op } from 'sequelize';
import { Preference } from 'mercadopago';
import Order from '../database/models/Order.js';
import OrderItem from '../database/models/OrderItem.js';
import Product from '../database/models/Product.js';
import Cart from '../database/models/Cart.js';
import CartItem from '../database/models/CartItem.js';
import List from '../database/models/List.js';
import ListItem from '../database/models/ListItem.js';
import Category from '../database/models/Category.js';
import School from '../database/models/School.js';
import Course, { Grade, Level, Div } from '../database/models/Course.js';
import sequelizeErrorManagement from '../utils/sequelizeErrorManagement.js';
import ServerError from '../utils/ServerError.js';
import mpClient from '../config/mpClient.js';

export const getOrders = async (req, res) => {
	try {
		const { id:userId } = req.payload;
		let { limit = 10, order = 'ASC', search = '', status = '', cursor } = req.query;

		//Format data.
		limit = Number(limit); cursor = cursor? Number(cursor) : null;
		const escapedSearch = search.replace('%', '\\%').replace('_', '\\_');

		if (isNaN(limit) || isNaN(cursor) || order !== 'ASC' && order !== 'DESC') return res.status(400).json( new ServerError("Unexpected query params.", { origin: 'server', type: 'InvalidDataSent' }));

		//Search orders.
		const orders = await Order.findAll({
			where:{
				//Filter by user, status and phrase coincidence.
				user: userId,
				status: { [Op.like]: `%${status}%` },
				id: {
					//Start in the pagination index.
					... cursor?
						(order === 'ASC')?
							{ [Op.gt]: cursor }:
							{ [Op.lt]: cursor }:
						{},
					/*Search only the orders whit the ID that's equal to the order's IDs that cointains the phrase coincidence in:
						1. Product name (if it has that relation).
						2. List name (if that rlation exists).
						3. Product name on a list element.
						4. One category in one product.
					*/
					[Op.in]: database.literal(`(
						SELECT DISTINCT \`Order\`.\`id\`
						FROM \`Order\`
						LEFT JOIN \`OrderItem\` AS \`OItem\` ON \`Order\`.\`id\` = \`OItem\`.\`order\`
						LEFT JOIN \`Product\` AS \`Prod\` ON \`OItem\`.\`product\` = \`Prod\`.\`id\`
						LEFT JOIN \`Category\` AS \`ProdCat\` ON \`Prod\`.\`category\` = \`ProdCat\`.\`id\`
						LEFT JOIN \`List\` ON \`OItem\`.\`list\` = \`List\`.\`id\`
						LEFT JOIN \`ListItem\` AS \`LItem\` ON \`List\`.\`id\` = \`LItem\`.\`list\`
						LEFT JOIN \`Product\` AS \`LItemProd\` ON \`LItem\`.\`product\` = \`LItemProd\`.\`id\`
						LEFT JOIN \`Category\` AS \`LItemProdCat\` ON \`LItemProd\`.\`category\` = \`LItemProdCat\`.\`id\`
						LEFT JOIN \`School\` ON \`List\`.\`school\` = \`School\`.\`id\`
						WHERE
							\`Prod\`.\`name\` LIKE :search OR
							\`ProdCat\`.\`uiName\` LIKE :search OR
							\`List\`.\`name\` LIKE :search OR
							\`LItemProd\`.\`name\` LIKE :search OR
							\`LItemProdCat\`.\`uiName\` LIKE :search OR
							\`School\`.\`name\` LIKE :search
					)`)
				}
			},
			replacements: { search: `%${escapedSearch}%` },
			limit,
			order: [['id', order]],
			//Include all models and fields required (DATA).
			attributes: ['id', 'status', 'orderNumber', 'totalPrice', 'paidAt'],
			include: {
				model: OrderItem,
				attributes: ['id', 'amount'],
				include: [
					{
						model: Product,
						paranoid: false,
						attributes: ['id', 'basePrice', 'offerPrice', 'image', 'name'],
						include: {
							model: Category,

							attributes: ['id', 'uiName'],
						}
					},
					{
						model: List,
						paranoid: false,
						attributes: ['id', 'name', 'isAssembled'],
						include: [
							{
								model: ListItem,
								attributes: ['id', 'amount'],
								include: {
									model: Product,

									attributes: ['id', 'basePrice', 'offerPrice', 'image', 'name'],
									include: {
										model: Category,

										attributes: ['id', 'uiName'],
									}
								}
							},
							{
								model: School,
								attributes: ['id', 'name', 'image'],
							},
							{
								model: Course,
								attributes: ['id'],
								include: [
									{
										model: Level,
									},
									{
										model: Div,
									},
									{
										model: Grade,
									}
								]
							},
						]
					}
				]
			}
		});

		//Format the order data to send it.
		const rawOrders = orders.map(order => {
			//Format order items to -> { id, amount, product, list }
			const orderItems = order.OrderItems.map(orderItem => {

				//Product field (if exists the reference).
				let product = null;
				if (orderItem.Product) {
					product = orderItem.Product.toJSON();
					delete product.Category;
					product.category = orderItem.Product.Category.uiName;
				} else {
					product = undefined;
				}

				//List field (if exists the reference).
				let list = null;
				if (orderItem.List) {
					//Format fields of the list to -> { id, name, isAssembled, school, course, products }.
					list = orderItem.List.toJSON();

					//Format references.
					list.school = list.School;
					list.products = orderItem.List.ListItems.map(listItem => {
						//                                   |              from Product                       | from Item |
						//Format list items reference to -> { id, name, basePrice, offerPrice, image, category,    amount   }
						let product = listItem.Product.toJSON();
						delete product.Category;
						product.category = listItem.Product.Category.uiName;
						return {
							... product,
							amount: listItem.amount,
						}
					});

					//Format course reference to -> { level, grade, division } 
					list.course = {
						level: list.Course.Level.level,
						grade: list.Course.Grade.number,
						division: list.Course.Div.word,
					}

					delete list.ListItems;
					delete list.School;
					delete list.Course;
				} else {
					list = undefined;
				}

				orderItem = orderItem.toJSON(),
				delete orderItem.Product;
				delete orderItem.List;
				return {
					... orderItem,
					product,
					list,
				}
			})

			order = order.toJSON();
			delete order.OrderItems;
			return {
				... order,
				orderItems,
			}
		})

		//Send search and nextCursor for the next query.
		return res.status(200).json({
			orders: rawOrders,
			message: "Orders found successfully.",
			nextCursor: orders.length > 0? orders[orders.length-1].id : null,
		})
	} catch (error) {
		console.log(error)
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError("Couldn't search the orders.", { origin: 'unknown', type: 'Unknown' }));
	}
}

export const createOrder = async (req, res) => {
	//Create sequelize transaction for a atomic operation.
	const orderTrans = await database.transaction();
	try {
		const { id:userId } = req.payload;

		//Search cart.
		const cart = await Cart.findOne({
			attributes: ['id', 'totalPrice'],
			where: {
				user: userId,
			},
			include: {
				model: CartItem,
				attributes: ['id', 'product', 'list', 'amount'],
				include: [
					{
						model: Product,
						attributes: ['id', 'name', 'basePrice', 'offerPrice'],
					},
					{
						model: List,
						attributes: ['id'],
						include: {
							model: ListItem,
							attributes: ['id'],
							include: {
								model: Product,
								attributes: ['id', 'name', 'basePrice', 'offerPrice'],
							}
						}
					}
				],
			}
		}, { transaction: orderTrans });

		if (!cart || cart?.CartItems.length === 0) {
			await orderTrans.rollback();
			return res.status(404).json( new ServerError("Can't create a new order, cart empty.", { origin: 'server', type: 'ResourceNotFound'}));
		}

		//Create items array (all products in the cart and in the lists of the cart).
		const preferenceItems = cart.CartItems.flatMap(item => {
			if (item.list && item.List !== null) {
				return item.List.ListItems.map(liItem => ({
					id: liItem.Product.id,
					title: liItem.Product.name,
					unit_price: liItem.Product.offerPrice?
						liItem.Product.offerPrice: 
						liItem.Product.basePrice,
					quantity: liItem.amount * item.amount,
				}))
			} else if (item.product && item.Product !== null) {
				return {
					id: item.Product.id,
					title: item.Product.name,
					unit_price: item.Product.offerPrice?
						item.Product.offerPrice:
						item.Product.basePrice,
					quantity: item.amount,
				}
			}
		});

		//Search last user order for determinate the user's order id (order number).
		const lastOrder = await Order.findOne({
			order: [['orderNumber', 'DESC']],
			where: { user: userId },
			attributes: ['id', 'orderNumber'],
		}, { transaction: orderTrans });

		//Create the new order.
		const newOrder = await Order.create({
			orderNumber: lastOrder? lastOrder.orderNumber + 1 : 1,
			user: userId,
			totalPrice: cart?.totalPrice,
		}, { transaction: orderTrans });

		//Create a preference whit the Mercado Pago SDK.
		const preferenceInstance = new Preference(mpClient);
		const preference = await preferenceInstance.create({
			body: {
				items: preferenceItems,
				notification_url: /* process.env.API_URL + '/webhooks/mp' ||  */'https://entering-gathering-raking.ngrok-free.dev/webhooks/mp',
				back_urls: {
					success: process.env.CLIENT_URL + '/payment/success' || 'http://localhost:5173/payment/success',
					failure: process.env.CLIENT_URL + '/payment/failure' || 'http://localhost:5173/payment/failure',
				},
				external_reference: newOrder.id,
			}
		});

		//Add prefernce data to the order.
		await newOrder.update({
			preferenceURL: preference.init_point,
			preferenceId: preference.id,
		}, { transaction: orderTrans })

		//Create order items.
		const orderItems = cart.CartItems.map( item => { if (item.Product || item.List) return (
			{
				product: item.product ? item.product : null,
				list: item.list? item.list : null,
				order: newOrder.id,
				amount: item.amount,
			}
		)});
		await OrderItem.bulkCreate(orderItems, { transaction: orderTrans });

		//Close successfully the transaction.
		await orderTrans.commit();
		console.log(preference)
		res.status(201).json({ 
			message: "Order created successfully.",
			init_point: preference.init_point,
		})
	} catch (error) {
		console.log(error)
		await orderTrans.rollback();
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError("Couldn't create the order, operation aborted.", { origin: 'unknown', type: 'Unknown'}))
	}
}