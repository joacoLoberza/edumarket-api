import ServerError from "../utils/ServerError.js";

const adminBarrer = (req, res, next) => {
	//Verify if the user is admin.
	if (req.payload.role !== 'admin') {
		return res.status(403).json( new ServerError(
			"A client can't do this operation.",
			{
				origin: 'server',
				type: 'PermissionDenied',
			}
		).toFlatObject());
	}
	next();
}

export default adminBarrer;