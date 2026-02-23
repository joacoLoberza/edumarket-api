/**
 * @typedef { 'unknown' | 'server' | 'sequelize' | 'cloudinary' | 'jwt' | 'multer' | 'sharp' | 'nodemailer' } ErrorOrigin
 * @typedef { 'ResourceNotFound' | 'InvalidCredentials' | 'MissingFields' | 'Overloaded' | 'Unknown' | 'InvalidDataSent' | 'UniqueDataRepeated' | 'JWTLeft' | 'InvalidJWT' | 'PermissionDenied' } ErrorType
 */

class ServerError {
	/**
	 * @param {string} message
	 * @param {Object} options
	 * @param {ErrorType} options.type
	 * @param {ErrorOrigin} options.origin
	 * @param {string} options.uiMessage
	 */
	constructor(message, { type, origin, uiMessage }) {
		const allowedOrgins = [
			'unknown',
			'server',
			'sequelize',
			'cloudinary',
			'jwt',
			'multer',
			'sharp',
			'nodemailer',
		];
		const allowedTypes = [
			'ResourceNotFound',
			'InvalidCredentials',
			'MissingFields',
			'Overloaded',
			'Unknown',
			'InvalidDataSent',
			'UniqueDataRepeated',
			'JWTLeft',
			'InvalidJWT',
			'PermissionDenied',
		];

		this.origin = (allowedOrgins.includes(origin)) ? origin : `${origin}  \x1b[33;1m[!]\x1b[22m(This is not an expected origin in the server.)\x1b[0m`;
		this.type = (allowedTypes.includes(type)) ? type : `${type}  \x1b[33;1m[!]\x1b[22m(This is not an expected type in the server.)\x1b[0m`;
		this.message = String(message);
		this.uiMessage = uiMessage || null;
		this.controlled = true;
	}

	toFlatObject() {
		return {
			origin: this.origin,
			type: this.type,
			message: this.message,
		}
	}
}

export default ServerError;