import { AutoCompleteParams } from "@custom-types/command"
import { db } from "@services/db"
import { getUser } from "@utils/dbFunctions"
import Fuse from "fuse.js"

export default async function idAutocomplete({ interaction }: AutoCompleteParams) {
	const focusedValue = interaction.options.getFocused()

	const dbUser = await getUser(interaction.user.id)

	// No Saved Profiles - Show Random Profiles from DB
	if (!dbUser?.savedProfiles.length) {
		const dbPlayers = await db.playerProfile.findMany()

		if (!dbPlayers.length) return

		if (!focusedValue) {
			interaction
				.respond(
					dbPlayers.slice(0, 25).map((player) => {
						return {
							name: `${player.name} - ${player.roninAddress}`,
							value: player.roninAddress,
						}
					})
				)
				.catch(() => {})
			return
		}

		const options = {
			threshold: 0.4,
			minMatchCharLength: focusedValue.length,
			keys: ["name", "id", "roninAddress"],
		}

		const fuse = new Fuse(dbPlayers, options)
		const searchResult = fuse.search(focusedValue)

		const choices = searchResult.map((result) => {
			return {
				name: result.item.name,
				address: result.item.roninAddress,
			}
		})

		if (choices.length > 25) choices.length = 25

		interaction
			.respond(
				choices.map((choice) => ({
					name: `${choice.name} — ${choice.address}`,
					value: choice.address,
				}))
			)
			.catch(() => {})

		return
	}

	if (!focusedValue) {
		interaction
			.respond(
				dbUser.savedProfiles
					.sort((a, b) => {
						if ((a.customName || a.profile.name) < (b.customName || b.profile.name)) return -1
						if ((a.customName || a.profile.name) > (b.customName || b.profile.name)) return 1
						return 0
					})
					.slice(0, 25)
					.map((player) => {
						return {
							name: `${player.customName || player.profile.name} - ${player.profile.roninAddress}`,
							value: player.profile.roninAddress,
						}
					})
			)
			.catch(() => {})
		return
	}

	const options = {
		threshold: 0.4,
		minMatchCharLength: focusedValue.length,
		keys: ["customName", "profileId", "profile.name", "profile.roninAddress"],
	}

	const fuse = new Fuse(dbUser.savedProfiles, options)
	const searchResult = fuse.search(focusedValue)

	const choices = searchResult.map((result) => {
		return {
			name: result.item.customName || result.item.profile.name,
			address: result.item.profile.roninAddress,
		}
	})

	if (choices.length > 25) choices.length = 25

	interaction
		.respond(
			choices.map((choice) => ({
				name: `${choice.name} — ${choice.address}`,
				value: choice.address,
			}))
		)
		.catch(() => {})

	return
}
