import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import ServerError from '../utils/ServerError.js';
import clearRevokedJWT from '../utils/cronJobs/clearRevokedJWT.js';
import startStreaming from '../utils/bufferStreamCloudinary.js';
import clearUnverified from '../utils/cronJobs/clearUnverified.js';
import transporter from '../utils/mailTrans.js';
import User from '../database/models/User.js';
import Cart from '../database/models/Cart.js';
import RevokedSession from '../database/models/RevokedSession.js';
import OldDNI from '../database/models/OldDNI.js';

const createUserField = async () => {
	let userExists = true;
	let user = null;
	while (userExists) {
		user = `user-${uuidv4()}`;
		const compareUser = await User.findOne({ attributes:['user'], where: { user } });
		if (!compareUser) userExists = false;
	}
	return user;
}

export const userLogin = async (req, res) => {
	/*
	Expected Body:
	{
		identifier: STR -> User name.
		password: STR -> User password.
	}
	*/
	clearRevokedJWT().catch(error => {
		console.error(`Server| \x1b[33mCouldn't clear revoked tokens in a routine login.\x1b[0m`);
	});

	try {
		const { identifier, password } = req.body;

		//Validate fields recived.
		if (!identifier || !password) {
			const srvErr = new ServerError(
				'User or e-mail and password are required for sign in.',
				{
					type: 'MissingFields',
					origin: 'server',
				}
			);
			return res.status(401).json( srvErr.toFlatObject() );
		}

		//Search user and check if it exists.
		const user = await User.findOne({
			where: {
				[Op.or] : [
					{ user: identifier },
					{ email: identifier },
				]
			}
		})

		if (!user) {
			const srvErr = new ServerError(
				`Can't find the user in the model User.`,
				{
					type: 'ResourceNotFound',
					origin: 'server',
				}
			);
			return res.status(404).json( srvErr.toFlatObject() );
		}

		//Validate user's password.
		const validPass = await bcrypt.compare(password, user.password);

		if (!validPass) {
			const srvErr = new ServerError(
				'Incorrect password.',
				{
					type: 'InvalidCredentials',
					origin: 'server',
				}
			);
			return res.status(401).json( srvErr.toFlatObject() );
		}

		//Create and send token and user information.
		const token = jwt.sign(
			{
				id: user.id,
				role: user.role,
			},
			process.env.JWT_SECRET,
			{
				expiresIn: '12h',
				jwtid: uuidv4(),
			}
		);

		return res.status(201).json({
			message: 'New session created successfuly.',
			token,
			user: {
				id: user.id,
				name: user.name,
				image: user.image,
			}
		})

	} catch (error) {
		if (error.name) {
			switch (error.name) {
				case 'SequelizeTimeoutError':
					const srvErr = new ServerError(
						"Database is overloaded; unable to complete the controller's operation.",
						{
							type: 'Overloaded',
							origin: 'sequelize',
						}
					)
					return res.status(503).json( srvErr.toFlatObject() );
			}
		}
		const srvErr = new ServerError(
			'Unknown error creating the session.',
			{
				type: 'Unknown',
				origin: 'server',
			}
		)
		return res.status(500).json( srvErr.toFlatObject() );
	}
}

export const userLogout = async (req, res) => {
	try {
		const { exp, jti } = req.payload;

		const newRevToken = await RevokedSession.create(
			{
				uuid: jti,
				exp,
			}
		);
		return res.status(200).json({
			message:'Logout done successfully.',
		});
	} catch (error) {
		if (error.name) {
			let srvErr = null;
			switch (error.name) {
				case 'SequelizeValidationError':
					return res.status(500).json(JSON.parse(error.errors[0].original));
				case 'SequelizeUniqueConstraintError':
					let reviewTrys = 1;
					let solved = false;

					while (reviewTrys <= 3 && !solved) {
						try {
							const clonedExp = await RevokedSession.findOne({
								attributes: ['exp'],
								where: {
									uuid: jti,
								}
							})
							if (clonedExp.exp === exp) {
								const srvErr = new ServerError(
									`This account has been loged out before.`,
									{
										origin: 'sequelize',
										type: 'UniqueDataRepeated',
									}
								);
								return res.status(409).json(srvErr.toFlatObject());
							} else {
								exp = Math.max(clonedExp.exp, exp);
								const newRegister = await RevokedSession.update(
									{
										exp,
									},
									{
										where: {
											uuid: jti,
										},
									}
								);
								const srvErr = new ServerError(
									`Extremely unusual error, the session's UUID is cloned. For security reasons, the expiration date has been modified to the latest date.`,
									{
										origin: 'sequelize',
										type: 'UniqueDataRepeated',
									}
								);
								return res.status(500).json(srvErr.toFlatObject());
							}
							solved = true;
						} catch (error) {
							reviewTrys += 1;
						}
					}
					if (reviewTrys > 3 && !solved) {
						const srvErr = new ServerError(
							`The session's UUID is alerdy revoked for unknown reasons.`,
							{
								origin: 'sequelize',
								type: 'InvalidDataSent',
							}
						);
						return res.status(500).json( srvErr.toFlatObject() ); 
					}
				case 'SequelizeTimeoutError':
					srvErr = new ServerError(
						"Database is overloaded; unable to complete the controller's operation.",
						{
							origin: 'sequelize',
							type: 'Overloaded',
						}
					);
					return res.status(503).json( srvErr.toFlatObject() );
				default:
					srvErr = new ServerError (
						`Unknown database error closing the session.`,
						{
							origin: 'sequelize',
							type: 'Unknown'
						}
					);
					return res.status(500).json( srvErr.toFlatObject() )
			}
		}
		const srvErr = new ServerError(
			`Unknown error closing the session.`,
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		);
		return res.status(500).json( srvErr.toFlatObject() );
	}
}

export const userRegister = async (req, res) => {
	/*
	Expexted body:
	{
		name: STR -> User real name. (OPTIONAL)
		dni: STR -> User national identity document. (OPTIONAL)
		email: STR -> User email.
		password: STR -> User password.
		address: STR -> Home address from the user. (OPTIONAL)
	}
	
	Expected file:
		[
			{
				buffer: STR -> User profile image buffer in the mserver's memory. (OPTIONAL)
			}
		] 
	 */
	try {
		const { dni, name, email, password, address } = req.body;
		const buffer = req.file? req.file.buffer : null;
		const role = 'client';
		let image = null;
		let user = null;

		//Verify necesary fields.
		if ( !email || !password ) {
			const srvErr = new ServerError(
				'Missing necesary fields to register a new account.',
				{
					type: 'MissingFields',
					origin: 'server',
				}
			)
			return res.status(400).json( srvErr.toFlatObject() );
		}

		//Clear not verified and expired register requests.
		await clearUnverified().catch(error => {
				console.error(`Server| \x1b[33mCouldn't clear expired unverified accounts in a routine login.\x1b[0m`);
			})
			
		//Check if the e-mail is of a previous deleted account.
		const revokedUser = await User.findOne({
			paranoid: false,
			where: { email: `inactive-${email}` }
		})

		if (revokedUser) {
			return res.status(409).json( new ServerError(
				`Can't create a new account, there is a deleted account whit this e-mail.`,
				{
					origin: 'server',
					type: 'PermissionDenied',
				}
			).toFlatObject());
		}

		//Try to create a new user name.
		try {
			user = await createUserField()
		} catch (error) {
			return res.status(500).json( new ServerError(
				`Somethin went worng creating the user. Try again.`, 
				{ origin: 'unknown', type:'Unknown' }
			).toFlatObject());
		}
		
		//If there is a provided image, upload it and get the URL.
		if ( buffer ) {
			const result = await startStreaming(buffer, {dir: 'profileImages',format: 'webp',name: `${Date.now()}-${user}`,type: 'image'});
			if (result) image = result.secure_url;
		}

		//Create a new user.
		const newUser = await User.create({
			user,
			name,
			dni,
			email,
			password,
			address,
			role,
			image,
			ttl: 1,
		});

		const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, { expiresIn:'10m' });
		const url = `${process.env.CLIENT_URL}/user/verification?token=${token}`;
		const { exp } = jwt.decode(token);
		await newUser.update({ ttl: exp });

		//Schedule clearing of the account if it's expired and unverificated.
		setTimeout(async () => {
			try {
				await User.destroy({ where: { verified: false, id: newUser.id }, force: true });
			} catch (error) {
				if (error.name) {
					switch (error.name) {
						case 'SequelizeTimeoutError':
							console.error(`Server|\x1b[31m Error in database query \x1b[1mcleaning the expired unverified accounts\x1b[22m in its scheduled function, database overloaded.\x1b[0m`)
					}
				} else {
					console.error(`Server|\x1b[31m Error \x1b[1mcleaning a expired unverified accounts\x1b[22m in its scheduled function.\x1b[0m`)
				}
			}
		}, exp * 1000 - Date.now());

		//Send verification e-mail to the user.
		await transporter.sendMail({
			from: process.env.MAIL_USER,
			to: email,
			subject: 'Registrate en edumarket :P',
			html: `<div>Holap potatoe <a href=${url}>CLICK</a></div>`,
		});

		return res.status(201).json({
			message: `Successfuly register, an e-mail was sent to verify the account.`,
		});
	} catch (error) {
		if (error?.origin === 'cloudinary') {
			console.warn(`Server|\x1b[33m Error uploading user profile image (${req.body.name}), \x1b[1m possible dissabled Cloudinary account\x1b[0m, else: possible network error or exeded file limitations.`);
			
			const srvErr = new ServerError(
				`Cant upload the profile image to the cloud.`,
				{
					type:'Unknown',
					origin: 'cloudinary',
				}
			);
			return res.status(500).json( srvErr.toFlatObject() );
		} else if (error.name) {
			let srvErr = null;
			switch (error.name) {
				case 'SequelizeValidationError':
					try {
						console.log(error.errors[0].original)
						const srvErr = error.errors[0].original;
						if (srvErr instanceof ServerError) {return res.status(422).json(srvErr.toFlatObject())} else throw error; 
					} catch (error) {
						srvErr = new ServerError(
							`Can't add a new user in DB, there is a vlidation error.`,
							{
								origin: 'sequelize',
								type: 'InvalidDataSent',
								uiMessage: error.errors[0].message,
							}
						);
						return res.status(422).json( srvErr.toFlatObject() );
					}
				case 'SequelizeUniqueConstraintError':
					srvErr = new ServerError(
						`There is a repeated field, can't create a new user in the DB.`,
						{
							origin: 'sequelize',
							type: 'UniqueDataRepeated',
						}
					);
					return res.status(409).json( srvErr.toFlatObject() );
				case 'SequelizeTimeoutError':
					srvErr = new ServerError(
						"Database is overloaded; unable to complete the controller's operation.",
						{
							type:'Overloaded',
							origin: 'sequelize',
						}
					);
					return res.status(503).json( srvErr.toFlatObject() )
				default:
					srvErr = new ServerError(
						`Unknown database error.`,
						{
							type:'Unknown',
							origin: 'sequelize',
						}
					);
			}
		}
		return res.status(500).json(srvErr = new ServerError(
			`Unknown register error.`,
			{
				type: 'Unknown',
				origin: 'unknown',
			}
		));
	}
}

export const userVerification = async (req, res) => {
/*
Expected body:
	{
		token: STR -> JSON Web Token recibed in the e-mail.
	}
*/
	try {
		//Search token.
		const { token } = req.body;
		
		if (!token) {
			res.status(400).json( new ServerError(
				`The token is required.`,
				{
					origin: 'server',
					type: 'MissingFields',
				}
			).toFlatObject());
		}

		//Read and validate token.
		let readToken = null; 
		try {
			readToken = jwt.verify(token, process.env.JWT_SECRET);
		} catch(error) {
			const message = (error.name === 'TokenExpiredError') ?
				`The token is exired.` :
				(error.name === 'JsonWebTokenError') ?
					'The token is invalid.' :
					'Unknown error whit the sent token.';

			return res.status(401).json( new ServerError(
				message,
				{
					origin: 'jwt',
					type: 'InvalidJWT',
				}
			).toFlatObject());
		}

		//Look for the token user.
		const user = await User.findByPk(readToken.id);
		if (!user) {
			return res.status(404).json( new ServerError(
				`It wasn't possible to identify the account to which belongs the token.`,
				{
					origin: 'server',
					type: 'ResourceNotFound',
				}
			).toFlatObject());
		}

		//In case of be a account in register proccess.
		if (user.ttl !== 1) {
			//Create a cart.
			const newCart = await Cart.create({
				user: readToken.id,
				totalPrice: 0.0,
			});
			//Create a session token.
			const sessionToken = jwt.sign(
				{
					id: user.id,
					role: user.role,
				},
				process.env.JWT_SECRET,
				{
					expiresIn: '12h',
					jwtid: uuidv4(),
				}
			);
			//Make a response.
			res.json({
				message: "Account verified successfully.",
				token: sessionToken,
				user: {
					id: user.id,
					name: user.name,
					image: user.image
				}
			});
		} else {
			res.json({
				message: "Account verified successfuly."
			})
		}

		//Verificate the user account.
		await user.update({ verified: true, ttl:null});

		return res.status(200);

	} catch(error) {
		if (error.name) {
			switch (error.name) {
				case 'SequelizeTimeoutError':
					return res.status(503).json( new ServerError(
						"Database is overloaded of querys.",
						{
							origin: 'sequelize',
							type: 'Overloaded',
						}
					).toFlatObject());
			}
		}
		console.log(error)
		return res.status(500).json( new ServerError(
			"Couldn't verificate the account.",
			{
				origin: 'unknown',
				type: 'Unknown',
			}	
		).toFlatObject());
	}
}

export const userDelete = async (req, res) => {
	try {
		const { id, exp, jti } = req.payload;

		//Search user to delete.
		const userToDelete = await User.findByPk(id);
		
		if (!userToDelete) {
			return res.status(404).json( new ServerError(
				`User not found, can't delete the account.`,
				{
					origin: 'server',
					type: 'ResourceNotFound',
				}
			).toFlatObject() );
		}

		//Delete profile image.
		if (userToDelete.image) await cloudinary.uploader.destroy(`profileImages/${userToDelete.image.split('/').pop()}`, { resource_type: 'image' });

		//Delete user's cart.
		const cart = await Cart.findOne({ where: { user: id } });
		if (cart) {
			await cart.destroy();
		} else {
			console.warn(`Server|\x1b[33m A user (${userToDelete.user}) didn't had a cart.\x1b[0m`)
		}

		//Discard not usefull user data.
		await userToDelete.update({
			user: '',
			name: null,
			email: `inactive-${userToDelete.email}`,
			image: null,
			address: null,
		});

		//Make soft delete.
		await userToDelete.destroy();
		
		//Close the session.
		const newRevToken = await RevokedSession.create(
			{
				uuid: jti,
				exp,
			}
		);

		return res.status(200).json({
			message: `The account has been deleted successfully,`
		});
	} catch(error) {
		if (error.name) {
			let srvErr = null;
			switch (error.name) {
				case 'SequelizeTimeoutError':
					srvErr = new ServerError(
						"Database is overloaded; unable to complete the controller's operation.",
						{
							origin: 'sequelize',
							type: 'Overloaded',
						}
					);
					return res.status(503).json( srvErr.toFlatObject() );
				default:
					console.log(error)
					srvErr = new ServerError (
						`Unknown database error deleting the user.`,
						{
							origin: 'sequelize',
							type: 'Unknown'
						}
					);
					return res.status(500).json( srvErr.toFlatObject() )
			}
		} else if (error.error.message) {
			return res.status(500).json( new ServerError(
				`Couldn't delete user's account.`,
				{
					origin: 'cloudinary',
					type: 'Unknown',
				}
			).toFlatObject() );
		}
		const srvErr = new ServerError(
			`Unknown error deleting the account.`,
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		);
		return res.status(500).json( srvErr.toFlatObject() );
	}
}

export const recoverRequest = async (req, res) => {
	/*
	Expexted body:
	{
		dni: STR -> Deleted user's dni.
		email: STR -> Deleted user's e-mail.
		password: STR -> Deleted user's password.
	} 
	*/
	try {
		const { dni, email, password } = req.body;

		//Validate required fields.
		if (!dni || !email || !password) {
			return res.status(400).json( new ServerError(
				`The dni and e-mail are required to do this operation.`,
				{
					origin: 'server',
					type: 'MissingFields',
				}
			).toFlatObject());
		}

		//Check if there is a account making conflict whit the deleted account.
		const conflictAccount = await User.findOne({
			where: {email}
		});
	
		if (conflictAccount) {
			return res.status(409).json( new ServerError(
				`Can't recover the account, another account use the e-mail ${email}.`,
				{
					origin: 'server',
					type: 'UniqueDataRepeated',
				}
			).toFlatObject());
		}

		//Search user deleted.
		const userDeleted = await User.findOne({
			paranoid: false,
			where: { dni, email: `inactive-${email}` },
		})

		if (!userDeleted) {
			return res.status(404).json( new ServerError(
				`The user to recover wasn't found.`,
				{
					origin: 'server',
					type: 'ResourceNotFound',
				}
			).toFlatObject());
		}

		//Validate password.
		const validPass = await bcrypt.compare(password, userDeleted.password); 
		if (!validPass) {
			return res.status(401).json( new ServerError(
				`The old password is worng.`,
				{
					origin: 'server',
					type: 'InvalidCredentials',
				}
			).toFlatObject() );
		}

		//Send recover e-mail whit token.
		const token = jwt.sign({id: userDeleted.id},process.env.JWT_SECRET,{ expiresIn: '10m'});
		const url = `${process.env.CLIENT_URL}/user/recover?token=${token}`;

		await transporter.sendMail({
			from: `Edumarket Soporte: <${process.env.MAIL_USER}>`,
			to: email,
			subject: 'Recuperá tu cuenta en Edumarket',
			html: `<div>Hello, i'm testing this. :D <a href=${url}>CLICK</a></div>`,
		})

		return res.status(202).json({
			message: `Confirmation e-mail sent corrctly.`,
		})

	} catch(error) {
		if (error.name) {
			console.log('Debería estar acá.')
			switch (error.name) {
				case 'SequelizeTimeoutError':
					return res.status(503).json( new ServerError(
						`Database is overloaded; unable to complete the controller's operation.`,
						{
							origin: 'sequelize',
							type: 'Overloaded',
						}
					).toFlatObject() );
			}
		} else {
			return res.status(500).json( new ServerError(
				`Error sending the mail for recover the account.`,
				{
					origin: 'nodemailer',
					type: 'Unknown',
				}
			).toFlatObject());
		}
		return res.status(500).json( new ServerError(
			`Error recovering the account.`,
			{
				origin: 'unknown',
				type: 'Unknown',
			}
		).toFlatObject());
	}
}

export const recoverAccount = async (req, res) => {
	try {
		const { token } = req.body;
		let user = null;

		console.log("\x1b[36m FLAG 1: Validar el campo del token.\x1b[0m");
		//Validate required token field.
		if (!token) {
			return res.status(400).json( new ServerError(
				`A token is necesary to restore the account.`,
				{
					origin: 'server',
					type: 'JWTLeft',
				}
			).toFlatObject());
		}

		console.log("\x1b[36m FLAG 2: Leer el token.\x1b[0m");
		//Read the recover token.
		let readToken = null;
		try {
				readToken = jwt.verify(token, process.env.JWT_SECRET);
		} catch (error) {
			console.log(error)
				const message = (error.name === 'TokenExpiredError') 
						? 'The token is expired.' 
						: (error.name === 'JsonWebTokenError') 
								? 'The token is invalid.' 
								: 'Unknown error with the sent token.';
				
				return res.status(401).json(new ServerError(
						message,
						{
								origin: 'jwt',
								type: 'InvalidJWT',
						}
				).toFlatObject());
		}

		console.log("\x1b[36m FLAG 3: Buscar el usuario a recuperar.\x1b[0m");
		//Search user to recover.
		const recoverUser = await User.findOne({
			paranoid: false,
			where: { id: readToken.id },
		})

		if (!recoverUser) {
			return res.status(404).json( new ServerError(
				`The account to recover wasn't found`,
				{
					origin: 'server',
					type: 'ResourceNotFound',
				}
			).toFlatObject());
		}

		console.log("\x1b[36m FLAG 4: Recuperar la cuenta.\x1b[0m");
		//Recover the user's account.
		await recoverUser.restore();

		console.log("\x1b[36m FLAG 5: Restaurar campos importantes.\x1b[0m");
		//Restore importantest fields.
		try {
			user = await createUserField()
		} catch (error) {
			console.log(error)
			return res.status(500).json( new ServerError(
				`Somethin went worng creating the user. Try again.`, 
				{ origin: 'unknown', type:'Unknown' }
			).toFlatObject());
		}

		await recoverUser.update({
			user,
			email: recoverUser.email.split('-')[1],
		});

		console.log("\x1b[36m FLAG 6: Enviar respuesta.\x1b[0m");
		return res.status(200).json({
			message: "The account was recovered successfuly.",
		});
	} catch(error) {
		console.log(error)
		if (error.name) {
			switch (error.name) {
				case 'SequelizeUniqueConstraintError':
					return res.status(409).json( new ServerError(
						`There is an account created whit the same e-mail, can't recover the account.`,
						{
							origin: 'sequelize',
							type: 'UniqueDataRepeated',
						}
					).toFlatObject() );
				case 'SequelizeTimeoutError':
					return res.status(503).json( new ServerError(
						"Database is overloaded; unable to complete the controller's operation.",
						{
							origin: 'sequelize',
							type: 'Overloaded',
						}
					).toFlatObject() );
			}
		}
		return res.status(500).json( new ServerError(
			`Couldn't recover the account.`,
			{
				origin: 'server',
				type: 'Unknown',
			}
		).toFlatObject() );
	}
}

export const userUpdate = async (req, res) => {
	/*
	Expexted body:
	{
		toUser: NUM -> In case of update other user, diferent than the user who has sent this request, this field contains the id of that user. (OPTIONAL | ONLY ADMIN)
		newName: STR -> User's real name. (OPTIONAL)
		newDni: STR -> User's national identity document. (OPTIONAL | ONLY ADMIN)
		newEmail: STR -> User's email. (OPTIONAL)
		oldPassword: STR -> Last password that user had. (OPTIONAL | WHIT newPassword FIELD)
		newPassword: STR -> User's new password. (OPTIONAL | WHIT oldPassword FIELD)
		newRole: STR -> User's role (admin or client). (OPTIONAL | ONLY ADMIN)
		newAddress: STR -> Home address from the user. (OPTIONAL)
	}
	
	Expected file:
		[
			{
				buffer: STR -> User profile image buffer in the mserver's memory. (OPTIONAL)
			}
		] 
	 */
	
	try {
		const { toUser, newName, newDni, newEmail, oldPassword, newPassword, newRole, newAddress, newVerification } = req.body;
		const buffer = req.file? req.file.buffer : null;		
		const { role } = req.payload;
		const id = null;

		if (role === 'admin') {
			//Verify id.
			id = toUser? toUser : req.payload.id
		} else {
			//Set id.
			id = req.payload.id;

			//Verify premissions.
			if (newDni || newRole || newVerification || toUser) {
				return res.status(403).json( new ServerError(
					`The user haven't permissions to do this operation.`,
					{
						origin: 'server',
						type: 'PermissionDenied',
					}
				).toFlatObject() );
			}
		}

		//Search user to update.
		const user = await User.findByPk(id);

		if (!user) {
			return res.status(404).json( new ServerError(
				`Can't update profile, user not found.`,
				{
					origin: 'server',
					type: 'ResourceNotFound',
				}
			).toFlatObject() );
		}

		//Update user data.
		if (!toUser) {
			//The fields in this scope wouldn't be cahnged by someone other than the own user.
			if (newPassword) {
				correctPass = await bcrypt.compare(oldPassword, user.password);
				if (correctPass) user.password = newPassword;
			}
			if (newAddress) user.address = newAddress;
			if (buffer) {
				await cloudinary.uploader.destroy(`profileImages/${user.image.split('/').pop()}`, { resource_type: 'image' });
				const response = await startStreaming(buffer, {dir: 'profileImages', format: 'webp', name: `${Date.now()}-${user}`, type: 'image'});
				const newImage = response.secure_url;
				await user.update({ image: newImage });
			}
		}
		if (newName) user.name = newName;
		if (newDni) {
			const token = jwt.sign({ id: user.id, role: user.role, adminId: req.payload.id, newDni }, process.env.JWT_SECRET, { expiresIn: '10d' });
			const url = `${process.env.CLIENT_URL}/user/verification?token=${token}`;
			await transporter.sendMail({
				from: process.env.MAIL_USER,
				to: newEmail,
				subject: 'Registrate en edumarket :P',
				html: `<div>Holap potatoe <a href=${url}>CLICK</a></div>`,
			})
		}
		if (newEmail) {
			//Set new e-mail, and unverify account until it's verified (seting ttl as 1, because y woudn't have to be deleted un the util clearUnverified).
			user.email = newEmail;
			user.verified = false;
			user.ttl = 1;
			const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, { expiresIn:'10m' });
			const url = `${process.env.CLIENT_URL}/user/verification?token=${token}`;
			await transporter.sendMail({
				from: process.env.MAIL_USER,
				to: newEmail,
				subject: 'Registrate en edumarket :P',
				html: `<div>Holap potatoe <a href=${url}>CLICK</a></div>`,
			})
		};
		if (newRole) user.role = newRole;

		await user.save();

		return res.status(201).json({
			message: `The user data was updated.`,
			user: {
				id: user.id,
				user: user.user,
				name: user.name,
				email: user.email,
				dni: user.dni,
				image: user.image,
				address: user.address,
			}
		})
	} catch(error) {
		console.log(error)
		if (error?.origin === 'cloudinary') {
			return res.status(200).json( new ServerError(
				`The profile was updated exepting the image.`,
				{
					origin: 'cloudinary',
					type: 'Unknown',
				}
			).toFlatObject() );
		}
		if (error.name) {
			switch (error.name) {
				case 'SequelizeValidationError':
					try {
						const srvErr = error.errors[0].origin;
						if (srvErr instanceof ServerError) {return res.status(422).json(srvErr.toFlatObject())} else throw error; 
					} catch(error) {
						return res.status(422).json( new ServerError(
							`The data sent is invalid.`,
							{
								origin: 'sequelize',
								type: 'InvalidDataSent',
								uiMessage: error.errors[0].message,
							}
						).toFlatObject() );
					}
				case 'SequelizeUniqueConstraintError':
					return res.status(409).json( new ServerError(
						`There is a reapeated field.`,
						{
							origin: 'sequelize',
							type: 'UniqueDataRepeated',
						}
					).toFlatObject() );
				case 'SequelizeTimeoutError':
					return res.status(503).json( new ServerError(
						"Database is overloaded; unable to complete the controller's operation.",
						{
							origin: 'sequelize',
							type: 'Overloaded',
						}
					).toFlatObject() );
			}
		}
		return res.status(500).json( new ServerError(
			`Can't update user's profile.`,
			{
				origin: 'server',
				type: 'Unknown',
			}
		).toFlatObject() );
	}
}

export const dniUpdateConfrim = async (req, res) => {
	try {
		const { token } = req.body;
		const { id, role, adminId, newDni } = jwt.verify(token, process.env.JWT_SECRET);

		//Search user to change.
		const user  = await User.findByPk(id);
		if (!user) {
			return res.status(404).json( new ServerError(
				"Couldn't found the user to update.",
				{
					origin: 'server',
					type: 'ResourceNotFound',
				}
			).toFlatObject() );
		}

		//Add DNI to archived DNI.
		const archivedDni = await OldDNI.create({
			dni: user.dni,
			roleAtArchiving: role,
			archivedBy: adminId,
			user: id,
		});

		//Change user's DNI.
		await user.update({ dni: newDni });

		return res.status(200).json({
			message: "The DNI has been updated successfuly.",
		});
	} catch (error) {
		if (error.name) {

		}
	}
}