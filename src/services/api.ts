import { CONTEST_API, GATEWAY_API, MARKETPLACE_GRAPHQL_API, ORIGIN_GAME_API, RONIN_REST_API } from "@constants/url"
import axios from "axios"

export const GameAPI = axios.create({ baseURL: ORIGIN_GAME_API })
export const MarketplaceAPI = axios.create({ baseURL: MARKETPLACE_GRAPHQL_API })
export const RoninRestAPI = axios.create({ baseURL: RONIN_REST_API })
export const GatewayAPI = axios.create({ baseURL: GATEWAY_API })
export const ContestAPI = axios.create({ baseURL: CONTEST_API })

GatewayAPI.interceptors.request.use((request) => {
	const GATEWAY_API_KEYS = process.env.GATEWAY_API_KEYS?.replace(/\s+/g, "").split(",")

	if (!GATEWAY_API_KEYS?.length) throw new Error("Gateway API Key(s) Not Found")

	const randomAuthKey = GATEWAY_API_KEYS[Math.floor(Math.random() * GATEWAY_API_KEYS.length)]

	request.headers = {
		"X-API-Key": randomAuthKey!,
	}

	return request
})
