import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';

const database = new Sequelize(
	process.env.DB_NAME,
	process.env.DB_USER,
	process.env.DB_PASSWORD,
	{
		host: process.env.DB_HOST,
		port: 3306,
		dialect: 'mysql',
		/*logging: (msg) => {
			const logDir = '/home/u917654584/domains/edumarketmendoza.com/logs';
			if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

			const logFile = path.join(logDir, 'sequelize.log');
			const timestamp = new Date().toISOString();
			fs.appendFile(logFile, `[${timestamp}] ${msg}\n`, (error) => {
				if (error) {console.log(`Server|\x1b[31m Error registering sequelize logs.\x1b[0m\n\nError Object:\n`, error)}
			})
		}, */
		timezone: '-03:00',
		pool: {
			max: 5,
			min: 0,
			acquire: 45000,
			idle: 10000,
		},
		define: {
			timestamps: true,
			freezeTableName: true,
		},
	}
);

export default database;