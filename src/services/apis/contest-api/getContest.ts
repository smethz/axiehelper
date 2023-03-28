import { Contest } from "@custom-types/contest"
import { ContestAPI } from "@services/api"
import { cache } from "@services/cache"
import logger from "pino-logger"

interface APIContestResponse {
	data: Contest[]
	total: number
}

export async function getContest(): Promise<Contest[]> {
	const cacheKey = `contests`
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return JSON.parse(cachedEntry)

	const data = await ContestAPI.get<APIContestResponse>(`/contest/v1/public/contests`, {
		params: { limit: 100, page: 1 },
	})
		.then((response) => response.data.data)
		.catch((error) => logger.error(error))

	if (!data) throw new Error("ContestAPI Errors: getContest")

	const untilEndOrADay =
		data[0] && data[0].end_time <= Math.floor(Date.now() / 1000)
			? data[0].end_time
			: Math.floor(Date.now() / 1000) + 86400

	await cache.set(cacheKey, JSON.stringify(data), "EX", untilEndOrADay)

	return data
}
