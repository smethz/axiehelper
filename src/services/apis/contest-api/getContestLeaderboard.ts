import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import { ContestPlayer } from "@custom-types/contest"
import { ContestAPI } from "@services/api"
import { cache } from "@services/cache"
import { cleanPlayerName } from "@utils/cleanPlayerName"
import { isAPIError } from "@utils/isAPIError"
import { AxiosError } from "axios"
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

export interface ContestLeaderbord {
	players: ContestPlayer[]
	total: number
}

export async function getContestLeaderboard({
	constestId,
	limit = 20,
	page = 1,
}: APIContestLeaderboardParams): Promise<ContestLeaderbord | AxiosError | void> {
	const cacheKey = `contestLeaderboard:${page}:${constestId}`
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return JSON.parse(cachedEntry)

	const leaderboardPlayers = await ContestAPI.get<APIContestLeaderboardResponse>(
		`contest/v1/public/contests/${constestId}/leaderboard`,
		{ params: { limit, page } }
	)
		.then((response) => response.data)
		.catch((error: AxiosError) => {
			logger.error(error, `ContestAPI: ${error.response?.status} getContestLeaderboard -  ${constestId} constestId`)
			return error
		})

	if (isAPIError(leaderboardPlayers)) return leaderboardPlayers

	if (!leaderboardPlayers.data.length) return

	leaderboardPlayers.data.forEach((player) => {
		player.user_name = cleanPlayerName(player.user_name)
	})

	const constestLeaderboard: ContestLeaderbord = {
		players: leaderboardPlayers.data,
		total: leaderboardPlayers.total,
	}

	await cache.set(cacheKey, JSON.stringify(constestLeaderboard), "EX", DEFAULT_CACHE_EXPIRATION)

	return constestLeaderboard
}
