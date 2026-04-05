import { Op } from 'sequelize';
import { v2 as cloudinary } from 'cloudinary';
import School from "../database/models/School.js";
import sequelizeErrorManagement from "../utils/sequelizeErrorManagement.js";
import ServerError from "../utils/ServerError.js";
import startStreaming from "../utils/bufferStreamCloudinary.js";

export const addSchool = async (req, res) => {
	/*
	Expected Body:
	{
		name: STR -> Name of the school.
		cue: STR -> CUE of the school (unique identificator).
	}
	Expected File:
	{
		buffer: OBJ -> The buffer in memory of the school image.
	}
	*/
	try {
		const { cue, name } = req.body;
		const buffer = req?.file?.buffer;
		let image = null;

		//Validate required fields.
		if (!cue || !name) return res.status(400).json( new ServerError("The CUE and name of the school are required.", { origin: 'server', type:'MissingFields' }).toFlatObject());

		//If there is a buffer, upload it to Cloudinary servers.
		if (buffer) {
			const result = await startStreaming(buffer, {dir: 'schoolImages', name: `${Date.now()}-${name}`, type: 'image'});
			image = result.secure_url;
		}

		//Add new school regsiter in the DB.
		const newSchool = await School.create({
			name,
			cue,
			image,
		})

		return res.status(201).json({ message: "School created successfuly." })
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError( "Couldn't add a school.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}

export const getSchools = async (req, res) => {
	/*
		Expected Query: 
		search = The filter of the CUE or name.
		cursor = The index of the pagination.
		order = Order of the query.
		limit = Registers limit.
 	*/
	try {
		let { cursor, search = '', order = 'ASC', limit = 10 } = req.query;
		const escapedSearch = search ? search.replace('%', '\\%').replace('_','\\_') : '%';
		let fakeData = false;

		//Validate required fields.
		if (!Number(limit)) fakeData = true;
		if (cursor) if (!Number(cursor)) fakeData = true;

		if ((order !== 'ASC' && order !== 'DESC') || fakeData) return res.status(400).json( new ServerError(
			"Any query field is invalid.",
			{ origin: 'server', type: 'InvalidDataSent' },
		))

		//Create where clause.
		const filter = {
			[Op.or]: [
				{cue: { [Op.like]: `%${escapedSearch}%`}},
				{name: { [Op.like]: `%${escapedSearch}%`}},
			]
		}

		cursor = Number(cursor)
		if (cursor) {
			filter.id = (order === 'ASC') ? {[Op.gt]: cursor} : {[Op.lt]: cursor};
		}

		//Searh schools.
		const schools = await School.findAll({
			where: filter,
			order: [['id', order]],
			limit: Number(limit),
			attributes: ['id', 'name', 'image', 'cue'],
		})

		return res.status(200).json({
			message: 'Schools found successfully.',
			schools: schools.map(school => school.toJSON()),
			nextCursor: schools.length > 0 ? schools[schools.length - 1].id : null,
		})
	} catch (error) {
		console.log(error)
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError( "Couldn't get the schools.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}

export const deleteSchool = async (req, res) => {
	/*
	Expected Body:
	{
		schoolId: NUMBER -> The id of the school to remove.
	}
	*/
	try {
		const { schoolId } = req.body;

		//Validate required fields.
		if (!schoolId) return res.status(400).json( new ServerError(
			'The school id is required.',
			{ origin: 'server', type: 'MissingFields' },
		))

		//Search school to delete.
		const school  = await School.findByPk(schoolId);
		if (!school) return res.status(404).json( new ServerError(
			'School not found.',
			{ origin: 'server', type: 'ResourceNotFound' },
		))

		//Delte school image if it isn't default.
		if (school.image !== process.env.DEF_SCHOOL_IMG && school.image) cloudinary.uploader.destroy(`schoolImages/${school.image.split('/').pop()}`, { resource_type: 'image' })
		
		//Delete image.
		await school.destroy();
		return res.status(200).json({ message: 'School deleted successfully.' });
	} catch (error) {
		console.log(error)
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError( "Couldn't delete the school.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}

export const editSchool = async (req, res) => {
	/*
	Expected Body:
	{
		schoolId: INT -> The id of the school to update.
		name: STR -> Name of the school to update. | OPTIONAL
		cue: STR -> CUE of the school. | OPTIONAL
	}
	Expected File:
	{
		buffer: OBJ -> The buffer of the school image. | OPTIONAL
	}
	*/
	try {
		const { schoolId, name, cue } = req.body;
		const buffer = req.file?.buffer;
		let image = null;

		//Validate required fields.
		if (!schoolId) return res.status(400).json( new ServerError(
			'The school id is required.',
			{ origin:'server', type:'MissingFields' },
		))

		//Searhc school.
		const school = await School.findByPk(schoolId);
		if (!school) return res.status(404).json( new ServerError(
			'School not found.',
			{ origin: 'server', type:'ResourceNotFound' },
		))

		//If there is an image quit it from Cloudinary and upload the new image.
		if (buffer) {
			if (school.image !== process.env.DEF_SCHOOL_IMG) await cloudinary.uploader.destroy(`schoolImages/${school.image.split('/').pop()}`, { resource_type: 'image' });
			const result = await startStreaming({dir: 'schoolImages', name: `${Date.now()}-${name? name : school.name}`});
			image = result.secure_url;
		}

		//Update school data in the DB.
		await school.update({
			name: name ? name : school.name,
			cue: cue ? cue : school.cue,
			image: image ? image : school.image,
		})

		return res.status(200).json({ message: 'School edited successfully.' })
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError( "Couldn't edit the school.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}