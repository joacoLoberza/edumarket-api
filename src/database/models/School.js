import database from '../database.js';
import { Model, DataTypes } from 'sequelize';
import ServerError from '../../utils/ServerError.js';

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
		image: {
			type: DataTypes.STRING,
			defaultValue: process.env.DEF_SCHOOL_IMG,
			validate: {
				isUrl: {
					msg: JSON.stringify( new ServerError( "This field requires an url.", { origin: 'sequelize', type:'InvalidDataSent' }).toFlatObject())
				}
			}
		},
		cue: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			validate: {
				isNumeric: {
					msg: 'Numero CUE invalido.'
				},
				checkFigures() {
					let total = 0;
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
	}, { sequelize: database, paranoid: true }
);

export default School;