import database from "../database/database.js";
import sequelizeErrorManagement from "../utils/sequelizeErrorManagement.js";
import ServerError from "../utils/ServerError.js";
import List from "../database/models/List.js";
import ListItem from "../database/models/ListItem.js";
import Course from "../database/models/Course.js";
import School from "../database/models/School.js";

export const createList = async (req, res) => {
	/*
	Expected Body:
	{
		name: STR -> List name.
		schoolId: NUMBER -> Reference to the school which bealongs the list.
		course: [ gradeId, divId, levelId ] -> Reference to the course of the list.
		assembled: BOOL -> Determinates whether the list has been made by an user or if bealongs to a school.
		items: ARR -> The products that bealongs to the list. [
			{
				productId: NUMBER -> The reference of the product.
				amount: NUMBER -> Quantity of that product.
			}
		]
	}

	*/
	const listTrans = await database.transaction();
	try {
		const { name, schoolId, course: [ gradeId, divId, levelId ], assembled = true, items } = req.body;
		const { id: userId, role: userRole } = req.payload;

		if (!name || assembled == null || Number.isNaN(assembled) || (assembled === false && !schoolId || !gradeId || !divId || !levelId) || (assembled === true && !user)) {
			return res.status(400).json( new ServerError( "There are missing fields in the request.", { origin: 'server', type: 'MissingFields' }));
		}

		//Validate permissions.
		if (assembled === false && userRole !== 'admin') {
			return res.status(403).json( new ServerError( "Permission denied for create this kind of list.", { origin: 'server', type: 'PermissionDenied' }));
		}

		//Search course.
		let course = await Course.findOne({
			where: {
				gradeFk: gradeId,
				divFk: divId,
				levelFk: levelId,
			},
			attributes: ['id'],
			raw: true,
		}, { transaction: listTrans });

		//Create course if it doesn't exists.
		if (!course) 
			course = await Course.create({
				gradeFk: gradeId,
				divFk: divId,
				levelFk: levelId,
			}, { transaction: listTrans });
		
		//Create the list.
		const newList = await List.create({
			name,
			school: schoolId,
			course,
			user: userId,
		}, { transaction: listTrans });

		//Create list elements with products.
		const listItems = await ListItem.bulkCreate(
			items.map(item => ({ product: productId, list: newList.id, amount }))
		, { transaction: listTrans });

		return res.status(201).json({ message: "List created successfully." })
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}

		return res.status(500).json( new ServerError( "Couldn't create a new list.", { origin: 'unknown', type: 'Unknown' }));
	}
}

export const deleteList = async (req, res) => {
	/*
	Expected Body:
	{
		listId: NUMBER -> The reference to the list to delete.
	}
	*/
	try {
		const { listId } = req.body;
		const { role: userRole } = req.payload; 

		//Search list to delete.
		const list = await List.findByPk(listId, { attributes: ['id', 'isAssembled'] });
		
		//Verify if it exists.
		if (!list) {
			return res.status(404).json( new ServerError(
				"List not found.", { origin: 'server', type: 'ResourceNotFound' }
			));
		}

		//Verify user premissions.
		if (!list.isAssembled && userRole !== 'admin') {
			return res.status(403).json( new ServerError(
				"Permission denied for delete this kind of list.", { origin: 'server', type: 'PermissionDenied' }
			));
		}

		//Lists are soft deleted.
		await list.destroy();

		return res.status(200).json({ message: "List delted successfully." });
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}

		return res.status(500).json( new ServerError( "Couldn't delete the list.", { origin: 'unknown', type: 'Unknown' }));
	}
}

export const editList = async (req, res) => {
	try {
		const { listId, newName, newSchool, newCourse } = req.body;
		const { role: userRole } = req.payload;

		const list = await List.findByPk(listId, {
			attributes: ['id', 'isAssembled'],
		})

		if (!list) {
			return res.status(404).json( new ServerError( "Couldn't found the list to update.", { origin: 'server', type: 'ResourceNotFound' }));
		}

		if (!list.isAssembled && userRole !== 'admin') {
			return res.status(403).json( new ServerError( "Permission denied for list edition.", { origin: 'server', type: 'PermissionDenied' }));
		}

		const school = await School.findByPk(newSchool, { attributes: ['id'], raw: true });
		if (!school)
			return res.status(404).json( new ServerError( "Invalid school ID.", { origin: 'server', type: 'ResourceNotFound' } ));

		const course = await Course.findByPk(newCourse, { attributes: ['id'], raw: true });
		if (!course)
			return res.status(404).json( new ServerError( "Invalid course ID.", { origin: 'server', type: 'ResourceNotFound' } ));

		await list.update({
			name: newName,
			course: newCourse,
			school: newSchool,
		});

		return res.status(200).json({ message: "List updated successfully." });
	} catch(error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}

		return res.status(500).json( new ServerError( "Unknown error updating the list.", { origin: 'server', type: 'Unknown' } ));
	}
}

export const addListItem = async (req, res) => {

}

export const removeListItem = async (req, res) => {

}

export const changeAmount = async (req, res) => {

}