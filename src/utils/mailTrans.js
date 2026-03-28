import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: 'loberzajoaco@gmail.com',
		pass: 'rcku scdj czia otmc',
	}
});

export default transporter;