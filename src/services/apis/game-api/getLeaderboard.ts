import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { PlayerLeaderboardData } from "@custom-types/profile"
import { GameAPI } from "@services/api"
import { cache } from "@services/cache"
import { cleanPlayerName } from "@utils/cleanPlayerName"
import { isAPIError } from "@utils/isAPIError"
import { AxiosError } from "axios"
import logger from "pino-logger"

interface APILeadearboardParams {
	limit?: number
	offset?: number
	userID?: string
}

export interface APILeaderboardResponse {
	_etag: string
	_items: PlayerLeaderboardData[]
	_metadata: {
		limit: number
		offset: number
		total: number
		hasNext: boolean
	}
}

export async function getLeaderboard({
	limit,
	offset,
}: APILeadearboardParams): Promise<APILeaderboardResponse | AxiosError | void> {
	const cacheKey = `leaderboard:${offset}`
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return JSON.parse(cachedEntry)

	const arenaLeaderboard = await GameAPI.get<APILeaderboardResponse>(`/v2/leaderboards`, {
		params: { limit, offset },
	})
		.then((response) => response.data)
		.catch((error: AxiosError) => {
			logger.error(error, `GameAPI Error: ${error.response?.status} getLeaderboard`)
			return error
		})

	if (isAPIError(arenaLeaderboard)) return arenaLeaderboard

	if (!arenaLeaderboard._items.length) return

	arenaLeaderboard._items.forEach((player) => {
		player.rankIcon = emojis.rank[`${player.rank}_${player.tier}` as keyof typeof emojis.rank]
		player.name = cleanPlayerName(player.name)
	})

	await cache.set(cacheKey, JSON.stringify(arenaLeaderboard), "EX", DEFAULT_CACHE_EXPIRATION)

	return arenaLeaderboard
}
