import { getItemsList } from "@apis/gateway-api/getItemsList"

import { writeJsonSync } from "fs-extra"
import path from "path"
import { parseCard, parseItem } from "./parsers/parseItem"

export async function updateItemList(itemType: "charms" | "runes" | "cards"): Promise<void> {
	let itemList = await getItemsList(itemType)

	if (!itemList) throw new Error(`Failed to update ${itemType} List`)

	// Parse Cards
	if (itemType == "cards") itemList = itemList.map((item) => parseCard(item))

	// Parse Charms and Runes
	if (itemType == "charms" || itemType == "runes") itemList = itemList.map((item) => parseItem(item))

	writeJsonSync(path.join(__dirname, `../constants/props/${itemType}.json`), itemList)
}

export async function updateCardsList(): Promise<void> {
	await updateItemList("cards")
}

export async function updateRunesList(): Promise<void> {
	await updateItemList("runes")
}

export async function updateCharmsList(): Promise<void> {
	await updateItemList("charms")
}
