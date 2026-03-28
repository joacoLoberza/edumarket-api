import { Op } from 'sequelize';
import { v2 as cloudinary } from 'cloudinary';
import Category from '../database/models/Category.js'
import sequelizeErrorManagement from '../utils/sequelizeErrorManagement.js'
import ServerError from '../utils/ServerError.js';
import startStreaming from '../utils/bufferStreamCloudinary.js';

export const addCategory = async (req, res) => {
	/*
	Expected Body:
	{
		catName: STR -> The name of the category to add.
	}
	*/
	try {
		const { catName } = req.body;
		const buffer = req.file? req.file.buffer : null;
		let image = null; //Here it saves the url to Cloudinary.

		//The buffer is the image of the category in the server memory. Here it uplad it to Cloudinary servers if the buffer exists.
		if (buffer) {
			const result = await startStreaming(buffer, { dir: 'categoryImages', name:`${Date.now()}-${catName}`, type: 'image'});
			if (result) image = result.secure_url;
		}
		//Add the register of the category.
		const categoryData = {
			uiName: catName,
		};
		if (image) categoryData.image = image;
		const newCat = await Category.create(categoryData)

		return res.status(201).json({
			message: "New category added successfully.",
		})
	} catch(error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}

		if (error?.origin === 'cloudinary') {
			return res.status(502).json( new ServerError(
				"Error uploading the category image to the server.",
				{
					origin: 'cloudinary',
					type: 'Unknown',
				}
			).toFlatObject());
		}

		return res.status(500).json( new ServerError(
			"Unkown error adding a new category.",
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		).toFlatObject());
	}
}

export const quitCategory = async (req, res) => {
	try {
		/*
		Expected Body:
		{
			catId: NUMBER -> The id of the category to delete.
		}
		*/
		const { catId } = req.body;

		//Search the category to delete.
		const catToDelete = await Category.findByPk(catId)
		if (!catToDelete) {
			return res.status(404).json( new ServerError(
				"Couldn't found the category.",
				{
					origin: 'server',
					type: 'ResourceNotFound',
				}
			).toFlatObject());
		}

		//Quit the image from the Cloudinary's server and the url from the register in the DB.
		if (catToDelete.image && catToDelete.image !== process.env.DEF_CAT_IMG) await cloudinary.uploader.destroy(`categoryImages/${catToDelete.image.split('/').pop()}`, {resource_type: 'image'});

		//Do soft delete.
		await catToDelete.destroy();

		return res.status(200).json({
			message: "Category deleted successfuly."
		})
	} catch(error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}

		if (error?.error?.message) {
			return res.status(502).json( new ServerError(
				"Error deleting the image from the server.",
				{
					origin: 'cloudinary',
					type: 'Unknown',
				}
			).toFlatObject());
		}

		return res.status(500).json( new ServerError(
			"Unknown error deleting a category.",
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		).toFlatObject());
	}
}

export const getCategories = async (req, res) => {
	/*
	Expexted Querys:
	{
		timestamp: Is the time when the front saved the categorys data in the local storage. The fromat is in ms since 1970 (Date.now()). 
	}
	*/
	try {
		/* This timestamp is because this controller will send only the categorys added/updated since this timestamp.
		 * The ide of this is that the frontend saves the categorys in the local sotrage and only search the new categroys in a new request.
		 */
		const timestamp = req.query.timestamp? new Date(Number(req.query.timestamp)) : new Date(0);

		//Search categorys.
		const categories = await Category.findAll({
			attributes: ['id', 'uiName', 'image', 'deletedAt'],
			where: {
				updatedAt: {[Op.gt]:timestamp}
			}
		});

		return res.status(200).json({
			categories: categories.map(cat => cat.toJSON()),
		})
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		
		return res.status(500).json( new ServerError(
			"Unknown error getting the categorys.",
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		).toFlatObject());
	}
}

export const updateCategories = async (req, res) => {
	/*
	Expected Body:
	{
		namesList: ARR [{ newName: STR -> New name to the cateogry., id: NUMBER -> Id f the category to update. }] -> The array of the categorys.
	}
	Note: The expected fields name in the files processed whit any() would have this format: image-id
	*/
	try {
		const { namesList } = req.body;
		let fake = [];
		let nameIdArr = [];
		let imageIdArr = [];


		nameIdArr = namesList.map(name => name.id);
		if (req.files) {
			imageIdArr = req.files.map(file => Number(file.fieldname.split('-')[1]));
		}
		const catIDs = [... new Set([... nameIdArr, ... imageIdArr])];

		const categories = await Category.findAll({
			where: {
				id: {[Op.in]: catIDs},
			},
			attributes: ['id', 'name', 'image'],
		})

		fake = catIDs.map(id => {
			let found = false;
			for (const cat of categories) {
				if (id === cat.id) {
					found = true;
					break;
				}
			}
			if (!found) {
				return {id, error: 'ResourceNotFound'}
			}
		})

		for (const category of categories) {
			try {
				const newName = namesList.find(name => name.id === category.id).newName;
				category.uiName = newName;
				if (req.files) {
					const file = req.files.find(file => Number(file.fieldname.split('-')[1]) === category.id);
					if (file) {
						if (category.image !== process.env.DEF_CAT_IMG && category.image) {
							await cloudinary.uploader.destroy(`categoryImages/${category.image.split('/').pop()}`, { resource_type: 'image' });
						}
						const result = await startStreaming(file.buffer, { dir: 'categoryImages', name: `${Date.now()}-${newName}`, type: 'image' });
						category.image = result.secure_url;
					}
				}
				await category.save();
			} catch(error) {
				fake.push({ id:category.id, error: 'Internal'})
			}
		}

		return res.status(200).json({
			message: 'Categories updated.',
			success: catIDs.length - fake.length,
			totalFaild: fake.length,
			faild: fake,
		})
	} catch(error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		
		return res.status(500).json( new ServerError(
			"Uncknown error updating categorys.",
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		).toFlatObject());
	}
}