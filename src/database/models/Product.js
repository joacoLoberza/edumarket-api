import database from '../database.js';
import { Model, DataTypes } from 'sequelize';
import ServerError from '../../utils/ServerError.js';
import Category from './Category.js';

class Product extends Model { };
Product.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		stock: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
			validate:{
				min: {
					args: [0],
					msg: 'El stock no puede ser un número negativo.',
				},
			},
		},
		basePrice: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				min: {
					args: [0],
					msg: 'El precio base del producto no puede ser negativo.',
				},
			},
		},
		offerPrice: {
			type: DataTypes.INTEGER,
			validate: {
				min: {
					args: [0],
					msg: 'El precio de oferta no puede ser un número negativo',
				},
			}
		},
		description: {
			type: DataTypes.TEXT,
			defaultValue: 'Este producto no cuenta con una descripción.',
			validate: {
				len: {
					args: [0, 500],
					msg: 'La descripción del producto supera los 500 carácteres.',
				},
			},
		},
		category: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: Category,
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
		image: {
			type: DataTypes.STRING,
			unique: true,
			//FALTA PONER URL DEFAULT PARA IMÁGEN DEL PRODUCTO
		}
	}, { sequelize: database }
);

export default Product;