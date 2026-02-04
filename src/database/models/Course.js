import database from '../index.js';
import { Model, DataTypes, DATE } from 'sequelize';

class Course extends Model { };
Course.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		gradeFk: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: Grade,
				key: 'id',
			},
			validate: {
				min: 1,
			},
		},
		divFk: {
			type: DataTypes.INTEGER,
			allowNull: true,
			references: {
				model: Div,
				key: 'id',
			},
			validate: {
				min: 1,
			},
		},
		levelFk: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: Level,
				key: 'id',
			},
			validate: {
				min: 1,
			},
		},
	}, { sequelize: database }
);

export class Grade extends Model { };
Grade.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		number: {
			type: DataTypes.INTEGER,
			unique: true,
			allowNull: false,
			validate: {
				min: 1,
				max: 7,
			}
		},
	}, { sequelize: database }
);

export class Div extends Model { };
Div.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		word: {
			type: DataTypes.CHAR(1),
			unique: true,
			allowNull: false,
			validate: {
				is: /^[A-Za-z-]+$/,
			},
		},
	}, { sequelize: database }
);

export class Level extends Model { };
Level.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		level: {
			type: DataTypes.STRING,
			unique: true,
			allowNull: false,
		},
	}, { sequelize: database }
);

export default Course;