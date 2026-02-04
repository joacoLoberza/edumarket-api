import database from '../index.js';
import { Model, DataTypes } from 'sequelize';
import User from './User.js';

class Order extends Model { };
Order.init(
	{
		id: {
			primaryKey:true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		status: {
			type: DataTypes.ENUM('pending', 'paid', 'cancelled', 'refunded', 'shipped', 'faild'),
			defaultValue: 'pending'
		},
		orederNumber: {
			type: DataTypes.INTEGER,
			allowNull: false
		},
		user: {
			type: DataTypes.INTEGER,
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

export default Order;