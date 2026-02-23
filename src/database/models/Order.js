import database from '../database.js';
import { Model, DataTypes } from 'sequelize';
import User from './User.js';
import ServerError from '../../utils/ServerError.js';

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
				min: {
					args: [1],
					msg: JSON.stringify(new ServerError(
						`Can't create a new order, invalid PK entered in the DB.`,
						{
							origin: 'sequelize',
							type: 'InvalidDataSent',
						}
					).toFlatObject()),
				},
			},
		},
		totalPrice: {
			type: DataTypes.DOUBLE,
			allowNull: false,
			validate: {
				min: {
					args: [0.0],
					msg: 'El precio total no puede ser un número negativo.'
				},
			},
		},
	}, { sequelize: database }
);

export default Order;