import database from "../database/database.js";
import { Op } from 'sequelize';
import sequelizeErrorManagement from "../utils/sequelizeErrorManagement.js";
import ServerError from "../utils/ServerError.js";
import List from "../database/models/List.js";
import ListItem from "../database/models/ListItem.js";
import Course, { Grade, Level, Div } from "../database/models/Course.js";
import School from "../database/models/School.js";
import Product from "../database/models/Product.js";
import Category from "../database/models/Category.js";

export const getLists = async (req, res) => {
	try {
		let { cursor, search = '', order = 'ASC', limit = 10, isAssembled, levelId, gradeId, divId } = req.query;
		const userId = req.payload?.id;

		cursor = Number(cursor);
		limit = Number(limit);
		search = search.replace('%', '\\%').replace('_', '\\_');
		isAssembled = isAssembled === 'true'? true : isAssembled === 'false'? false : undefined;

		if (isAssembled == null || Number.isNaN(isAssembled) || isNaN(limit) || cursor == null || cursor === false || (order !== 'ASC' && order != 'DESC')) {
			return res.status(400).json( new ServerError("Invalid query filters.", { origin: 'server', type: 'InvalidDataSent' }))
		}

		const lists = await List.findAll({
			where: {
				id: {
					...(cursor ?
						(order === 'ASC') ?
							{ [Op.gt]: cursor } :
							{ [Op.lt]: cursor } :
						{}
					),
					[Op.in]: database.literal(`(
						SELECT DISTINCT \`List\`.\`id\`
						FROM \`List\`
						INNER JOIN \`ListItem\` AS \`LItem\` ON \`LItem\`.\`list\` = \`List\`.\`id\`
							INNER JOIN \`Product\` AS \`Prod\` ON \`Prod\`.\`id\` = \`LItem\`.\`product\`
						LEFT JOIN \`School\` ON \`School\`.\`id\` = \`List\`.\`school\`
						LEFT JOIN \`Course\` ON \`Course\`.\`id\` = \`List\`.\`course\`
							LEFT JOIN \`Level\` AS \`Lvl\` ON \`Lvl\`.\`id\` = \`Course\`.\`levelFk\`
							LEFT JOIN \`Div\` ON \`Div\`.\`id\` = \`Course\`.\`divFk\`
							LEFT JOIN \`Grade\` ON \`Grade\`.\`id\` = \`Course\`.\`gradeFk\`
						WHERE
							(\`List\`.\`name\` LIKE :search OR
							\`Prod\`.\`name\` LIKE :search OR
							\`School\`.\`name\` LIKE :search) AND
							\`List\`.\`isAssembled\` = :isAssembled
							${isAssembled? ` AND
								\`List\`.\`user\` = :usr`:
								levelId && gradeId && divId? ` AND
								\`Lvl\`.\`id\` LIKE :lvl AND
								\`Grade\`.\`id\` LIKE :grd AND
								\`Div\`.\`id\` LIKE :div
								`: ''
							}
					)`),
				},
			},
			replacements: {
				search: `%${search}%`,
				isAssembled,
				lvl: levelId,
				grd: gradeId,
				div: divId,
				usr: userId,
			},
			order: [['id', order]],
			limit,
			attributes: ['id', 'name'],
			include: [
				{
					model: ListItem,
					attributes: ['id', 'amount'],
					include: {
						model: Product,
						attributes: ['id', 'name', 'basePrice', 'offerPrice', 'image'],
						include: {
							model: Category,
							attributes: ['id', 'uiName'],
						}
					}
				},
				{
					model: Course,
					attributes: ['id'],
					include: [
						{ model: Level },
						{ model: Grade },
						{ model: Div },
					],
				},
				{
					model: School,
					attributes: ['id', 'name', 'image'],
				}
			]
		})

		const rawLists = lists.map(list => {
			list = list.toJSON();

			list.items = list.ListItems.map(LItem => {
				LItem.itemId = LItem.id;
				LItem.prodId = LItem.Product.id;
				delete LItem.id;
				delete LItem.Product.id;
				let newItem = { ...LItem, ...LItem.Product};
				delete newItem.Product;
				return newItem;
			});
		
			if (list.Course && list.School) {
				list.course = {
					id: list.Course.id,
					name: [
						list.Course.Level.level,
						list.Course.Grade.number,
						list.Course.Div.word,
					]
				};

				list.school = list.School;
			}

			delete list.ListItems;
			delete list.Course;
			delete list.School;

			return list;
		});

		return res.status(200).json({
			message: "Lists got successfully.",
			lists: rawLists,
			nextCursor: lists.length > 0 ? lists[lists.length-1].id : null,
		});
	} catch(error) {
		console.log(error)
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}

		return res.status(500).json( new ServerError(
			"Couldn't get the lists.",
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		))
	}
}

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
		req.body.course = req.body.course || {};
		const { name, schoolId, course: { gradeId, divId, levelId }, assembled = false, items } = req.body;
		const { id: userId, role: userRole } = req.payload;

		if (assembled == null || Number.isNaN(assembled) || (!assembled && (!schoolId || !gradeId || !divId || !levelId)) || (assembled && !name)) {
			await listTrans.rollback();
			return res.status(400).json( new ServerError(
				"There are missing fields in the request.",
				{
					origin: 'server',
					type: 'MissingFields'
				}).toFlatObject());
		}

		//Validate permissions.
		if (assembled === false && userRole !== 'admin') {
			await listTrans.rollback();
			return res.status(403).json( new ServerError( 
				"Permission denied for create this kind of list.",
				{
					origin: 'server',
					type: 'PermissionDenied'
				}).toFlatObject());
		}

		//Search course.
		let course = null;
		if (gradeId && levelId && divId) {
			course = await Course.findOne({
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
		}

		//Create the list.
		const newList = await List.create({
			name,
			school: schoolId,
			course: course?.id,
			user: assembled? userId : undefined,
			isAssembled: assembled,
		}, { transaction: listTrans });

		//Create list elements with products.
		const listItems = await ListItem.bulkCreate(
			items.map(item => ({ product: item.productId, list: newList.id, amount: item.amount }))
		, { transaction: listTrans });

		await listTrans.commit();

		return res.status(201).json({ message: "List created successfully." })
	} catch (error) {
		await listTrans.rollback();
		
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}

		return res.status(500).json( new ServerError( "Couldn't create a new list.", { origin: 'unknown', type: 'Unknown' }).toFlatObject());
	}
}

export const deleteList = async (req, res) => {
	/*
	Expected Param:
	{
		id -> The reference to the list to delete.
	}
	*/

	const listTrans = await database.transaction();
	try {
		const listId = Number(req.params.id);
		const { role: userRole, id: userId } = req.payload; 

		//Search list to delete.
		const list = await List.findByPk(listId, { attributes: ['id', 'isAssembled', 'user', 'course'] });
		
		//Verify if it exists.
		if (!list) {
			await listTrans.rollback();
			return res.status(404).json( new ServerError(
				"List not found.", { origin: 'server', type: 'ResourceNotFound' }
			).toFlatObject());
		}

		//Verify user premissions.
		if ((!list.isAssembled && userRole !== 'admin') || (list.isAssembled && list.user !== userId)) {
			await listTrans.rollback();
			return res.status(403).json( new ServerError(
				"Permission denied for delete this kind of list.", { origin: 'server', type: 'PermissionDenied' }
			).toFlatObject());
		}

		const lists = await List.findAll({
			where: {
				course: list.course,
				id: {
					[Op.ne]: list.id,
				}
			}
		});

		if (lists.length === 0) {
			await Course.destroy({
				where: {
					id: list.course, 
				}
			}, {transaction: listTrans});
		}

		//Lists are soft deleted.
		await list.destroy({transaction: listTrans});

		await listTrans.commit();
		return res.status(200).json({ message: "List deleted successfully." });
	} catch (error) {
		await listTrans.rollback();
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}

		return res.status(500).json( new ServerError( "Couldn't delete the list.", { origin: 'unknown', type: 'Unknown' }));
	}
}

export const editList = async (req, res) => {
	const listTrans = await database.transaction();
	try {
		req.body.newCourse = req.body.newCourse || {};
		const { newName, newSchool, newCourse: {lvlId, divId, grdId} } = req.body;
		const listId = Number(req.params.id);
		const { role: userRole, id: userId } = req.payload;

		const list = await List.findByPk(listId, {
			attributes: ['id', 'isAssembled', 'user'],
		})

		if (!list) {
			await listTrans.rollback();
			return res.status(404).json( new ServerError( "Couldn't found the list to update.", { origin: 'server', type: 'ResourceNotFound' }).toFlatObject());
		}

		if ((!list.isAssembled && userRole !== 'admin') || (list.isAssembled && list.user !== userId)) {
			await listTrans.rollback();
			return res.status(403).json( new ServerError( "Permission denied for list edition.", { origin: 'server', type: 'PermissionDenied' }).toFlatObject());
		}

		let course = undefined;
		if (!list.isAssembled) {
			if (newSchool) {
				const school = await School.findByPk(newSchool, { attributes: ['id'], raw: true });
				if (!school) {
					await listTrans.rollback();
					return res.status(404).json( new ServerError( "Invalid school ID.", { origin: 'server', type: 'ResourceNotFound' } ).toFlatObject());
				}
			}

			if (lvlId && grdId && divId) {
				course = await Course.findOne({
					attributes: ['id'],
					raw: true,
					where: {
						levelFk: lvlId,
						gradeFk: grdId,
						divFk: divId,
					}
				});
				if (!course)
					course = await Course.create({
						levelFk: lvlId,
						gradeFk: grdId,
						divFk: divId,
					}, {transaction: listTrans});
				course = course.id;
			}
		}

		await list.update(list.isAssembled? {
			name: newName
		}:{
			course: course,
			school: newSchool,
		}, {transaction: listTrans});

		await listTrans.commit();
		return res.status(200).json({ message: "List updated." });
	} catch(error) {
		console.log(error)
		await listTrans.rollback();
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}

		return res.status(500).json( new ServerError( "Unknown error updating the list.", { origin: 'server', type: 'Unknown' } ).toFlatObject());
	}
}

export const addListItem = async (req, res) => {
	try {
		const { items } = req.body;
		const listId = Number(req.params.id);
		const { role: userRole, id: userId } = req.payload;

		if (!items || !listId) {
			return res.status(400).json( new ServerError("Couldn't create a list item.", { origin: 'server', type: 'MissingFields' }).toFlatObject());
		}

		const list = await List.findByPk(listId, { attributes: ['id', 'isAssembled', 'user'], raw: true });
		
		if (!list) {
			return res.status(404).json( new ServerError("Couldnt add list items, list not found.", { origin: 'server', type: 'ResourceNotFound' }).toFlatObject());
		}
		if ((!list.isAssembled && userRole !== 'admin') || (list.isAssembled && list.user !== userId)) {
			return res.status(403).json( new ServerError("This user is not allowed to modify the list.", { origin: 'server', type: 'PermissionDenied' }).toFlatObject());
		}

		const newItems = await ListItem.bulkCreate(items.map(item => ({
			product: item.productId,
			amount: item.amount,
			list: listId,
		})));

		return res.status(201).json({ message: "Products added successfully to the list." })
	} catch(error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}

		return res.status(500).json( new ServerError(
			"Couldn't add products to the list.",
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		).toFlatObject());
	}
}

export const removeListItem = async (req, res) => {
	try {
		const itemId = Number(req.params.id);
		const { role: userRole, id: userId } = req.payload;

		const listItem = await ListItem.findByPk(itemId, {
			attributes: ['id'],
			include: {
				model: List,
				attributes: ['isAssembled', 'user'],
			}
		});
		if (!listItem) {
			return res.status(404).json( new ServerError("List product not found.", { origin: 'server', type:'ResourceNotFound' }));
		}

		if ((userRole !== 'admin' && !listItem.List.isAssembled) || (listItem.List.isAssembled && listItem.List.user !== userId)) {
			return res.status(403).json( new ServerError("Permission denied for modify this list.", { origin: 'server', type: 'PermissionDenied' }));
		} 
		
		await listItem.destroy();

		return res.status(200).json({ message: 'List element deleted successfully.'})
	} catch (error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError("Coludn't delete the list element.", { origin: 'unknown', type: 'Unknown' }));
	}
}

export const changeAmount = async (req, res) => {
	try {
		const { amount } = req.body;
		const itemId = Number(req.params.id);
		const { role: userRole, id: userId } = req.payload;

		const listItem = await ListItem.findByPk(itemId, {
			attributes: ['id'],
			include: {
				model: List,
				attributes: ['isAssembled', 'user'],
			}
		});
		if (!listItem) {
			return res.status(404).json( new ServerError("List product not found.", { origin: 'server', type:'ResourceNotFound' }));
		}

		if ((userRole !== 'admin' && !listItem.List.isAssembled) || (listItem.List.isAssembled && listItem.List.user !== userId)) {
			return res.status(403).json( new ServerError("Permission denied for modify this list.", { origin: 'server', type: 'PermissionDenied' }));
		}

		const newItem = await listItem.update({ amount });

		return res.status(200).json({
			message: "Product amount for the list item updated successfully.",
			newItem,
		});
	} catch(error) {
		if (error?.name.includes('Sequelize')) {
			return await sequelizeErrorManagement(req, res, error);
		}
		return res.status(500).json( new ServerError("Coludn't delete the list element.", { origin: 'unknown', type: 'Unknown' }));
	}
}