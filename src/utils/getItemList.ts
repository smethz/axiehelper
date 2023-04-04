import { ParsedCard } from "@custom-types/card"
import { ParsedCharm } from "@custom-types/charm"
import { Part } from "@custom-types/parts"
import { ParsedRune } from "@custom-types/rune"
import { readJsonSync } from "fs-extra"
import path from "path"

export function getCardsList(): ParsedCard[] {
	return readJsonSync(path.join(__dirname, "../constants/props/cards.json"), "utf-8")
}

export function getRunesList(): ParsedRune[] {
	return readJsonSync(path.join(__dirname, "../constants/props/runes.json"), "utf-8")
}

export function getCharmsList(): ParsedCharm[] {
	return readJsonSync(path.join(__dirname, "../constants/props/charms.json"), "utf-8")
}

export function getBodyparts(): Part[] {
	const bodyParts = readJsonSync(path.join(__dirname, "../constants/props/body-parts.json"), "utf-8")
	return Object.values(bodyParts)
}
