import database from '../index.js';
import { Model, DataTypes } from 'sequelize';
import Product from './Product.js';
import Order from './Order.js';
import List from './List.js';

class OrderItem extends Model { };
OrderItem.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		product: {
			type: DataTypes.INTEGER,
			references: {
				model: Product,
				key: 'id',
			},
			validate: {
				min: 1,
			},
		},
		list: {
			type: DataTypes.INTEGER,
			references: {
				model: List,
				key: 'id',
			},
			validate: {
				min: 1,
			},
		},
		order: {
			type: DataTypes.INTEGER,
			references: {
				model: Order,
				key: 'id',
			},
			validate: {
				min: 1,
			}
		},
		amount: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				min: 1,
			},
		}
	},
	{
		sequelize: database,
		validate: {
			verifyItemType() {
				if ((!this.product && !this.list) || (this.product && this.list)) {
					console.error('Server|\x1b[31m Validation error in model OrederItem, a reference was recibed to a list and a product or to none.\x1b[0m');
					throw new Error('Error al agregar un elemento del carrito a la orden (se desconoce si es un producto o una lista).');
				}
			}
		},
	}
);

export default OrderItem;