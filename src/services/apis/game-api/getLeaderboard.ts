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
		total: number
		hasNext: boolean
	}
}

export async function getLeaderboard({ limit, offset }: APILeadearboardParams): Promise<APILeaderboardResponse> {
	const cacheKey = `leaderboard:${offset}`
	const cachedEntry = await cache.get(cacheKey)
	if (cachedEntry) return JSON.parse(cachedEntry)

	const arenaLeaderboard = await GameAPI.get<APILeaderboardResponse>(`/v2/leaderboards`, {
		params: { limit, offset },
	})
		.then((response) => response.data)
		.catch((error: AxiosError) => logger.error(error))

	if (!arenaLeaderboard) throw new Error("GameAPI Error: getLeaderboard")

	arenaLeaderboard._items.forEach((player) => {
		player.rankIcon = emojis.rank[`${player.rank}_${player.tier}` as keyof typeof emojis.rank]
		player.name = player.name.replaceAll(/\r?\n|\r/g, "").trim()
		player.name = player.name.replace(/(\r\n|\r|\n)/, "")
	})

	await cache.set(cacheKey, JSON.stringify(arenaLeaderboard), "EX", DEFAULT_CACHE_EXPIRATION)

	return arenaLeaderboard
}
