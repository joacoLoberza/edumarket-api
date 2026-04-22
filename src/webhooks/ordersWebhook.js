import mpClient from '../config/mpClient.js';
import { Payment } from "mercadopago";
import * as crypto from 'crypto';

const ordersWebhook = (req, res) => {
	try {
		console.log(req.body)
		console.log(req.headers)
		//Look for the payment id and authentication headers.
		const {id:paymentId} = req.body?.data;
		if (!paymentId) {
			return res.status(400).json("Error processing the payment.");
		}

		const xSignature = req.headers?.["x-signature"];
		const xRequestId = req.headers?.["x-request-id"];

		if (!xSignature || !xRequestId) {
			return res.status(401).json("Error processing the payment.");
		}

		//Validate request orifgin with header's signature.
		const signatureParts = xSignature.split(',');
		let timestamp = null;
		let hash = null;
		signatureParts.forEach(part => {
			//Hash and timestamp from the header's signature.
			const [key, value] = part.split('=');
			if (key === 'ts') timestamp = value;
			if (key === 'v1') hash = value;
		})
		
			//Create the true and expected signature.
		const manifest = `id:${paymentId};request-id:${xRequestId};ts:${timestamp}`;
		const verifHash = crypto
			.createHmac('sha256', process.env.MP_ACCESS_TOKEN)
			.update(manifest)
			.digest('hex');

			//Check if the recibed signature and expected signature are equals.
		if (hash !== verifHash) {
			return res.status(401).json("Unauthorized to change payment data.")
		}

		//Instance the paymend and obtain data.
		const payment = new Payment(mpClient);
		const paymentInfo = Payment.get({ id: paymentId })

		if (paymentInfo.status === 'approved') {
			console.log("\x1b[36mPAGO APROVADO\x1b[0m");
		} else if (paymentInfo.status === 'rejected') {
			console.log("\x1b[36mPAGO FALLIDO\x1b[0m");
		} else {
			console.log("\x1b[36mALGO PASO\x1b[0m");
		}

		return res.status(200).json("LLEGO bien (?)");

	} catch(error) {
		console.log(error)
		return res.status(200).json("LLEgó con error");
	}
}

export default ordersWebhook;