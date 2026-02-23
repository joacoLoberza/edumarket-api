import { Op } from 'sequelize';
import cron from 'node-cron';
import User from '../../database/models/User.js';

const clearUnverified = async () => {
	await User.destroy({
		where: { verified: false, ttl: {[Op.and]: {[Op.lte]: Date.now() / 1000}, [Op.gt]: 1} }
	})
}

export const clearUnverifiedCronJob = () => {
	cron.schedule('0 0 * * *', async () => {
		try {
			await clearUnverified();
		} catch (error) {
			if (error.name === 'SequelizeTimeoutError') {
				console.error(`Server| \x1b[31mError in the diary cleaning, database overloaded.\x1b[0m`);
			} else {
				console.error(`Server| \x1b[31mError cleaning expired accounts.\x1b[0m`, error);
			}
		}
	})
}

export default clearUnverified;