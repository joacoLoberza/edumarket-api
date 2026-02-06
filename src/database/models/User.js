import database from '../index.js';
import { Model, DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';

class User extends Model { };
User.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		email: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
			validate: {
				isEmail: true,
			},
		},
		password: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		image: {
			type: DataTypes.STRING,
			unique: true,
			//FALTA PONER RUTA DEFAULT A PERFIL SIN IMAGEN
		},
		address: {
			type: DataTypes.STRING,
		},
		roll: {
			type: DataTypes.ENUM('admin', 'client'),
			allowNull: false,
		},
	}, { sequelize: database }
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
})

export default User;