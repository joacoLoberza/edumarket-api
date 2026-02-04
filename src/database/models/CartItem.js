import database from '../index.js';
import { Model, DataTypes } from 'sequelize';
import Product from './Product.js';
import Cart from './Cart.js';

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
				min: 1,
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
				min: 1,
			},
		},
		amount: {
			type: DataTypes.INTEGER,
			defaultValue: 1,
			validate: {
				min: 1,
			},
		},
	}, { sequelize: database }
);

export default CartItem;