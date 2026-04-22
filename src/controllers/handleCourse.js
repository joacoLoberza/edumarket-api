import Course from "../database/models/Course.js";
import List from "../database/models/List.js";
import { Grade, Div, Level } from "../database/models/Course.js";
import sequelizeErrorManagement from "../utils/sequelizeErrorManagement.js";
import ServerError from "../utils/ServerError.js";
import School from "../database/models/School.js";

export const getGrades = async (req, res) => {
	try {
		const grades = await Grade.findAll();
		if (grades.length === 0) {
			return res.status(404).json( new ServerError("The grades wheren't found.", {origin: 'server', type: 'ResourceNotFound'}).toFlatObject());
		}
		return res.status(200).json({
			message: "Grades found successfully.",
			grades: grades.map(grade => grade.toJSON()),
		})
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError("Couldn't get the grades.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}

export const getDivisions = async (req, res) => {
	try {
		const divs = await Div.findAll();
		if (divs.length === 0) {
			res.status(404).json( new ServerError("The divisions wheren't found.", { origin: 'server', type: 'ResourceNotFound'}).toFlatObject());
		}
		return res.status(200).json({
			message: "Divisions found successfuly.",
			divisions: divs.map(div => div.toJSON()),
		})
	} catch(error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError("Error searching the divisions of the grades.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}

export const getLevels = async (req, res) => {
	try {
		const levels = await Level.findAll();
		if (levels.length === 0) {
			return res.status(404).json( new ServerError("The education levels wheren't found.", { origin: 'server', type:'ResourceNotFound' }).toFlatObject());
		}
		return res.status(200).json({
			message: "Education levels found successfully.",
			levels: levels.map(level => level.toJSON()),
		})
	} catch(error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError("Error searching the education levels.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}

export const addLevel = async (req, res) => {
	/*
	Expected Body:
	{
		lvl: STR -> Name of the level.
	}
	*/
	try {
		const { level } = req.body;
		if (typeof level !== 'string') {
			return res.status(422).json( new ServerError("The level name wasn't sent or is nor valid.", { origin: 'server', type: 'InvalidDataSent' }).toFlatObject());
		}

		const newLevel = await Level.create({ level });
		return res.status(201).json({ message: 'Level added successufly.' });
	} catch(error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError("The level couldn't be added.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}

export const addDivision = async (req, res) => {
	/*
	Expected Body:
	{
		word: STR -> The word that identify the division.
	}
	*/
	try {
		const { word } = req.body;
		if (typeof word !== 'string') {
			res.status(422).json( new ServerError("The divison name is invalid or wasn't sent.", { origin: 'server', type: 'InvalidDataSent' }).toFlatObject());
		}

		const newDiv = await Div.create({ word });
		return res.status(201).json({ message: 'Divison created successfuly.' })
	} catch(error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError("The division couldn't be added.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}

export const addGrade = async (req, res) => {
	/*
	Expected Body:
	{
		number: NUMBER -> The number of the grade or year.
	}
	*/
	try {
		const { number } = req.body;
		if (typeof number !== 'number') {
			res.status(422).json( new ServerError("The grade's number is invalid or wasn't sent.", { origin: 'server', type: 'InvalidDataSent' }).toFlatObject());
		}

		const newGrade = await Grade.create({ number });
		return res.status(201).json({ message: 'Grade created successfuly.' })
	} catch(error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError("The grade couldn't be added.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}

export const deleteLevel = async (req, res) => {
	/*
	ExpectedBody:
	{
		levelId: NUMBER -> The id of the grade to delete.
	}
	*/
	try {
		const { levelId } = req.body;

		if (!levelId) {
			return res.status(400).json( new ServerError( "Field level is required.", { origin: 'server', type: 'MissingFields' }));
		}

		const lists = await List.findAll({
			attributes: ['id'],
			include: [
				{
					model: Course,
					attributes: ['id'],
					include: [
						{
							model: Div,
							attributes: ['word'],
						},
						{
							model: Grade,
							attributes: ['number'],
						},
						{
							model: Level,
							attributes: ['level'],
							where: {
								id: levelId,
							},
							required: true,
						}
					]
				},
				{
					model: School,
					attributes: ['name'],
				}
			]
		})

		if (lists.length !== 0) {
			let error = new ServerError( "Can't delete the level. There are courses that use alerdy use it.", { origin: 'server', type:'Conflict'}).toFlatObject();
			error.info = lists.map(list => ({
				id: list.id,
				course: list.Course.Grade.number + '° ' + list.Course.Div.word,
				level: list.Course.Level.level,
				school: list.School.name
			}));
			return res.status(409).json(error);
		}

		const levelToDelete = await Level.findByPk(levelId);
		if (!levelToDelete) {
			return res.status(404).json( new ServerError( "The educational level wasn't found.", { origin: 'server', type: 'ResourceNotFound' }).toFlatObject());
		}
		await levelToDelete.destroy();

		return res.status(200).json({
			message: 'Level deleted successfully.',
		})
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError( "Unknown error deleting the level.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}

export const deleteDivision = async (req, res) => {
	/*
	ExpectedBody:
	{
		divisionId: NUMBER -> The id of the grade to delete.
	}
	*/
	try {
		const { divId } = req.body;
		
		if (!divId) {
			return res.status(400).json( new ServerError( "Field div is required.", { origin: 'server', type: 'MissingFields' }));
		}

		const lists = await List.findAll({
			attributes: ['id'],
			include: [
				{
					model: Course,
					attributes: ['id'],
					include: [
						{
							model: Div,
							attributes: ['word'],
							where: {
								id: divId,
							},
							required: true,
						},
						{
							model: Grade,
							attributes: ['number'], 
						},
						{
							model: Level,
							attributes: ['level'],
						}
					]
				},
				{
					model: School,
					attributes: ['name'],
				}
			]
		})

		if (lists.length !== 0) {
			let error = new ServerError( "Can't delete the division. There are courses that use alerdy use it.", { origin: 'server', type:'Conflict'}).toFlatObject();
			error.info = lists.map(list => ({
				id: list.id,
				course: list.Course.Grade.number + '° ' + list.Course.Div.word,
				level: list.Course.Level.level,
				school: list.School.name
			}));
			return res.status(409).json(error);
		}

		const divToDelete = await Div.findByPk(divId);
		if (!divToDelete) {
			return res.status(404).json( new ServerError( "The division wasn't found.", { origin: 'server', type: 'ResourceNotFound' }).toFlatObject());
		}
		await divToDelete.destroy();

		return res.status(200).json({
			message: 'Division deleted successfully.',
		})
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError( "Unknown error deleting the dbision.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}

export const deleteGrade = async (req, res) => {
	/*
	ExpectedBody:
	{
		gradeId: NUMBER -> The id of the grade to delete.
	}
	*/
	try {
		const { gradeId } = req.body;

		if (!gradeId) {
			return res.status(400).json( new ServerError( "Field grade is required.", { origin: 'server', type: 'MissingFields' }));
		}

		const lists = await List.findAll({
			attributes: ['id'],
			include: [
				{
					model: Course,
					attributes: ['id'],
					include: [
						{
							model: Div,
							attributes: ['word'],
						},
						{
							model: Grade,
							attributes: ['number'], 
							where: {
								id: gradeId,
							},
							required: true,
						},
						{
							model: Level,
							attributes: ['level'],
						}
					]
				},
				{
					model: School,
					attributes: ['name'],
				}
			]
		})

		if (lists.length !== 0) {
			let error = new ServerError( "Can't delete the grade. There are courses that use alerdy use it.", { origin: 'server', type:'Conflict'}).toFlatObject();
			error.info = lists.map(list => ({
				id: list.id,
				course: list.Course.Grade.number + '° ' + list.Course.Div.word,
				level: list.Course.Level.level,
				school: list.School.name
			}));
			return res.status(409).json(error);
		}

		const gradeToDelete = await Grade.findByPk(gradeId);
		if (!gradeToDelete) {
			return res.status(404).json( new ServerError( "The grade wasn't found.", { origin: 'server', type: 'ResourceNotFound' }).toFlatObject());
		}
		await gradeToDelete.destroy();

		return res.status(200).json({
			message: 'Grade deleted successfully.',
		})
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError( "Unknown error deleting the grade.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}