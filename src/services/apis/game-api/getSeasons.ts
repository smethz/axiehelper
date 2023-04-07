import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import { GameAPI } from "@services/api"
import { cache } from "@services/cache"
import { AxiosError } from "axios"
import logger from "pino-logger"

interface APISeasonsResponse {
	_etag: string
	_items: Season[]
	_metadata: {
		limit: number
		offset: number
		hasNext: boolean
	}
}

export interface Season {
	startedAt: number
	endedAt: number
	name: string
	id?: number
	seasonPassID: string
	description: string
	_etag: string
}

interface APISeasonsParams {
	limit?: number
	offset?: number
	force?: boolean // Whether to skip the cache check and request the API
}

export async function getSeasons(
	{ limit, offset, force }: APISeasonsParams = { limit: 100, offset: 0, force: false }
): Promise<Season[] | void> {
	const cacheKey = `origin_seasons`

	if (!force) {
		const cachedEntry = await cache.get(cacheKey)

		if (cachedEntry) return [...JSON.parse(cachedEntry)] as Season[]
	}

	const seasons = await GameAPI.get<APISeasonsResponse>(`/v2/seasons`, { params: { limit, offset } })
		.then((response) => response.data._items)
		.catch(async (error: AxiosError) => {
			logger.error(error, `GameAPI Error: ${error.response?.status} getSeasons`)

			const cacheEntry = await cache.get(cacheKey)

			if (cacheEntry) return [...JSON.parse(cacheEntry)] as Season[]

			return
		})

	if (!seasons) return

	const seasonIds = seasons.map((season) => season.id ?? -Infinity)
	const latestSeason = seasons.find((season) => season.id === Math.max(...seasonIds))

	// Set the cache expiration till season ends
	const nowInSeconds = Math.round(Date.now() / 1000)
	const secondsTillSeasonEnd = latestSeason ? latestSeason.endedAt - nowInSeconds : DEFAULT_CACHE_EXPIRATION
	// Duration is negative in off-season
	const cacheExpiration = secondsTillSeasonEnd > 0 ? secondsTillSeasonEnd : DEFAULT_CACHE_EXPIRATION

	await cache.set(cacheKey, JSON.stringify(seasons), "EX", cacheExpiration)

	return seasons
}
