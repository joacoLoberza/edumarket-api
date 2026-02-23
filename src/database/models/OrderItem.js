import database from '../database.js';
import { Model, DataTypes, json } from 'sequelize';
import Product from './Product.js';
import Order from './Order.js';
import List from './List.js';
import ServerError from '../../utils/ServerError.js';

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
				min: {
					args: [1],
					msg: JSON.stringify(new ServerError(
						`Can't create a new category, invalid PK entered in the DB.`,
						{
							origin: 'sequelize',
							type: 'InvalidDataSent',
						}
					).toFlatObject()),
				},
			},
		},
		list: {
			type: DataTypes.INTEGER,
			references: {
				model: List,
				key: 'id',
			},
			validate: {
				min: {
					args: [1],
					msg: JSON.stringify(new ServerError(
						`Can't create a new category, invalid PK entered in the DB.`,
						{
							origin: 'sequelize',
							type: 'InvalidDataSent',
						}
					).toFlatObject()),
				},
			},
		},
		order: {
			type: DataTypes.INTEGER,
			references: {
				model: Order,
				key: 'id',
			},
			validate: {
				min: {
					args: [1],
					msg: JSON.stringify(new ServerError(
						`Can't create a new category, invalid PK entered in the DB.`,
						{
							origin: 'sequelize',
							type: 'InvalidDataSent',
						}
					).toFlatObject()),
				},
			}
		},
		amount: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				min: {
					args: [1],
					msg: 'No se puede crear un item en la orden con una cantidad de elementos negativa.',
				},
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