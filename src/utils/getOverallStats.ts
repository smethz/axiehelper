import { getPlayerBattles } from "@apis/game-api/getPlayerBattles"
import { getPlayerProfile } from "@apis/game-api/getPlayerProfile"
import { getPlayerRank } from "@apis/game-api/getPlayerRank"
import { getPlayerItems } from "@apis/gateway-api/getPlayerItems"
import { ParsedPlayerBattles } from "@custom-types/battle"
import { UserID } from "@custom-types/common"
import { PlayerItem } from "@custom-types/items"
import { ParsedPlayerIngameProfile, PlayerLeaderboardData } from "@custom-types/profile"

type OverallStatsPromise = ParsedPlayerIngameProfile | PlayerLeaderboardData | ParsedPlayerBattles | PlayerItem[]

export async function getOverallStats(userId: UserID) {
	const promises = await Promise.allSettled([
		getPlayerProfile(userId),
		getPlayerRank(userId),
		getPlayerBattles(userId),
		getPlayerItems({ userID: userId }),
	])

	const fulfilledPromises = promises
		.filter(
			(promise: PromiseSettledResult<any>): promise is PromiseFulfilledResult<any> => promise.status === "fulfilled"
		)
		.map((promise) => {
			return promise.value
		})

	const profile = fulfilledPromises.find(
		(promise: OverallStatsPromise): promise is ParsedPlayerIngameProfile =>
			(promise as ParsedPlayerIngameProfile).userID != undefined &&
			(promise as ParsedPlayerIngameProfile).roninAddress != undefined
	)

	const leaderboard = fulfilledPromises.find(
		(promise: OverallStatsPromise): promise is PlayerLeaderboardData =>
			(promise as PlayerLeaderboardData).rank != undefined && (promise as PlayerLeaderboardData).topRank != undefined
	)

	const battles = fulfilledPromises.find(
		(promise: OverallStatsPromise): promise is ParsedPlayerBattles =>
			!!(promise as ParsedPlayerBattles)?.battles?.length
	)

	const inventory = fulfilledPromises.find((promise: OverallStatsPromise): promise is PlayerItem[] =>
		Array.isArray(promise as PlayerItem[])
	)

	return {
		userId,
		profile,
		leaderboard,
		battles,
		inventory,
	}
}
