import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createRealtionships, syncDBConnection } from './database';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
	origin : process.env.CLIENT_URL || "http://localhost:5173"
}));

const startServer = async () => {
	createRealtionships();
	await syncDBConnection();

	const server = app.listen(PORT, () => {
		console.log('\x1b[37m %s \x1b[31m %s \x1b[0m', 'Server| ', `Server listening on the port ${PORT}...`)
	})

	server.on('error', (error) => {
		switch (error.code) {
			case 'EADDRINUSE':
				console.error('\x1b[34m%s\x1b[31m %s\x1b[0m', 'Node| ', `Can't init the server because the port ${PORT} is bussy.`);
				break; 
			case 'EACCES':
				console.error('\x1b[34m%s\x1b[31m %s\x1b[0m', 'Node| ', `Cant't init the server because the port ${PORT} is a well-known port.`);
				break;
			default:
				console.error('\x1b[34m%s\x1b[31m %s\x1b[0m', 'Node| ', `Can't init the server.`);
		}
		console.log('Error Detail:\n', error);
	})
};
startServer();