import database from '../index.js';
import { Model, DataTypes } from 'sequelize';

class RevokedSeasson extends Model { };
RevokedSeasson.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		uuid: {
			type: DataTypes.UUID,
			allowNull: false,
			validate: {
				isUUID: true,
			},
		},
	}
); export default RevokedSeasson;