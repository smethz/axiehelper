import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import { BATTLES_API } from "@constants/url"
import { ArenaBattle, ParsedPlayerBattles } from "@custom-types/battle"
import { UserID } from "@custom-types/common"
import { GameAPI } from "@services/api"
import { cache } from "@services/cache"
import { parsePlayerBattles } from "@utils/parsers"
import logger from "pino-logger"

interface APIBattlesResponse {
	battles: ArenaBattle[] | []
}

interface APIBattlesParams {
	limit?: number
	offset?: number
	type?: "pve" | "pvp"
}

export async function getPlayerBattles(
	userId: UserID,
	options: APIBattlesParams = { limit: 100, offset: 0, type: "pvp" }
): Promise<ParsedPlayerBattles> {
	const cacheKey = `playerBattles:${userId}`
	const cacheEntry = await cache.get(cacheKey)

	if (cacheEntry) return JSON.parse(cacheEntry)

	const playerBattles = await GameAPI.get<APIBattlesResponse>(`/origin/battle-history`, {
		baseURL: BATTLES_API,
		params: {
			limit: options.limit,
			offset: options.offset,
			type: options.type,
			client_id: userId,
		},
	})
		.then((response) => response.data.battles)
		.catch((error) => logger.error(error))

	if (!playerBattles) throw new Error(`GameAPI Error: getPlayerBattles - ${userId}`)
	if (!playerBattles.length) throw new Error(`Players has no available battles - ${userId}`)

	const parsedPlayerBattles = await parsePlayerBattles(playerBattles, userId)

	await cache.set(cacheKey, JSON.stringify(parsedPlayerBattles), "EX", DEFAULT_CACHE_EXPIRATION)

	return parsedPlayerBattles
}
