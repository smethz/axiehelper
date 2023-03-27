import crafting_table from "@constants/props/exp-table.json"
import { PlayerItem } from "@custom-types/items"
import { Collection } from "discord.js"

export const expTable = new Collection(crafting_table.entries())

export function getPlayerExp(playerInventory: PlayerItem[] | undefined) {
	const crafting_exp = playerInventory?.find((id) => id.itemId === "crafting_exp")?.quantity || 0

	let table
	let level
	if (!crafting_exp) {
		table = expTable.first()
		level = expTable.first()?.level
	} else if (crafting_exp >= expTable.last()!.exp) {
		table = expTable.last()
		level = expTable.last()?.level
	} else {
		table = expTable.find((val) => {
			return val.exp > crafting_exp
		})
		level = table!.level - 1
	}

	return {
		level,
		crafting_exp,
		table_exp: table?.exp || expTable.at(1)?.exp,
	}
}
