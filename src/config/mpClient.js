import { MercadoPagoConfig } from 'mercadopago';

const mpClient = MercadoPagoConfig({
	accessToken: process.env.MP_ACCESS_TOKEN
})

export default mpClient;