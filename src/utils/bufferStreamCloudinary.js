import streamifier from 'streamifier';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
/**
 * @param {any} buffer
 * @param {Object} options
 * @param {string} options.dir
 * @param {string} options.name
 * @param	{string} options.type
 */
const startStreaming = async (buffer, { dir, name, type }) => {
	const webpBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer();
	return new Promise((resolve, reject) => {
		const streamWriter = cloudinary.uploader.upload_stream(
			{
				folder: dir,
				public_id: name,
				resource_type: type,
				overwrite: true,
			},
			(error, result) => {
				if (!error) {
					resolve(result);
				} else {
					error.origin = 'cloudinary';
					reject(error);
				}
			}
		)
		streamifier.createReadStream(webpBuffer).pipe(streamWriter)
	})
}

export default startStreaming;