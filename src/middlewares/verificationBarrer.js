import User from "../database/models/User.js";

const verificationBarrer = async (req, res, next) => {
	try {
		const { id } = req.payload;

		//Verify if it's a verified account.
		const user = await User.findByPk(id);
		if (!user.verified) {
			return res.status(403).json(new ServerError(
				"This account isn't verified.",
				{
					origin: "server",
					type: "PermissionDenied"
				}
			).toFlatObject());
		}

		next();
	} catch (error) {
		if (error.name) {
			switch (error.name) {
				case 'SequelizeTimeoutError':
					return res.status(503).json(new ServerError(
						'Database is overloaded.',
						{
							type: 'Overloaded',
							origin: 'sequelize',
						}
					).toFlatObject());
			}
		}
		return res.status(500).json(new ServerError(
			`Unknown error verfying user's sesson, can't access to the service.`,
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		).toFlatObject());
	}
}

export default verificationBarrer;