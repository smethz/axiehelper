import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import { ContestPlayer } from "@custom-types/contest"
import { ContestAPI } from "@services/api"
import { cache } from "@services/cache"
import logger from "pino-logger"

interface APIContestLeaderboardParams {
	constestId: number
	limit?: number
	page?: number
}

interface APIContestLeaderboardResponse {
	data: ContestPlayer[]
	total: number
}

interface ContestLeaderbord {
	players: ContestPlayer[]
	total: number
}

export async function getContestLeaderboard({
	constestId,
	limit = 20,
	page = 1,
}: APIContestLeaderboardParams): Promise<ContestLeaderbord> {
	const cacheKey = `contestLeaderboard:${page}:${constestId}`
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return JSON.parse(cachedEntry)

	const leaderboardPlayers = await ContestAPI.get<APIContestLeaderboardResponse>(
		`contest/v1/public/contests/${constestId}/leaderboard`,
		{ params: { limit, page } }
	)
		.then((response) => response.data)
		.catch((error) => logger.error(error))

	if (!leaderboardPlayers) throw new Error("ContestAPI: getContestLeaderboard")

	leaderboardPlayers.data.forEach((player) => {
		player.user_name = player.user_name.replaceAll(/\r?\n|\r/g, "").trim()
		player.user_name = player.user_name.replace(/(\r\n|\r|\n)/, "")
	})

	const constestLeaderboard: ContestLeaderbord = {
		players: leaderboardPlayers.data,
		total: leaderboardPlayers.total,
	}

	await cache.set(cacheKey, JSON.stringify(constestLeaderboard), "EX", DEFAULT_CACHE_EXPIRATION)

	return constestLeaderboard
}
