import mpClient from '../config/mpClient.js';
import { Payment } from "mercadopago";
import * as crypto from 'crypto';
import Order from '../database/models/Order.js';
import Product from '../database/models/Product.js';
import OrderItem	from '../database/models/OrderItem.js';
import List from '../database/models/List.js';
import ListItem from '../database/models/ListItem.js';

const ordersWebhook = async (req, res) => {
	console.log("\x1b[36m Request", new Date().toLocaleString('sv-SE', {timeZone: 'America/Argentina/Buenos_Aires', hour12: false}),'\x1b[0m');
	console.log("\x1b[36m ---BODY--- \x1b[0m\n",req.body, "\n");
	console.log("\x1b[36m ---HEADERS--- \x1b[0m\n",req.headers, "\n\n");



	try {
		//Look for the payment id and authentication headers.
		const paymentId = req.body?.data?.id;
		console.log(req.query, paymentId);
		const queryId = req.query['data.id'];

		const xSignature = req.headers?.["x-signature"];
		const xRequestId = req.headers?.["x-request-id"];

		if (!xSignature || !xRequestId) {
			return res.status(401).json("Request origin not authorized.");
		}

		//Validate request origin with header's signature.
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
		const manifest = `id:${queryId};request-id:${xRequestId};ts:${timestamp};`;
		console.log(manifest);
		console.log(process.env.NOTIF_SECRET_KEY);
		const verifHash = crypto
			.createHmac('sha256', process.env.NOTIF_SECRET_KEY)
			.update(manifest)
			.digest('hex');

		console.log("El hash aramado: ",verifHash, "\n El hash original: ", hash);
			//Check if the recibed signature and expected signature are equals.
		if (hash !== verifHash) {
			console.log("Está mal.")
			//return res.status(401).json("Unauthorized to change payment data.")
		}

		/* //Instance the paymend and obtain data.
		const payment = new Payment(mpClient);
		const paymentInfo = await payment.get({ id: paymentId });
		const orderId = paymentInfo.external_reference;

		if (paymentInfo.status === 'approved') {
			console.log('_________________APROVADO_________________')
			const order = await Order.findByPk(orderId, {
				attributes: ['id'],
				include: {
					model: OrderItem,
					attributes: [ 'id', 'amount' ],
					include: [
						{
							model: Product,
							attributes: [ 'id' ],
						},
						{
							model: List,
							attributes: [ 'id' ],
							include: {
								model: ListItem,
								attributes: [ 'id', 'amount' ],
								include: {
									model: Product,
									attributes: [ 'id' ]
								},
							},
						},
					],
				}
			});

			for (oItem of order.OrderItem) {
				if (oItem.Product) {
					await oItem.Product.decrement('stock', { by: oItem.amount });
				} else if (oItem.List) {
					for (lItem of oItem.List.ListItems) {
						await lItem.Product.decrement('stock', { by: lItem.amount*oItem.amount});
					}
				}
			}

			await order.update({
				status: 'paid',
			});

			
		} else if (paymentInfo.status === 'rejected') {
			console.log("\x1b[36mPAGO FALLIDO\x1b[0m");
		} else {
			console.log("\x1b[36mALGO PASO\x1b[0m");
		} */

		return res.status(200).json("OK");

	} catch(error) {
		console.log(error)
		return res.status(200).json("OK");
	}
}

export default ordersWebhook;