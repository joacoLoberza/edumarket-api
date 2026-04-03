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

	List.hasMany(CartItem, {
		foreignKey: 'list',
	});
	CartItem.belongsTo(List, {
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
		await database.sync({ force: true }).then(async () => {
			//Temporal, de desarrollo (quitar el froce: true del sync cuando se quite esto o antes de la producción).
			await User.create({
				user: 'user-1d99768a-f2a9-4459-b119-5b380384f184',
				dni: '48968281',
				name: 'Joaquín Loberza',
				email: 'loberzajoaquin@gmail.com',
				password: '1234',
				address: 'San Lorenzo 208, Ciudad de Mendoza',
				role: 'admin',
				verified: true,
			});
			await Cart.create({
				user: 1,
				totalPrice: 0.0,
			})
			await Category.create({
				uiName: 'Colores',
			});
			await Product.create({
				name: 'Faber Castelle 25 u',
				stock: 340,
				basePrice: 6700,
				offerPrice: 4500,
				description: 'Caja de colores Faber Castelle con 25 unidades.',
				category: 1,
			});
			//Hasta acá es lo de temporal.
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
				{ level: 'Primario' },
				{ level: 'Jardín' },
			], { ignoreDuplicates: true });
		})
	} catch (error) {
		console.log(error)
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