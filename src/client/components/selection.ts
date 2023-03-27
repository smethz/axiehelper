import emojis from "@constants/props/emojis.json"
import type { PlayerProfile, SavedProfile } from "@prisma/client"
import {
	ActionRowBuilder,
	APIMessageComponentEmoji,
	APISelectMenuOption,
	parseEmoji,
	SelectMenuComponentOptionData,
	StringSelectMenuBuilder,
} from "discord.js"

export function createSelectionMenu(menuOptions: SelectMenuComponentOptionData[], maxValue: number = 1) {
	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder({
			custom_id: "selection-menu",
			max_values: maxValue,
			options: menuOptions,
		})
	)
}

export const MAX_OPTIONS_IN_SELECT_MENU = 25
const HALF_OPTIONS = Math.floor(MAX_OPTIONS_IN_SELECT_MENU / 2)

export function createDynamicSelection<T>(itemsArray: Array<T>, currentIndex: number = 0) {
	if (itemsArray.length <= MAX_OPTIONS_IN_SELECT_MENU || currentIndex <= HALF_OPTIONS)
		return itemsArray.slice(0, MAX_OPTIONS_IN_SELECT_MENU)

	if (currentIndex >= itemsArray.length - HALF_OPTIONS) {
		return itemsArray.slice(-MAX_OPTIONS_IN_SELECT_MENU)
	} else {
		const behindItems = currentIndex - HALF_OPTIONS > 0 ? currentIndex - HALF_OPTIONS : 0
		const forwardItems =
			currentIndex + HALF_OPTIONS < itemsArray.length ? currentIndex + HALF_OPTIONS : itemsArray.length

		return itemsArray.slice(behindItems, forwardItems + 1)
	}
}

export const PROFILE_SELECTOR_ID = "profile-selector"

export function createProfileSelectMenu(
	profiles: (SavedProfile & {
		profile: PlayerProfile
	})[],
	selectedProfile: SavedProfile & {
		profile: PlayerProfile
	} = profiles[0]!
) {
	const parsedProfiles = profiles.map((profile, index) => {
		return { ...profile, index: index + 1 }
	})

	const selectedProfileIndex = profiles.findIndex((profile) => profile.profileId === selectedProfile.profileId)
	const dynamicProfiles = createDynamicSelection(parsedProfiles, selectedProfileIndex)

	const menuOptions: APISelectMenuOption[] = dynamicProfiles.map((profile) => {
		return {
			label: `${profile.index}. ${profile.customName || profile.profile.name}`,
			description: profile.profileId,
			value: profile.profileId,
			emoji: parseEmoji(emojis.ronin) as APIMessageComponentEmoji,
			default: profile.profileId === selectedProfile.profileId,
		}
	})

	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder().setCustomId(PROFILE_SELECTOR_ID).addOptions(menuOptions)
	)
}
