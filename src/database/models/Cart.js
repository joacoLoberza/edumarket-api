import database from '../index.js';
import { Model, DataTypes } from 'sequelize';
import User from './User.js';

class Cart extends Model { };
Cart.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		user: {
			type: DataTypes.INTEGER,
			allowNull: false,
			unique: true,
			references: {
				model: User,
				key: 'id',
			},
			validate: {
				min: 1,
			},
		},
		totalPrice: {
			type: DataTypes.DOUBLE,
			allowNull: false,
			validate: {
				min: 0.0,
			},
		},
	}, { sequelize: database }
);

export default Cart;