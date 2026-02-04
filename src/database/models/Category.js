import database from '../index.js';
import { Model, DataTypes } from 'sequelize';

class Category extends Model { };
Category.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		name: {
			type: DataTypes.STRING,
			unique: true,
			allowNull: true,
			validate: {
				isAlphanumeric: true,
			},
		},
	}, { sequelize: database }
);

export default Category;