import { Contest } from "@custom-types/contest"
import { ContestAPI } from "@services/api"
import { cache } from "@services/cache"

interface RootObject {
	data: Contest[]
	total: number
}

export async function getContest(): Promise<Contest[]> {
	const cacheKey = `contests`
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return JSON.parse(cachedEntry)

	const data = await ContestAPI.get<RootObject>(`/contest/v1/public/contests`, {
		params: { limit: 100, page: 1 },
	}).then(async (response) => {
		const contestArray = response.data.data

		const untilEndOrADay =
			contestArray[0] && contestArray[0].end_time <= Math.floor(Date.now() / 1000)
				? contestArray[0].end_time
				: Math.floor(Date.now() / 1000) + 86400

		await cache.set(cacheKey, JSON.stringify(contestArray), "EX", untilEndOrADay)

		return contestArray
	})

	return data
}
