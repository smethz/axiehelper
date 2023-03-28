import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import { Contest, ContestPlayer } from "@custom-types/contest"
import { ContestAPI } from "@services/api"
import { cache } from "@services/cache"
import logger from "pino-logger"
import { getContest } from "./getContest"

interface APIContestLeaderboardParams {
	limit?: number
	page?: number
}

interface APIContestLeaderboardResponse {
	data: ContestPlayer[]
	total: number
}

interface ContestLeaderbord {
	contest: Contest
	players: ContestPlayer[]
}

export async function getContestLeaderboard(
	{ limit, page }: APIContestLeaderboardParams = { limit: 100, page: 1 }
): Promise<ContestLeaderbord> {
	const contestList = await getContest()

	if (!contestList.length || !contestList[0]) throw new Error("No Contest List")

	const latestContest = contestList[0]

	const cacheKey = `contestLeaderboard:${page}:${latestContest.id}`
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return JSON.parse(cachedEntry)

	const leaderboardPlayers = await ContestAPI.get<APIContestLeaderboardResponse>(
		`contest/v1/public/contests/${latestContest.id}/leaderboard`,
		{ params: { limit, page } }
	)
		.then((response) => response.data.data)
		.catch((error) => logger.error(error))

	if (!leaderboardPlayers) throw new Error("ContestAPI: getContestLeaderboard")

	leaderboardPlayers.forEach((player) => {
		player.user_name = player.user_name.replace(/(\r\n|\r|\n)/, "")
	})

	const constestLeaderboard: ContestLeaderbord = {
		contest: latestContest,
		players: leaderboardPlayers,
	}

	await cache.set(cacheKey, JSON.stringify(constestLeaderboard), "EX", DEFAULT_CACHE_EXPIRATION)

	return constestLeaderboard
}
