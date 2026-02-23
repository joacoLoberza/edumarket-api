import { v2 as cloudinary } from 'cloudinary';
import { Grade, Div, Level } from './models/Course.js';
import database from './database.js';
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

export const createRealtionships = () => {
	Grade.hasMany(Course, {
		foreignKey: 'gradeFk',
	});
	Course.belongsTo(Grade, {
		foreignKey: 'gradeFk',
	});

	Div.hasMany(Course, {
		foreignKey: 'divFk',
		onDelete: 'CASCADE',
	});
	Course.belongsTo(Div, {
		foreignKey: 'divFk',
		onDelete: 'CASCADE',
	});

	Level.hasMany(Course, {
		foreignKey: 'levelFk',
		onDelete: 'CASCADE',
	});
	Course.belongsTo(Level, {
		foreignKey: 'levelFk',
		onDelete: 'CASCADE',
	});

	Course.hasMany(List, {
		foreignKey: 'course',
		onDelete: 'CASCADE',
	});
	List.belongsTo(Course, {
		foreignKey: 'course',
		onDelete: 'CASCADE',
	});

	School.hasMany(List, {
		foreignKey: 'school',
		onDelete: 'CASCADE',
	});
	List.belongsTo(School, {
		foreignKey: 'school',
		onDelete: 'CASCADE',
	});

	List.hasMany(ListItem, {
		foreignKey: 'list',
		onDelete: 'CASCADE',
	});
	ListItem.belongsTo(List, {
		foreignKey: 'list',
		onDelete: 'CASCADE',
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
		onDelete: 'CASCADE',
	});
	CartItem.belongsTo(Cart, {
		foreignKey: 'cart',
		onDelete: 'CASCADE',
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
		console.log('\x1b[34m%s\x1b[0m%s', 'Node|', ' Checking data base connection...');
		await database.authenticate();

		console.log('\x1b[34m%s\x1b[0m%s', 'Node|', ' Verifying if the models exists in the data base...')
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
				console.error('\x1b[34m%s \x1b[31m%s\x1b[0m', 'Node| ', `Couldn't connect whit MySQL service.`);
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

export const cloudinaryConnection = async () => {
	cloudinary.config({
		cloud_name: process.env.CL_NAME,
		api_key: process.env.CL_KEY,
		api_secret: process.env.CL_SECRET,
	})
}