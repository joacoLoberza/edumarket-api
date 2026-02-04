import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import User from '../database/models/User.js';
import Product from '../database/models/Product.js';

export const userLogin = async (req, res) => {
	/*
	Expected Body:
	{
		identifier: STR -> User name.
		password: STR -> User password.
	}
	*/
	try {
		const { identifier, password } = req.body;

		if (identifier && password) {
			const user = User.findOne({
				where: {
					[Op.or] : [
						{ name: identifier },
						{ email: identifier },
					]
				}
			})

			if (!user) res.status(404).json({
				message: `Can't find the user in the model User.`
			})

			const validPass = await bcrypt.compare(password, user.password);
			const validIdentity = (identifier === user.name || identifier === user.email);

			if (validIdentity && validPass) {
				const token = jwt.sign(
					{
						id: user.id,
						roll: user.roll,
					},
					process.env.JWT_SECRET,
					{
						algorithm: 'RS256',
						expiresIn: '12h',
						jwtid: uuidv4(),
					}
				);

				res.status(201).json({
					message: 'New seasson cerated successfuly.',
					token,
					user: {
						id: user.id,
						name: user.name,
						image: user.image,
					}
				})
			}
		}
	}
	
	if (identifier, password)
}