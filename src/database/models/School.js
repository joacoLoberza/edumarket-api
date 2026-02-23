import database from '../database.js';
import { Model, DataTypes } from 'sequelize';

class School extends Model { };
School.init(
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
		cue: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			validate: {
				isAlpha: {
					msg: 'Numero CUE invalido.'
				},
				checkFigures() {
					const total = 0;
					for (const figure of this.cue) {
						total += 1;
					}
					if (total !== 7) {
						console.error(`Server|\x1b[31m Error in the model School in cue field, invalid CUE number (there aren't 7 figures).\x1b[0m`);
						throw new Error('Número de CUE invalido.');
					}
				}
			},
		},
	}, { sequelize: database }
);

export default School;