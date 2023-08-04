import { getItemsList } from "@apis/gateway-api/getItemsList"

import { writeJsonSync } from "fs-extra"
import path from "path"
import { parseCard, parseItem } from "./parsers/parseItem"

export async function updateItemList(options: {
	itemType: "charms" | "runes" | "cards"
	force: boolean
}): Promise<void> {
	let itemList = await getItemsList(options.itemType, options.force)

	if (!itemList) throw new Error(`Failed to update ${options.itemType} List`)

	// Parse Cards
	if (options.itemType == "cards") itemList = itemList.map((item) => parseCard(item))

	// Parse Charms and Runes
	if (options.itemType == "charms" || options.itemType == "runes") itemList = itemList.map((item) => parseItem(item))

	writeJsonSync(path.join(__dirname, `../constants/props/${options.itemType}.json`), itemList)
}

export async function updateCardsList(options: { force: boolean } = { force: false }): Promise<void> {
	await updateItemList({ itemType: "cards", force: options.force })
}

export async function updateRunesList(options: { force: boolean } = { force: false }): Promise<void> {
	await updateItemList({ itemType: "runes", force: options.force })
}

export async function updateCharmsList(options: { force: boolean } = { force: false }): Promise<void> {
	await updateItemList({ itemType: "charms", force: options.force })
}
