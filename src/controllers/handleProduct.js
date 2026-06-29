import { Op } from 'sequelize';
import { v2 as cloudinary } from 'cloudinary';
import sequelizeErrorManagement from '../utils/sequelizeErrorManagement.js';
import startStreaming from '../utils/bufferStreamCloudinary.js';
import ServerError from '../utils/ServerError.js';
import Product from '../database/models/Product.js';
import Category from '../database/models/Category.js';

export const getPrdocuts = async (req, res) => {
	try {
		let {cursor, limit = 16, order = 'ASC', search = '', category } = req.query;

		search = search.replace('%', '\\_').replace('_', '\\_')
		cursor = cursor ? Number(cursor) : undefined;
		limit = Number(limit);
		if (Number.isNaN(cursor) || Number.isNaN(limit) || (order !== 'ASC' && order !== 'DESC'))
			res.status(400).json( new ServerError("Invalid data in query fields.", { origin: 'server', type:'InvalidDataSent' }));

		const products = await Product.findAll({
			where: {
				... category?
					{category}:
					{},
				name: {
					[Op.like]: `%${search}%`
				},
				... cursor?
					order === 'ASC'?
						{ id: {[Op.gt]: cursor}}:
						{ id: {[Op.lt]: cursor}}:
					{},
			},
			order: [['id', order]],
			limit,
			attributes: ['id', 'name', 'basePrice', 'offerPrice', 'image' ],
			include: {
				model: Category,
				attributes: ['id', 'uiName'],
			},
			raw: false,
		});
		
		console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(products)));
		
		const rawProducts = products.map(product => {
			product = product.toJSON();
			product.category = product.Category.uiName;
			product.categoryId = product.Category.id;
			delete product.Category;
			return product;
		});

		return res.status(200).json({
			message: "Products found successfully.",
			products: rawProducts,
			nextCursor: products.length > 0? products[products.length - 1].id : null,
		})
	} catch(error) {
		console.log(error)
		if (error?.name.includes('Sequelize'))
			return await sequelizeErrorManagement(req, res, error);

		return res.status(500).json( new ServerError(
			"Error searching the products.",
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		));
	}
};

export const getProdDetails = async (req, res) => {
	try {
		let { id: prodId } = req.params;
		const role = req?.payload?.role;

		prodId = Number(prodId);
		if (Number.isNaN(prodId))
			return res.status(400).json( new ServerError('Invalid product id.', { origin: 'server', type: 'InvalidDataSent'}));

		const product = await Product.findByPk(prodId, {
			attributes: ['id', 'name', 'description', 'basePrice', 'offerPrice', 'image', 'stock'],
			include: {
				model: Category,
				attributes: ['id', 'uiName'],
			}
		});

		let rawProduct = product.toJSON();
		rawProduct.category = rawProduct.Category.uiName;
		rawProduct.categoryId = rawProduct.Category.id;
		delete rawProduct.Category;

		if (role !== 'admin') {
			rawProduct.out = rawProduct.stock > 0? false : true;
			delete rawProduct.stock;
		}

		return res.status(200).json({
			message: "Product found successfully.",
			product: rawProduct,
		})
	} catch(error) {
		console.log(error)
		if (error?.name.includes('Sequelize'))
			return await sequelizeErrorManagement(req, res, error);

		return res.status(500).json( new ServerError(
			"Error searching the product information.",
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		));
	}
};

export const createProduct = async (req, res) => {
	try {
		const { name, stock, basePrice, description, catId, image } = req.body;
		const buffer = req.file	? req.file?.buffer : undefined;

		if (isNaN(basePrice) || isNaN(stock) || isNaN(catId))
			return res.status(400).json( new ServerError("Incorrect data in request fields.", { origin:'server', type:'InvalidDataSent'}));

		if (!name || !basePrice || !catId)
			return res.status(400).json( new ServerError("There are fields left in the request.", {origin: 'server', type: 'MissingFields'}));

		const category = await Category.findByPk(catId, {attributes: ['id']});
		if (!category)
			return res.status(422).json( new ServerError("Invalid category id, category doesn't exists.", {type: 'InvalidDataSent', origin: 'server'}));

		const newProduct = await Product.create({
			name,
			basePrice,
			category: catId,
			... stock? { stock } : {},
			... description? { description } : {},
			... image? {
				image: (await startStreaming( buffer, { dir: 'productImages', name: `${Date.now()}-${name}`, type: 'image'})).then(r => r.secure_url)
			} : {},
		});

		return res.status(201).json({
			message: "New product created."
		});
	} catch(error) {
		if (error?.name.includes('Sequelize'))
			return await sequelizeErrorManagement(req, res, error);
		
		return res.status(500).json( new ServerError("Error creating a new product.", { origin: 'unknown', type: 'Unknown' }));
	}
};

export const updateProduct = async (req, res) => {
	try {
		const { newName, newCatId, newDescription, newStock, newBasePrice, newOfferPrice } = req.body;
		const buffer = req.file ? req.file?.buffer : undefined;
		let { id: prodId } = req.params;

		prodId = Number(prodId);
		if (Number.isNaN(prodId))
			return res.status(400).json( new ServerError("Unexpected product id.", { origin: 'server', type: 'InvalidDataSent' }));

		const product = await Product.findByPk(prodId, {attributes: ['id', 'image']});
		if (!product)
			return res.status(404).json( new ServerError("Couldn't found the product.", { origin: 'server', type: 'ResourceNotFound' }));

		let prodBody = {
			name: newName,
			category: newCatId,
			description: newDescription,
			stock: newStock,
			basePrice: newBasePrice,
			offerPrice: newOfferPrice,
		};
		
		if (buffer) {
			if (product.image !== process.env.DEF_PROD_IMG)
				await cloudinary.uploader.destroy(`productImages/${product.image.split('/').pop()}`, { resource_type: 'image' });
			prodBody.image = (await startStreaming( buffer, { dir: 'productImages', type: 'image' })).then(r => r.secure_url);
		}

		const newProduct = await product.update(prodBody);

		return res.status(200).json({
			message: "Product updated successfully."
		})
	} catch(error) {
		if (error?.name.includes('Sequelize'))
			return await sequelizeErrorManagement(req, res, error);
		
		return res.status(500).json( new ServerError("Error updating the product.", { origin: 'unknown', type: 'Unknown' }));
	}
};

export const deleteProuct = async (req, res) => {
	try {
		let { id: prodId } = req.params;

		prodId = Number(prodId);
		if (Number.isNaN(prodId))
			return res.status(400).json( new ServerError("Invalid product id.", { origin: 'server', type: 'InvalidDataSent' }));

		const product = await Product.findByPk(prodId, {attributes: ['id', 'image']});
		if (!prodId)
			return res.status(404).json( new ServerError("Product not found.", { origin: 'server', type: 'ResourceNotFound' }));

		if (product.image !== process.env.DEF_PROD_IMG)
			await cloudinary.uploader.destroy(`productImages/${product.image.split('/').pop()}`, {resource_type: 'image'});
		
		await product.update({
			image: null,
			stock: null,
			description: null,
		})

		await product.destroy();

		return res.status(200).json({
			message: "Product deleted successfully.",
		})
	} catch(error) {
		if (error?.name.includes('Sequelize'))
			return await sequelizeErrorManagement(req, res, error);
		
		return res.status(500).json( new ServerError("Error deleting the product.", { origin: 'unknown', type: 'Unknown' }));
	}
};