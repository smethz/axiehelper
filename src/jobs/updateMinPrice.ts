import { getMinTokenPrice } from "@apis/marketplace-api/getMinTokenPrice"
import { ItemMinimumPrice, TokenType } from "@custom-types/items"
import { getCharmsList, getRunesList } from "@utils/getItemList"
import { splitArray } from "@utils/splitArray"
import { CronJob } from "cron"

export const updateMinPriceJob = new CronJob({
	cronTime: "0 */15 * * * *",
	onTick: updatePrice,
	start: true, // invoke the job on start
})

async function updatePrice() {
	const runesList = getRunesList()
	const charmsList = getCharmsList()

	const validRunes = runesList
		.filter((rune) => rune.craftable && rune.item.tokenId && rune.item.id.endsWith("_nft"))
		.map((rune) => rune.item.tokenId)

	const validCharms = charmsList
		.filter((charm) => charm.craftable && charm.item.tokenId && charm.item.id.endsWith("_nft"))
		.map((charm) => charm.item.tokenId)

	const maxSize = 100

	const splitRuneRequest = splitArray(validRunes, maxSize).map((tokenIds) => {
		return getMinTokenPrice(tokenIds, TokenType.Rune)
	})

	const splitCharmRequest = splitArray(validCharms, maxSize).map((tokenIds) => {
		return getMinTokenPrice(tokenIds, TokenType.Charm)
	})

	const minTokenPrices = await Promise.all<ItemMinimumPrice[] | void>([...splitRuneRequest, ...splitCharmRequest]).then(
		(values) => values.filter((price): price is ItemMinimumPrice[] => (price as ItemMinimumPrice[]) !== null).flat()
	)

	if (!minTokenPrices.length) return

	globalThis.tokensPrice = minTokenPrices
}
