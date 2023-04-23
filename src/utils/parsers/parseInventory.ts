import emojis from "@constants/props/emojis.json"
import { TranslateFunction } from "@custom-types/command"
import { ItemRarity, ItemWeight, PlayerItem, PlayerItems } from "@custom-types/items"
import { getCharmsList, getRunesList } from "@utils/getItemList"
import { APIEmbedField } from "discord.js"

export function parseInventory(playerItems: PlayerItem[]) {
	const charmsList = getCharmsList()
	const runesList = getRunesList()

	const charms = playerItems
		.filter((item) => item.quantity > 0)
		.filter((item) => item.itemId.startsWith("ecard_"))
		.map((item) => {
			return {
				...item,
				charm: charmsList.find((list) => list.item.id === item.itemId),
			}
		})

	const runes = playerItems
		.filter((item) => item.quantity > 0)
		.filter((item) => item.itemId.startsWith("rune_"))
		.map((item) => {
			return {
				...item,
				rune: runesList.find((list) => list.item.id === item.itemId),
			}
		})

	return [...charms, ...runes] as PlayerItems
}

function filterItemType(items: PlayerItems, type: "charm" | "rune"): PlayerItems {
	const filteredItems = items.filter((item) => {
		return item[type] !== undefined
	})

	return filteredItems
}

function filterItemByRarity(inventory: PlayerItems, itemType: "charm" | "rune", rarity: ItemRarity) {
	const filteredType = filterItemType(inventory, itemType)

	return filteredType.filter((items) => items[itemType]?.item.rarity === rarity)
}

function countMintable(items: PlayerItems): number {
	return items.reduce((previousVal, currentVal) => {
		return currentVal.withdrawable ? previousVal + 1 : previousVal
	}, 0)
}

export function getRuneCharmsOverviewField(
	playerInventory: PlayerItems,
	translate: TranslateFunction
): APIEmbedField[] {
	let fields = []

	const ItemRarities = Object.values(ItemRarity)
	const rarityRunes = ItemRarities.map((rarity) => filterItemByRarity(playerInventory, "rune", rarity))
	const rarityCharms = ItemRarities.map((rarity) => filterItemByRarity(playerInventory, "charm", rarity))

	if (rarityRunes.some((rarityRune) => rarityRune.length)) {
		const runeList = createItemFieldText(playerInventory, "rune", translate)

		fields.push({
			name: `${emojis.tokens.axie_rune} ${translate("runes", {
				ns: "common",
			})}`,
			value: runeList,
			inline: false,
		})
	}

	if (rarityCharms.some((rarityCharm) => rarityCharm.length)) {
		const charmsList = createItemFieldText(playerInventory, "charm", translate)

		fields.push({
			name: `${emojis.tokens.axie_charm} ${translate("charms", {
				ns: "common",
			})}`,
			value: charmsList,
			inline: false,
		})
	}

	return fields
}

export function createItemFieldText(
	playerInventory: PlayerItems | undefined,
	itemType: "charm" | "rune",
	translate?: TranslateFunction
) {
	if (!playerInventory) return `No ${itemType} available`

	const ItemRarities = Object.values(ItemRarity)
	const rarityItems = ItemRarities.map((rarity) => filterItemByRarity(playerInventory, itemType, rarity))

	const itemListText = ItemRarities.map((rarityType, index) => {
		let fieldText = `${emojis.rarity[rarityType.toLowerCase() as keyof typeof emojis.rarity]} `
		fieldText += ` **${rarityItems[index]?.length || 0}** `
		fieldText += countMintable(rarityItems[index]!) ? `(${countMintable(rarityItems[index]!)}) ` : ``
		if (translate) fieldText += translate(`rarity.${rarityType.toLowerCase()}`, { ns: "common" })
		return fieldText
	}).join(" ")

	return itemListText
}

export function getInventoryWeight(playerInventory: PlayerItems | undefined) {
	if (!playerInventory) {
		return {
			charms_weight: 0,
			runes_weight: 0,
		}
	}

	const charms_weight = filterItemType(playerInventory, "charm").reduce((sum, item) => {
		const charmWeight = ItemWeight[item.charm!.item.rarity]
		return sum + charmWeight
	}, 0)

	const runes_weight = filterItemType(playerInventory, "rune").reduce((sum, item) => {
		const runeWeight = ItemWeight[item.rune!.item.rarity]
		return sum + runeWeight
	}, 0)

	return {
		charms_weight,
		runes_weight,
	}
}
