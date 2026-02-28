import { defaultMaxListeners } from "nodemailer/lib/xoauth2";
import ServerError from "./ServerError";

const sequelizeErrorManagement = async (req, res, error, options) => {
	/**
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 * @param {import('sequelize').BaseError} error
	 * @param {Array<{name: string, code: number, message: string, origin: string, callback: Function}>} options - The name is the type of Sequelize error, message is the message to show in the frontend console, and the callback is somthing to execute instead of the default code.
	 */
	const type = 'sequelize';
	switch (error.name) {
		case 'SequelizeValidationError':
			const validation = options.find(option => option.name = 'Validation');

			if (validation.callback) {
				await validation.callback(req, res, error)
			} else {
				const errMsg = error.errors[0]?.message;
				const code = validation.code? validation.code : 422;
				const message = validation.message? validation.message : "There are invalid fields in the request.";
				const origin = validation.options.origin? validation.origin : 'InvalidDataSent';
		
				try {
					return res.status(code).json(JSON.parse(errMsg));
				} catch (error) {
					return res.status(code).json( new ServerError(
						message,
						{
							origin,
							type,
							uiMessage: errMsg,
						}
					).toFlatObject());
				}
			}
			break;
		case 'SequelizeUniqueConstraintError':
			const uniqueConstraint = options.find(option => option.name = 'UniqueConstraint');

			if (uniqueConstraint.callback) {
				await uniqueConstraint.callback(req, res, error)
			} else {
				const code = uniqueConstraint.code? uniqueConstraint.code : 409;
				const message = uniqueConstraint.message? uniqueConstraint.message : "There are fields that exeed the unique constraint.";
				const origin = uniqueConstraint.options.origin? uniqueConstraint.origin : 'UniqueDataRepeated';

				return res.status(code).json( new ServerError(
					message,
					{
						origin,
						type,
					}
				).toFlatObject());
			}
			break;
		case 'SequelizeTimeoutError':
			const timeout = options.find(option => option.name = 'Timeout');

			if (timeout.callback) {
				await timeout.callback(req, res, error)
			} else {
				const code = timeout.code? timeout.code : 503;
				const message = timeout.message? timeout.message : "The database is overloaded, so the query cannot be procesed.";
				const origin = timeout.options.origin? timeout.origin : 'Overloaded';

				return res.status(code).json( new ServerError(
					message,
					{
						origin,
						type,
					}
				).toFlatObject());
			}
			break;
		case 'SequelizeDatabeseError':
			const queryError = options.find(option => option.name = 'Timeout');

			if (queryError.callback) {
				await queryError.callback(req, res, error)
			} else {
				const code = queryError.code? queryError.code : 500;
				const message = queryError.message? queryError.message : "Cannot proceed whit the request, there are errors in the databae query.";
				const origin = queryError.options.origin? queryError.origin : 'Query';

				return res.status(code).json( new ServerError(
					message,
					{
						origin,
						type,
					}
				).toFlatObject());
			}
			break;
		default:
			return res.status(500).json(  new ServerError (
						`Unknown database error closing the session.`,
						{
							origin: 'sequelize',
							type: 'Unknown'
						}
					).toFlatObject());
	}
}

export default sequelizeErrorManagement;