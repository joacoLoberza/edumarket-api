import database from '../database.js';
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
				isAlphanumeric: {
					msg: 'El nombre de la categoría deber ser alfanumérico.',
				},
			},
		},
	}, { sequelize: database }
);

export default Category;