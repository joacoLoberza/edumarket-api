import ServerError from '../../utils/ServerError.js';
import database from '../database.js';
import { Model, DataTypes } from 'sequelize';

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
				min: {
					args: [1],
					msg: 'No se puede ingresar un grado de curso menor a 1.'
				},
				max: {
					args: [7],
					msg: 'No se puede ingresar un grado de curso mayor a 7.'
				},
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
				is: {
					args: /^[A-Za-z-]+$/,
					msg: 'Solo se admiten letras del abecedario o -.',
				},
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
				min: {
					args: [1],
					msg: JSON.stringify(new ServerError(
						`Can't create a new course, invalid PK entered in the DB.`,
						{
							origin: 'sequelize',
							type: 'InvalidDataSent',
						}
					).toFlatObject()),
				},
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
				min: {
					args: [1],
					msg: JSON.stringify(new ServerError(
						`Can't create a new course, invalid PK entered in the DB.`,
						{
							origin: 'sequelize',
							type: 'InvalidDataSent',
						}
					).toFlatObject()),
				},
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
				min: {
					args: [1],
					msg: JSON.stringify(new ServerError(
						`Can't create a new course, invalid PK entered in the DB.`,
						{
							origin: 'sequelize',
							type: 'InvalidDataSent',
						}
					).toFlatObject()),
				},
			},
		},
		checkSum: {
			type: DataTypes.INTEGER,
			allowNull: false,
			unique: true,
			validate: {
				min: {
					args: [3],
					msg: JSON.stringify(new ServerError(
						`Invalid course.`,
						{
							origin: 'sequelize',
							type: 'InvalidDataSent',
						}
					)),
				}
			}
		}
	}, { sequelize: database }
);

export default Course;