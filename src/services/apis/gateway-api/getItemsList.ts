import { Metadata } from "@custom-types/common"
import { GatewayAPI } from "@services/api"
import { cache } from "@services/cache"
import { isFulfilled } from "@utils/promiseHandler"
import logger from "pino-logger"

interface APIItemListResponse {
	_items: any[]
	_metadata: Metadata
	_etag: string
}

export async function getItemsList(
	itemType: "charms" | "runes" | "cards",
	force: boolean = false
): Promise<Array<any> | void> {
	const cacheKey = `itemList:${itemType}`

	if (!force) {
		const cachedEntry = await cache.get(cacheKey)
		if (cachedEntry) return JSON.parse(cachedEntry)
	}

	const endpoint = `/origins/v2/community/${itemType}`

	const initialItemList = await GatewayAPI.get<APIItemListResponse>(endpoint, { params: { limit: 100, offset: 0 } })
		.then(async (response) => response.data)
		.catch(async (error) => {
			logger.error(error)
		})

	if (!initialItemList) return
	if (!Array.isArray(initialItemList._items) || !initialItemList._items?.length) return

	const metadata = initialItemList._metadata
	let itemList = initialItemList._items

	if (metadata.hasNext) {
		const totalPages = Math.ceil(metadata.total / metadata.limit)
		let promisesArray = []

		for (let currentPage = 1; currentPage < totalPages; currentPage++) {
			promisesArray.push(
				GatewayAPI.get<APIItemListResponse>(endpoint, {
					params: { limit: 100, offset: 1 + 100 * currentPage },
				})
			)
		}

		const settledPromises = await Promise.allSettled(promisesArray)
		const moreItems = settledPromises.filter(isFulfilled).flatMap((promise) => promise.value.data._items)

		itemList = [...new Set([...moreItems, ...itemList])]
	}

	await cache.set(cacheKey, JSON.stringify(itemList))

	return itemList
}
