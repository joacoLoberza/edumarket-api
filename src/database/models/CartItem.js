import database from '../database.js';
import { Model, DataTypes } from 'sequelize';
import Product from './Product.js';
import Cart from './Cart.js';
import ServerError from '../../utils/ServerError.js';

class CartItem extends Model { };
CartItem.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		product: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: Product,
				key: 'id',
			},
			validate: {
				min:  {
					args: [1],
					msg: JSON.stringify(new ServerError(
						`Can't create a new cart item, invalid PK entered in the DB.`,
						{
							origin: 'sequelize',
							type: 'InvalidDataSent',
						}
					).toFlatObject()),
				},
			},
		},
		cart: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: Cart,
				key: 'id',
			},
			validate: {
				min: {
					args: [1],
					msg: JSON.stringify(new ServerError(
						`Can't create a new cart item, invalid PK entered in the DB.`,
						{
							origin: 'sequelize',
							type: 'InvalidDataSent',
						}
					).toFlatObject()),
				},
			},
		},
		amount: {
			type: DataTypes.INTEGER,
			defaultValue: 1,
			validate: {
				min: {
					args: [1],
					msg: 'No se puede ingresar una cantidad negativa de elementos.',
				},
			},
		},
	}, { sequelize: database }
);

export default CartItem;