import './config/env.js';
import express from 'express';
import cors from 'cors';
import { createRealtionships, syncDBConnection, cloudinaryConnection } from './database/index.js';
import { clearRevokedSessionsCornJob } from './utils/cronJobs/clearRevokedJWT.js';
import { clearUnverifiedCronJob } from './utils/cronJobs/clearUnverified.js';
import usersRouter from './routers/userRouter.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
	origin : process.env.CLIENT_URL || "http://localhost"
}));
app.use('/user', usersRouter);

const startServer = async () => {
	createRealtionships();
	await syncDBConnection();
	cloudinaryConnection();
	clearRevokedSessionsCornJob();
	clearUnverifiedCronJob();

	const server = app.listen(PORT, () => {
		console.log('\x1b[37m%s \x1b[32m%s \x1b[0m', 'Server| ', `Server listening on the port ${PORT}...`)
	})

	server.on('error', (error) => {
		switch (error.code) {
			case 'EADDRINUSE':
				console.error('\x1b[34m%s\x1b[31m%s\x1b[0m', 'Node| ', `Can't init the server because the port ${PORT} is bussy.`);
				break; 
			case 'EACCES':
				console.error('\x1b[34m%s\x1b[31m%s\x1b[0m', 'Node| ', `Cant't init the server because the port ${PORT} is a well-known port.`);
				break;
			default:
				console.error('\x1b[34m%s\x1b[31m%s\x1b[0m', 'Node| ', `Can't init the server.`);
		}
		console.log('Error Detail:\n', error);
	})
};
startServer();