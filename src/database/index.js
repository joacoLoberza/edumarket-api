import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { Grade, Div, Level } from './models/School.js';
import School from './models/School.js';
import User from './models/User.js';
import Product from './models/Product.js';
import OrderItem from './models/OrderItem.js';
import Order from './models/Order.js';
import ListItem from './models/ListItem.js';
import List from './models/List.js';
import Course from './models/Course.js';
import Category from './models/Category.js';
import CartItem from './models/CartItem.js';
import Cart from './models/Cart.js';

const database = new Sequelize(
	process.env.DB_NAME,
	process.env.DB_USER,
	process.env.DB_PASSWORD,
	{
		host: process.env.DB_HOST,
		port: 3306,
		dialect: 'mysql',
		logging: (msg) => {
			const logDir = '/home/u917654584/domains/edumarketmendoza.com/logs';
			if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

			const logFile = path.join(logDir, 'sequelize.log');
			const timestamp = new Date().toISOString();
			fs.appendFile(logFile, `[${timestamp}] ${msg}\n`, (error) => {
				if (error) {console.log(`Server|\x1b[31m Error registering sequelize logs.\x1b[0m\n\nError Object:\n`, error)}
			})
		},
		timezone: '-03:00',
		pool: {
			max: 5,
			min: 0,
			acquire: 45000,
			idle: 100000,
		},
		define: {
			timestamps: true,
			freezeTableName: true,
		},
	}
);

export const createRealtionships = () => {
	Grade.hasMany(Course, {
		foreignKey: 'gradeFk',
	});
	Course.belongsTo(Grade, {
		foreignKey: 'gradeFk',
	});

	Div.hasMany(Course, {
		foreignKey: 'divFk',
	});
	Course.belongsTo(Div, {
		foreignKey: 'divFk',
	});

	Level.hasMany(Course, {
		foreignKey: 'levelFk',
	});
	Course.belongsTo(Level, {
		foreignKey: 'levelFk',
	});

	Course.hasMany(List, {
		foreignKey: 'course',
	});
	List.belongsTo(Course, {
		foreignKey: 'course',
	});

	School.hasMany(List, {
		foreignKey: 'school',
	});
	List.belongsTo(School, {
		foreignKey: 'school',
	});

	List.hasMany(ListItem, {
		foreignKey: 'list',
	});
	ListItem.belongsTo(List, {
		foreignKey: 'list',
	});

	Product.hasMany(ListItem, {
		foreignKey: 'product',
	});
	ListItem.belongsTo(Product, {
		foreignKey: 'product',
	});

	Product.hasMany(OrderItem, {
		foreignKey: 'product',
	});
	OrderItem.belongsTo(Product, {
		foreignKey: 'product',
	});

	Order.hasMany(OrderItem, {
		foreignKey: 'order',
	});
	OrderItem.belongsTo(Order, {
		foreignKey: 'order',
	});
	
	List.hasMany(OrderItem, {
		foreignKey: 'list',
	});
	OrderItem.belongsTo(List, {
		foreignKey: 'list',
	});

	Product.hasMany(CartItem, {
		foreignKey: 'product',
	});
	CartItem.belongsTo(Product, {
		foreignKey: 'product',
	});

	Cart.hasMany(CartItem, {
		foreignKey: 'cart',
	});
	CartItem.belongsTo(Cart, {
		foreignKey: 'cart',
	});

	Category.hasMany(Product, {
		foreignKey: 'category',
	});
	Product.belongsTo(Category, {
		foreignKey: 'category',
	});

	User.hasOne(Cart, {
		foreignKey: 'user',
	});
	Cart.belongsTo(User, {
		foreignKey: 'user',
	});

	User.hasMany(Order, {
		foreignKey: 'user',
	});
	Order.belongsTo(User, {
		foreignKey: 'user',
	});

	User.hasMany(List, {
		foreignKey: 'user',
	});
	List.belongsTo(User, {
		foreignKey: 'user',
	});
};

export const syncDBConnection = async () => {
	try {
		console.log('\x1b[34m%s\x1b[0m', 'Node| Checking data base connection...');
		await database.authenticate();

		console.log('\x1b[34m%s\x1b[0m', 'Node| Verifying if the models exists in the data base...')
		await database.sync().then(async () => {
			await Grade.bulkCreate([
				{ number: 1 },
				{ number: 2 },
				{ number: 3 },
				{ number: 4 },
				{ number: 5 },
				{ number: 6 },
				{ number: 7 },
			], { ignoreDuplicates: true });

			await Div.bulkCreate([
				{ word: '-' },
				{ word: 'A' },
				{ word: 'B' },
				{ word: 'C' },
			], { ignoreDuplicates: true });

			await Level.bulkCreate([
				{ level: 'primaria' },
				{ level: 'jardín' },
			], { ignoreDuplicates: true });
		})
	} catch (error) {
		switch (error.name) {
			case 'SequelizeConnectionRefusedError':
				console.error('\x1b[34m%s \x1b[31m%s', 'Node| ', `Couldn't connect whit MySQL service.`);
				break;
			case 'SequelizeAccessDeniedError':
				console.error('\x1b[34m%s \x1b[31m%s\x1b[0m', 'Node| ', 'Data base access denied, invalid credentials.')
				break;
			case 'SequelizeDatabaseError':
				console.error('\x1b[34m%s \x1b[31m%s\x1b[0m', 'Node| ', `Couldn't found the data base.`)
				break;
			case 'SequelizeHostNotFoundError':
				console.error('\x1b[34m%s \x1b[31m%s\x1b[0m', 'Node| ', `Couldn't connect whit the data base server.`)
				break;
			default:
				console.log('Error Detail:\n', error)
		}
	}
};

export default database;