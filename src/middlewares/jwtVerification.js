import jwt from 'jsonwebtoken';
import ServerError from '../utils/ServerError.js';
import RevokedSeasson from '../database/models/RevokedSession.js';
import User from '../database/models/User.js';

const jwtVerify = async (req, res, next) => {
	try {
		//Check if token was sent.
		const token = req.headers?.authorization?.split(' ')[1];

		if (!token) {
			return res.status(401).json(new ServerError(
				`A session (JSONWebToken) is required for know user's identity.`,
				{
					origin: 'server',
					type: 'JWTLeft',
				}
			).toFlatObject());
		}

		//Verify token.
		const readToken = jwt.verify(token, process.env.JWT_SECRET);

		//Verifiy if the session has been loged out.
		const revoked = await RevokedSeasson.findOne({
			attributes: ['uuid'],
			where: {
				uuid: readToken.jti,
			}
		});

		if (revoked) {
			return res.status(403).json(new ServerError(
				`This session has been revoked.`,
				{
					origin: 'server',
					type: 'InvalidJWT',
				}
			).toFlatObject());
		}

		req.payload = readToken;
		next();
	} catch (error) {
		if (error.name) {
			switch (error.name) {
				case 'TokenExpiredError':
					return res.status(403).json(new ServerError(
						`Access denied, expired JWT.`,
						{
							origin: 'jwt',
							type: 'InvalidJWT',
						}
					).toFlatObject());
				case 'JsonWebTokenError':
					return res.status(401).json(new ServerError(
						`Invalid JWT.`,
						{
							origin: 'jwt',
							type: 'InvalidJWT',
						}
					).toFlatObject());
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

export default jwtVerify;