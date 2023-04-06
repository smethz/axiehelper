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
}

export async function getSeasons(
	{ limit, offset }: APISeasonsParams = { limit: 100, offset: 0 }
): Promise<Season[] | void> {
	const cacheKey = `origin_seasons`

	const seasons = await GameAPI.get<APISeasonsResponse>(`/v2/seasons`, { params: { limit, offset } })
		.then(async (response) => response.data._items)
		.catch(async (error: AxiosError) => {
			logger.error(error, `GameAPI Error: ${error.response?.status} getSeasons`)

			const cacheEntry = await cache.get(cacheKey)

			if (cacheEntry) return [...JSON.parse(cacheEntry)]

			return
		})

	if (!seasons) return

	await cache.set(cacheKey, JSON.stringify(seasons), "EX", DEFAULT_CACHE_EXPIRATION)

	return seasons
}
