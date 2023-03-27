import { DEFAULT_CACHE_EXPIRATION } from "@constants/index"
import { UserID } from "@custom-types/common"
import { PlayerItem } from "@custom-types/items"
import { GatewayAPI } from "@services/api"
import { cache } from "@services/cache"
import { isFulfilled } from "@utils/promiseHandler"
import { AxiosError } from "axios"
import pThrottle from "p-throttle"
import logger from "pino-logger"

const throttle = pThrottle({ limit: 5, interval: 1000 })

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
}: APIPlayerItemsParams): Promise<PlayerItem[]> {
	const cacheKey = `playerItems:${userID}`
	const cachedEntry = await cache.get(cacheKey)
	if (cachedEntry) return JSON.parse(cachedEntry)

	const request = throttle(async () => {
		return GatewayAPI.get<APIPlayerItemsResponse>("/origin/v2/community/users/items", {
			params: { userID, limit, offset, itemIDs },
		})
			.then(async (response) => {
				const metadata = response.data._metadata
				let items = response.data._items

				if (metadata.hasNext) {
					const totalPages = Math.ceil(metadata.total / metadata.limit)
					let promisesArray = []

					for (let currentPage = 1; currentPage < totalPages; currentPage++) {
						promisesArray.push(
							GatewayAPI.get<APIPlayerItemsResponse>(`origin/v2/community/users/items`, {
								params: { userID, limit, offset: 1 + limit * currentPage },
							})
						)
					}

					const settledPromises = await Promise.allSettled(promisesArray)
					const moreItems = settledPromises.filter(isFulfilled).flatMap((promise) => promise.value.data._items)

					items = [...new Set([...moreItems, ...items])]
				}

				await cache.set(cacheKey, JSON.stringify(items), "EX", DEFAULT_CACHE_EXPIRATION)

				return items
			})
			.catch((error: AxiosError) => {
				logger.error(error, `GatewayAPI Error: getPlayerItems - ${userID}`)
			})
	})

	const data = await request()

	if (!data) throw new Error(`GatewayAPI Error: getPlayerItems - ${userID}`)

	return data
}
