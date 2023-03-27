import { MAVIS_HUB_API } from "@constants/url"
import type { News } from "@custom-types/news"
import axios from "axios"
import logger from "pino-logger"

interface APINewsResponse {
	data: News[]
	total: number
}

export async function getLunacianNews(): Promise<News[] | void> {
	return axios
		.get<APINewsResponse>(`${MAVIS_HUB_API}/api/lunacian-news`, {
			params: { limit: 10, offset: 0 },
		})
		.then((response) => {
			response.data.data.map((news) => {
				news.post_date = new Date(news.post_date)
			})
			return response.data.data
		})
		.catch((error) => logger.error(error, "MavisHub API Error: Lunacian News"))
}
