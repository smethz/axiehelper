import { cache } from "@services/cache"
import axios, { AxiosError } from "axios"
import logger from "pino-logger"

const VALID_UUID_REGEX = /[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}/i

export async function getBattleReplay(
	battleId: string,
	environment: "prod" | "esport" = "prod"
): Promise<string | void> {
	const cacheKey = `battle_replay:${battleId}`
	const cachedEntry = await cache.get(cacheKey)

	if (cachedEntry) return cachedEntry

	const url = `https://storage.googleapis.com/sm-${environment}-origin-battle-replay/pvp_battle_replay/${battleId}`

	const battleReplay = await axios
		.get<string>(url)
		.then((response) => response.data)
		.catch((error: AxiosError) => {
			logger.error(error, `Failed to retrieve battle replay - ${battleId}`)
		})

	if (!battleReplay) return

	const rpsWinner = battleReplay.match(VALID_UUID_REGEX)

	if (!rpsWinner) return

	await cache.set(cacheKey, rpsWinner[0])

	return rpsWinner[0]
}
