import multer from 'multer';
import ServerError from '../../utils/ServerError.js';

const multipartProcess = ({
	required = false, //If is required to recibe a file.
	size, //The max expected size for all fields.
	processorType = 'single', //Method for multer instance.
	fields = 'field',//Argument for the method.
}) => {

	let processor = null; //This will be the middleware that will give us the instance of multer.
	
	//Create the instance of Multer.
	const limits = size? { fileSize: size } : {};
	const instance = multer({
		storage: multer.memoryStorage(),
		limits,
	})

	//Create the middleware.
	try {
		if (processorType === 'single') {
			processor = instance.single(fields);
		}
		if (processorType === 'fields') {
			processor = instance.fields(fields);
		}
		if (processorType === 'array') {
			processor = instance.array(fields);
		}
		if (processorType === 'any') {
			processor = instance.any();
		}
	} catch (error) {
		console.error(`Server|\x1b[34m Error creating a multer processor, (processor type does not match whit fields argument).\x1b[0m`);
		return res.status(500).json( new ServerError(
			"Technical error processing the image.",
			{
				origin: 'server',
				type: 'Internal',
			}
		).toFlatObject());
	}

	//Returns the middleware whit the callback of error handling.
	return (req, res, next) => {
		processor(req, res, async (error) => {
			if (error) {
				if (error instanceof multer.MulterError) {
					//Manage the Multer errors.
					switch (error.code) {
						case 'LIMIT_FILE_SIZE':
							return res.status(422).json( new ServerError(
								`The file is too heavy. Max size sopported is ${size}.`,
								{
									origin: 'multer',
									type: 'InvalidDataSent',
								}
							).toFlatObject() );
							break;
						case 'LIMIT_UNEXPECTED_FILE':
							return res.status(400).json( new ServerError(
								`The file was sent in a incorrect field or wasn't recibed.`,
								{
									origin: 'multer',
									type: 'MissingFields',
								}
							).toFlatObject() );
							break;
					}
				}
				return res.status(500).json( new ServerError(
					`Unknown error processing the file sent.`,
					{
						origin: 'multer',
						type: 'Unknown',
					}
				).toFlatObject() );
			}

			if (!(req.file || (req.files && (Array.isArray(req.files) ? req.files.length > 0 : Object.values(req.files).length > 0)))) {
				if (required) {
					return res.status(400).json( new ServerError(
						`Is required to send a file.`,
						{
							origin: 'server',
							type: 'MissingFields',
						}
					).toFlatObject() );
				}
				return next();
			}
			
			next();
		})
	}
}

export default multipartProcess;