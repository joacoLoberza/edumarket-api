import { Op } from 'sequelize';
import cron from 'node-cron';
import RevokedSeasson from "../../database/models/RevokedSession.js"

const clearRevokedJWT = async () => {
	await RevokedSeasson.destroy({
		where: {
			exp: {[Op.lte]: Math.floor(Date.now() / 1000)}
		}
	});
}

export const clearRevokedSessionsCornJob = () => {
	cron.schedule('0 0 * * *', async () => {
		try {
			await clearRevokedJWT();
		} catch(error) {
			if (error.name) {
				switch (error.name) {
					case 'SequelizeTimeoutError':
						console.error(`Server|\x1b[31m Error in database query \x1b[1mcleaning the expired accounts\x1b[22m whit the dialy corn job, database overloaded.\x1b[0m`)
				}
			} else {
				console.error(`Server|\x1b[31m Error \x1b[1mcleaning the expired accounts\x1b[22m whit the dialy corn job.\x1b[0m`)
			}
		}
	})
}

export default clearRevokedJWT;