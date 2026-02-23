import streamifier from 'streamifier';
import { v2 as cloudinary } from 'cloudinary';
/**
 * @param {any} buffer
 * @param {Object} options
 * @param {string} options.dir
 * @param {string} options.format
 * @param {string} options.name
 * @param	{string} options.type
 */
const startStreaming = (buffer, { dir, format, name, type }) => {
	return new Promise((resolve, reject) => {
		const streamWriter = cloudinary.uploader.upload_stream(
			{
				folder: dir,
				format,
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
		streamifier.createReadStream(buffer).pipe(streamWriter)
	})
}

export default startStreaming;