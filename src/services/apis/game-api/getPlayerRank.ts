import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { UserID } from "@custom-types/common"
import { PlayerLeaderboardData } from "@custom-types/profile"
import { GameAPI } from "@services/api"
import { cache } from "@services/cache"
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

export async function getPlayerRank(userId: UserID): Promise<PlayerLeaderboardData> {
	const cacheKey = `rank:${userId}`
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return JSON.parse(cachedEntry)

	const data = await GameAPI.get<APILeaderboardResponse>(`/v2/leaderboards`, {
		params: { limit: 1, offset: 0, userID: userId },
	})
		.then(async (response) => {
			const player = response.data._items[0]

			if (!player) return

			player.rankIcon = emojis.rank[`${player.rank}_${player.tier}` as keyof typeof emojis.rank]
			player.name = player.name.replaceAll(/\r?\n|\r/g, "").trim()
			player.name = player.name.replaceAll(/(<#.{3,6}>)|(<color=#.{3,6}>)/g, "")

			await cache.set(cacheKey, JSON.stringify(player), "EX", DEFAULT_CACHE_EXPIRATION)

			return player
		})
		.catch((error: Error) => logger.error(error, `GameAPI Error: getPlayerRank - ${userId}`))

	if (!data) throw new Error(`GameAPI Error: getPlayerRank - ${userId}`)

	return data
}
