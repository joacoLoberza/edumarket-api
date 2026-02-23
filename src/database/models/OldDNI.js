import database from "../database.js";
import { DataTypes, Model } from "sequelize";
import User from "./User.js";
import ServerError from "../../utils/ServerError.js";

class OldDNI extends Model {};
OldDNI.init({
	id: {
		primaryKey: true,
		autoIncrement: true,
		type: DataTypes.INTEGER,
	},
	dni: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	roleAtArchiving: {
		type: DataTypes.ENUM('admin', 'client'),
		allowNull: false,
	},
	archivedBy: {
		type: DataTypes.INTEGER,
		allowNull: false,
		references: {
			model: User,
			key: 'id',
		},
		validate: {
			min: {
				args: [0],
				msg: JSON.stringify( new ServerError(
					`Invalid foreign key.`,
					{
						origin: 'sequelize',
						type: 'InvalidDataSent',
					}
				).toFlatObject() ),
			}
		}
	},
	user: {
		type: DataTypes.INTEGER,
		allowNull: false,
		references: {
			model: User,
			key: 'id',
		},
		validate: {
			min: {
				args: [0],
				msg: JSON.stringify( new ServerError(
					`Invalid foreign key.`,
					{
						origin: 'sequelize',
						type: 'InvalidDataSent',
					}
				).toFlatObject() ),
			}
		}
	}
}, { sequelize: database, timestamps: true });

export default OldDNI;