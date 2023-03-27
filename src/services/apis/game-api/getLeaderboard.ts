import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import { PlayerLeaderboardData } from "@custom-types/profile"
import { GameAPI } from "@services/api"
import { cache } from "@services/cache"
import { AxiosError } from "axios"
import logger from "pino-logger"

interface APILeadearboardParams {
	limit?: number
	offset?: number
	userID?: string
}

interface APILeaderboardResponse {
	_etag: string
	_items: PlayerLeaderboardData[]
	_metadata: {
		limit: number
		offset: number
		hasNext: boolean
	}
}

export async function getLeaderboard({
	limit = 100,
	offset = 0,
}: APILeadearboardParams): Promise<PlayerLeaderboardData[]> {
	const cacheKey = `leaderboard:${offset}`
	const cachedEntry = await cache.get(cacheKey)
	if (cachedEntry) return JSON.parse(cachedEntry)

	const data = await GameAPI.get<APILeaderboardResponse>(`/v2/leaderboards`, {
		params: { limit, offset },
	})
		.then(async (response) => {
			const leaderboardPlayers = response.data._items

			leaderboardPlayers.forEach((player) => {
				player.rankIcon = emojis.rank[`${player.rank}_${player.tier}` as keyof typeof emojis.rank]
				player.name = player.name.replace(/(\r\n|\r|\n)/, "")
			})

			await cache.set(cacheKey, JSON.stringify(leaderboardPlayers), "EX", DEFAULT_CACHE_EXPIRATION)

			return leaderboardPlayers
		})
		.catch((error: AxiosError) => logger.error(error, "GameAPI Error: getLeaderboard"))

	if (!data) throw new Error("GameAPI Error: getLeaderboard")

	return data
}
