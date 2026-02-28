import database from '../database.js';
import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import ServerError from '../../utils/ServerError.js';

class User extends Model { };
User.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		user: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		dni: {
			type: DataTypes.STRING,
			unique: true,
		},
		name: {
			type: DataTypes.STRING,
		},
		email: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			validate: {
				isEmail: {
					msg: 'El e-mail proporcionado es inválido.'
				},
			},
		},
		password: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		image: {
			type: DataTypes.STRING,
			unique: true,
			//FALTA PONER URL DEFAULT A PERFIL SIN IMAGEN
			validate: {
				isUrl: {
					msg: JSON.stringify(new ServerError(
						`The data provided isn't an url, can't reference the image in the database.`,
						{
							origin: 'sequelize',
							type: 'InvalidDataSent',
						}
					).toFlatObject()),
				}
			}
		},
		address: {
			type: DataTypes.STRING,
		},
		role: {
			type: DataTypes.ENUM('admin', 'client'),
			allowNull: false,
		},
		verified: {
			//This field is for register if the user have verified their account in their e-mail.
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		ttl: { //Time to live when the user isn't verfied.
			type: DataTypes.INTEGER,
		},
		noDestroy: { //In case of accounts don't verified that doesn't got to be destroyed.
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		}
	},
	{
		sequelize: database,
		paranoid: true,
		validate: {
			checkTtl() {
				if (!this.verified && !this.ttl && !this.noDestroy) {
					throw JSON.stringify(new ServerError(
						"The ttl field is a required field.",
						{
							origin: "sequelize",
							type: "InvalidDataSent",
						}
					).toFlatObject());
				} 
			}
		}
	}
);

User.beforeCreate(async (user) => {
	if (user.password) {
		user.password = await bcrypt.hash(user.password, 10);	
	}
})

User.beforeUpdate(async (user) => {
	if (user.changed('password')) {
		user.password = await bcrypt.hash(user.password, 10);
	}
	if (user.changed('recoverToken') && user.deletedAt) {
		user.recoverToken = await bcrypt.hash(user.recoverToken, 10);
	}
})

export default User;