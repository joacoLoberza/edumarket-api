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
		onDelete: 'SET NULL',
	});
	List.belongsTo(Course, {
		foreignKey: 'course',
		onDelete: 'SET NULL',
	});

	School.hasMany(List, {
		foreignKey: 'school',
		onDelete: 'SET NULL',
	});
	List.belongsTo(School, {
		foreignKey: 'school',
		onDelete: 'SET NULL',
	});

	List.hasMany(ListItem, {
		foreignKey: 'list',
	});
	ListItem.belongsTo(List, {
		foreignKey: 'list',
	});

	Product.hasMany(ListItem, {
		foreignKey: 'product',
		onDelete: 'RESTRICT'
	});
	ListItem.belongsTo(Product, {
		foreignKey: 'product',
		onDelete: 'RESTRICT'
	});

	Product.hasMany(OrderItem, {
		foreignKey: 'product',
		onDelete: 'RESTRICT'
	});
	OrderItem.belongsTo(Product, {
		foreignKey: 'product',
		onDelete: 'RESTRICT'
	});

	Order.hasMany(OrderItem, {
		foreignKey: 'order',
	});
	OrderItem.belongsTo(Order, {
		foreignKey: 'order',
	});
	
	List.hasMany(OrderItem, {
		foreignKey: 'list',
		onDelete: 'RESTRICT'
	});
	OrderItem.belongsTo(List, {
		foreignKey: 'list',
		onDelete: 'RESTRICT'
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

	});
	CartItem.belongsTo(Cart, {
		foreignKey: 'cart',
	});

	Category.hasMany(Product, {
		foreignKey: 'category',
		onDelete: 'SET NULL'
	});
	Product.belongsTo(Category, {
		foreignKey: 'category',
		onDelete: 'SET NULL'
	});

	User.hasOne(Cart, {
		foreignKey: 'user',
	});
	Cart.belongsTo(User, {
		foreignKey: 'user',
	});

	User.hasMany(Order, {
		foreignKey: 'user',
		onDelete: 'RESTRICT'
	});
	Order.belongsTo(User, {
		foreignKey: 'user',
		onDelete: 'RESTRICT'
	});

	User.hasMany(List, {
		foreignKey: 'user',
		onDelete: 'SET NULL'
	});
	List.belongsTo(User, {
		foreignKey: 'user',
		onDelete: 'SET NULL'
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
			await Product.bulkCreate([
				{
					name: 'Faber Castelle 25 u',
					stock: 340,
					basePrice: 6700,
					offerPrice: 4500,
					description: 'Caja de colores Faber Castelle con 25 unidades.',
					category: 1,
				},
				{
					name: 'Hojas Gloria',
					stock: 500,
					basePrice: 6700,
					offerPrice: null,
					description: 'Posole',
					category: 1,
				},
				{
					name: 'Holanda',
					stock: 34,
					basePrice: 6600,
					offerPrice: 4200,
					description: 'Example',
					category: 1,
				},
				{
					name: 'Lápiz HB',
					stock: 200,
					basePrice: 500,
					offerPrice: 400,
					description: 'Lápiz de grafito HB.',
					category: 1,
				},
				{
					name: 'Cuaderno A4',
					stock: 150,
					basePrice: 1200,
					offerPrice: null,
					description: 'Cuaderno rayado A4.',
					category: 1,
				},
			]);
			await School.bulkCreate([
				{
					name: 'Escuela Primaria N°1',
					cue: '1234567',
				},
				{
					name: 'Escuela Secundaria N°2',
					cue: '2345678',
				},
				{
					name: 'Instituto Educativo N°3',
					cue: '3456789',
				},
				{
					name: 'Colegio Privado N°4',
					cue: '4567890',
				},
				{
					name: 'Escuela Técnica N°5',
					cue: '5678901',
				},
			], { ignoreDuplicates: true });
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