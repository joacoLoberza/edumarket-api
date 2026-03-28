import sharp from 'sharp';

export const imageValidator = ({widthRestrict, heightRestrict}) => {
	return async (req, res, next) => {
		if (req.file || req.files) {
			//Transform req files into itrable arrays.
			let fields = null;
			if (req?.file) {
				fields = [[req.file]];
			} else if (Array.isArray(req?.files)) {
				fields = [req.files];
			} else if (Object.prototype.toString.call(req?.files) === '[object Object]') {
				fields = Object.values(req.files);
			}

			//Iterate only images.
			for (const field of fields) {
				for (const file of field) {
					if (file.mimetype.includes('image/')) {
						try {
							const image = sharp(file.buffer);
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
				}
			}
		}
		next();
	}
}