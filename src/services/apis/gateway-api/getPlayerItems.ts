import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import { UserID } from "@custom-types/common"
import { PlayerItem } from "@custom-types/items"
import { GatewayAPI } from "@services/api"
import { cache } from "@services/cache"
import { isAPIError } from "@utils/isAPIError"
import { isFulfilled } from "@utils/promiseHandler"
import { AxiosError } from "axios"
import pThrottle from "p-throttle"
import logger from "pino-logger"

const throttle = pThrottle({ limit: 10, interval: 1000 })

interface APIPlayerItemsResponse {
	_items: PlayerItem[]
	_metadata: Metadata
	_etag: string
}

interface Metadata {
	limit: number
	offset: number
	total: number
	hasNext: boolean
}

interface APIPlayerItemsParams {
	userID: UserID
	limit?: number
	offset?: number
	itemIDs?: string
}

export async function getPlayerItems({
	userID,
	limit = 100,
	offset = 0,
	itemIDs,
}: APIPlayerItemsParams): Promise<PlayerItem[] | AxiosError | void> {
	const cacheKey = `playerItems:${userID}`
	const cachedEntry = await cache.get(cacheKey)
	if (cachedEntry) return JSON.parse(cachedEntry)

	const endpoint = `/origins/v2/community/users/${userID}/items`

	const throttledRequest = throttle(async () => {
		const initialPlayerItems = await GatewayAPI.get<APIPlayerItemsResponse>(endpoint, {
			params: { limit, offset, itemIDs },
		})
			.then(async (response) => response.data)
			.catch((error: AxiosError) => {
				logger.error(`GatewayAPI Error: ${error.response?.status} getPlayerItems - ${userID}`)
				return error
			})

		if (isAPIError(initialPlayerItems)) return initialPlayerItems

		if (!initialPlayerItems._items.length) return

		const metadata = initialPlayerItems._metadata
		let playerItems = initialPlayerItems._items

		if (metadata.hasNext) {
			const totalPages = Math.ceil(metadata.total / metadata.limit)
			let promisesArray = []

			for (let currentPage = 1; currentPage < totalPages; currentPage++) {
				promisesArray.push(
					GatewayAPI.get<APIPlayerItemsResponse>(endpoint, {
						params: { limit, offset: 1 + limit * currentPage },
					})
				)
			}

			const settledPromises = await Promise.allSettled(promisesArray)
			const moreItems = settledPromises.filter(isFulfilled).flatMap((promise) => promise.value.data._items)

			playerItems = [...new Set([...moreItems, ...playerItems])]
		}

		return playerItems
	})

	const playerItems = await throttledRequest()

	if (!playerItems) return

	if (isAPIError(playerItems)) return playerItems

	await cache.set(cacheKey, JSON.stringify(playerItems), "EX", DEFAULT_CACHE_EXPIRATION)

	return playerItems
}
