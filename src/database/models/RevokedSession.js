import database from '../database.js';
import { Model, DataTypes } from 'sequelize';
import ServerError from '../../utils/ServerError.js';

class RevokedSession extends Model { };
RevokedSession.init(
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
				isUUID: {
					args: 4,
					msg: JSON.stringify(new ServerError(
						`Can't revoke the token, provided uuid field is not UUID.`,
						{
							type:'InvalidDataSent',
							origin: 'sequelize',
						}
					).toFlatObject()),
				},
			},
		},
		exp: {
			type: DataTypes.INTEGER,
			allowNull: false,
			validate: {
				min: {
					args: [0],
					msg: JSON.stringify(new ServerError(
						`Can't revoke the token, provided expiration date is ivalid because is negative.`,
						{
							type: 'InvalidDataSent',
							origin: 'sequelize',
						}
					).toFlatObject()),
				},
			},
		},
	}, { sequelize: database }
); export default RevokedSession;