import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { UserID } from "@custom-types/common"
import { PlayerLeaderboardData } from "@custom-types/profile"
import { GameAPI } from "@services/api"
import { cache } from "@services/cache"
import { cleanPlayerName } from "@utils/cleanPlayerName"
import { isAPIError } from "@utils/isAPIError"
import { AxiosError } from "axios"
import logger from "pino-logger"

interface APILeaderboardResponse {
	_etag: string
	_items: PlayerLeaderboardData[]
	_metadata: {
		limit: number
		offset: number
		hasNext: boolean
	}
}

export async function getPlayerRank(userId: UserID): Promise<PlayerLeaderboardData | AxiosError | void> {
	const cacheKey = `rank:${userId}`
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return JSON.parse(cachedEntry)

	const playerLeaderboardData = await GameAPI.get<APILeaderboardResponse>(`/v2/leaderboards`, {
		params: { limit: 1, offset: 0, userID: userId },
	})
		.then(async (response) => {
			const player = response.data._items[0]

			if (!player) return

			return player
		})
		.catch((error: AxiosError) => {
			logger.error(error, `GameAPI Error: ${error.response?.status} getPlayerRank - ${userId}`)
			return error
		})

	if (isAPIError(playerLeaderboardData)) return playerLeaderboardData

	if (!playerLeaderboardData) return

	playerLeaderboardData.rankIcon =
		emojis.rank[`${playerLeaderboardData.rank}_${playerLeaderboardData.tier}` as keyof typeof emojis.rank]
	playerLeaderboardData.name = cleanPlayerName(playerLeaderboardData.name)

	await cache.set(cacheKey, JSON.stringify(playerLeaderboardData), "EX", DEFAULT_CACHE_EXPIRATION)

	return playerLeaderboardData
}
