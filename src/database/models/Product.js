import database from '../index.js';
import { Model, DataTypes } from 'sequelize';
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
				min: 0,
			},
		},
		basePrice: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				min: 0,
			},
		},
		offerPrice: {
			type: DataTypes.INTEGER,
			validate: {
				min: 0,
			}
		},
		description: {
			type: DataTypes.TEXT,
			defaultValue: 'Este producto no cuenta con una descripción.',
			validate: {
				len: [0, 500],
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
				min: 1,
			},
		},
		image: {
			type: DataTypes.STRING,
			unique: true,
		}
	}, { sequelize: database }
);

export default Product;