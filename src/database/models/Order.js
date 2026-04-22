import database from '../database.js';
import { Model, DataTypes } from 'sequelize';
import User from './User.js';
import ServerError from '../../utils/ServerError.js';
import { Json } from 'sequelize/lib/utils';

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
		orderNumber: {
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
		preferenceURL: {
			type: DataTypes.STRING,
			unique: true,
			validate: {
				isUrl: {
					msg: JSON.stringify(new ServerError("The field is not an URL.", { origin: 'sequelize', type: 'InvalidDataSent'}).toFlatObject())
				}
			}
		},
		paymentId: {
			type: DataTypes.INTEGER,
		},
		preferenceId: {
			type: DataTypes.STRING,
			unique: true,
		},
		paidAt: {
			type: DataTypes.DATE,
			unique: true,
		}

	}, { sequelize: database }
);

export default Order;