import database from '../index.js';
import { Model, DataTypes } from 'sequelize';
import School from './School.js';
import Course from './Course.js';
import User from './User.js';

class List extends Model { };
List.init(
	{
		id: {
			primaryKey: true,
			type: DataTypes.INTEGER,
			autoIncrement: true,
		},
		name: {
			type: DataTypes.STRING,
		},
		school: {
			type: DataTypes.INTEGER,
			references: {
				model: School,
				key: 'id',
			},
			validate: {
				min: 1,
			},
		},
		course: {
			type: DataTypes.INTEGER,
			references: {
				model: Course,
				key: 'id',
			},
			validate: {
				min: 1,
			},
		},
		user: {
			type: DataTypes.INTEGER,
			references: {
				model: User,
				key: 'id',
			},
		},
		isAssembled: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
		}
	}, { sequelize: database }
)

List.beforeCreate((list) => {
	if (list.isAssembled === true) {
		if (list.school != null) {
			console.warn(`Server|\x1b[33m The field school in model List wouldn't be sent in a assembled list, eliminating it...\x1b[0m`);
			list.school = null;
		}
		if (list.course != null) {
			console.warn(`Server|\x1b[33m The field course in model List wouldn't be sent in a assembled list, eliminating id...\x1b[0m`);
			list.course = null;
		}
	} else if (list.isAssembled === false) {
		if (list.user != null) {
			console.warn(`Server|\x1b[33m The field user in model List wouldn't be sent in a assembled list, eliminating id...\x1b[0m`);
			list.user = null;
		}
		if (list.name != null) {
			console.warn(`Server|\x1b[33m The field name in model List wouldn't be sent in a assembled list, eliminating id...\x1b[0m`);
			list.name = null;
		}
	}
})

export default List;