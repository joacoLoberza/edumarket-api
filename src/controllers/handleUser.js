import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import User from '../database/models/User.js';

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
			const user = await User.findOne({
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
			} else {
				res.status(403).json({
					message: 'Incorrect password.',
				})
			}
		} else {
			res.status(401).json({
				message: 'User or e-mail and password are required for sign in.',
			})
		}
	} catch (error) {
		if (error.name) {
			switch (error.name) {
				case 'SequelizeDatabaseError':
					res.status(500).json({
						message: 'Error in database query.'
					});
					break;
			}
		} else {
			res.status(500).json({
				message: 'Unknown error creating the seasson.'
			});
		}
	}
}

export const userRegister = async (req, res) => {
	/*
	Expexted body:
	{
		name: STR -> User name.
		email: STR -> User email.
		password: STR -> User password.
		roll: STR -> User roll (admin or client).
		address: STR -> Home address from the user. (OPTIONAL)
	}
	
	Expected file:
		[
			{
				path: STR -> User profile image path in the server. (OPTIONAL)
			}
		] 
	 */
	try {
		const { name, email, password, roll, address } = req.body;
	} catch (error) {

	}
}