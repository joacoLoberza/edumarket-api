import multer from 'multer';
import sharp from 'sharp';
import ServerError from '../utils/ServerError.js';

const multipartProcess = ({ size, widthRestrict, heightRestrict, required = false, type = 'image'}) => {
	//Create empty middleware whit Multer.
	const limits = size? { fileSize: size } : {};
	const processor = multer({
		storage: multer.memoryStorage(), //Indicate that the files will be saved in a buffer.
		limits, //If size restricition, establish the restriction.
	}).single('file') //Specify what what to do whit the empty middleware. As .single() is called, it will recibe one file in the field 'file'.

	return (req, res, next) => {
		processor(req, res, /*Callback (next() param, after file processing):*/async (error) => {
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
								`The file was sent in a incorrect field or wasn't recibed in the field "field"`,
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

			if (!req.file) {
				if (required) {
					return res.status(400).json( new ServerError(
						`The file field is required.`,
						{
							origin: 'server',
							type: 'MissingFields',
						}
					).toFlatObject() );
				}
				return next();
			}

			//Validate the image resolution.
			if (type === 'image') {
				try {
					const image = sharp(req.file.buffer);
					const { width, height } = await image.metadata();

					if (width > widthRestrict || height > heightRestrict) {
						return res.status(422).json( new ServerError(
							`The image resolution is higher than the spected (width: ${widthRestrict}px, height:${heightRestrict}px).`,
							{
								origin: 'server',
								type: 'InvalidDataSent',
							}
						).toFlatObject() );
					}
					return next();
				} catch (error) {
					if (error.code === 'EINPUT') {
						return res.status(500).json( new ServerError(
							`Unespected error prossecing the image (it's lost).`,
							{
								origin: 'sharp',
								type: 'ResourceNotFound',
							}
						).toFlatObject() );
					} else {
						return res.status(500).json( new ServerError(
							`Unknown error validating the image.`,
							{
								origin: 'unknown',
								type: 'Unknown',
							}
						).toFlatObject() );
					}
				}
			}
			
			next();
		})
	}
}

export default multipartProcess;