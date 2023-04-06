import { getPlayerProfile } from "@apis/game-api/getPlayerProfile"
import { resolveProfile } from "@apis/ronin-rest/resolveProfile"
import { createErrorEmbed } from "@client/components/embeds"
import { DEFAULT_IDLE_TIME, MAX_LEADERBOARD_PLAYERS } from "@constants/index"
import { CommandExecuteParams, SlashCommand, TranslateFunction } from "@custom-types/command"
import { PlayerIngameProfile as PlayerProfileIngame } from "@custom-types/profile"
import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders"
import { PlayerProfile } from "@prisma/client"
import { componentFilter } from "@utils/componentFilter"
import {
	GuildWithLeaderboard,
	getGuildLeaderboard,
	removePlayersFromLeaderboard,
	resetGuildLeaderboard,
	updateGuildLeaderboard,
} from "@utils/dbFunctions"
import { isAPIError } from "@utils/isAPIError"
import { isFulfilled } from "@utils/promiseHandler"
import { trimStringInBack } from "@utils/trimString"
import { determineAddress } from "@utils/validateAddress"
import {
	ButtonInteraction,
	ButtonStyle,
	CollectorFilter,
	ComponentType,
	EmbedBuilder,
	Message,
	PermissionFlagsBits,
	SlashCommandBuilder,
} from "discord.js"

const command: SlashCommand = {
	config: new SlashCommandBuilder()
		.setName("manage-leaderboard")
		.setDescription("Manage the Guild's Leaderboard")
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.toJSON(),

	userPermissions: [],
	botPermissions: [
		PermissionFlagsBits.ReadMessageHistory,
		PermissionFlagsBits.EmbedLinks,
		PermissionFlagsBits.AttachFiles,
	],
	ownerOnly: false,
	category: "Mod",
	execute,
}

async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const dbGuild = await getGuildLeaderboard(interaction.guildId)

	const actionEmbed = new EmbedBuilder()
		.setAuthor({
			name: translate("action.title"),
			iconURL: interaction.guild.iconURL()!,
		})
		.setDescription(translate("action.description"))
		.setFooter({
			text: translate("action.footer", {
				leaderboardPlayers: dbGuild?.leaderboard.length || 0,
				maxLeaderboardPlayers: MAX_LEADERBOARD_PLAYERS,
			}),
		})
		.setColor("Random")

	const actionButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId("add").setLabel(translate("labels.add")).setStyle(ButtonStyle.Primary),
		new ButtonBuilder().setCustomId("remove").setLabel(translate("labels.remove")).setStyle(ButtonStyle.Primary),
		new ButtonBuilder().setCustomId("reset").setLabel(translate("labels.reset")).setStyle(ButtonStyle.Danger),
		new ButtonBuilder().setCustomId("cancel").setLabel(translate("labels.cancel")).setStyle(ButtonStyle.Secondary)
	)

	// No Players in the Leaderboard
	if (!dbGuild || !dbGuild.leaderboard.length) {
		actionButtons.components[1]?.setDisabled(true)
		actionButtons.components[2]?.setDisabled(true)
	}

	// Maximum Players Limit Reached
	if (dbGuild?.leaderboard && dbGuild.leaderboard.length >= MAX_LEADERBOARD_PLAYERS) {
		actionButtons.components[0]?.setDisabled(true)
	}

	const message = await interaction.editReply({
		embeds: [actionEmbed],
		components: [actionButtons],
	})

	const buttonInteraction = await message
		.awaitMessageComponent<ComponentType.Button>({
			filter: componentFilter(interaction),
			time: DEFAULT_IDLE_TIME,
		})
		.catch(() => {})

	// No Response
	if (!buttonInteraction) {
		const noResponseEmbed = createErrorEmbed({
			title: translate("errors.timeout.title"),
			description: translate("errors.timeout.description"),
		})

		await message.edit({ embeds: [noResponseEmbed], components: [] }).catch(() => {})
		return
	}

	await buttonInteraction.update({ components: [] })

	if (buttonInteraction.customId === "add") {
		handleAdd(buttonInteraction, dbGuild, translate)
	}

	if (buttonInteraction.customId === "remove") {
		handleRemove(buttonInteraction, dbGuild, translate)
	}

	if (buttonInteraction.customId === "reset") {
		handleReset(buttonInteraction, translate)
	}

	if (buttonInteraction.customId === "cancel") {
		const cancelEmbed = createErrorEmbed({
			title: translate("errors.cancel.title"),
			description: translate("errors.cancel.description"),
		})

		await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => {})
	}
}

export default command

async function handleReset(buttonInteraction: ButtonInteraction<"cached">, translate: TranslateFunction) {
	const confirmEmbed = new EmbedBuilder()
		.setAuthor({
			name: translate("reset_confirmation.title"),
			iconURL: "https://discordemoji.com/assets/emoji/outage.png",
		})
		.setDescription(translate("reset_confirmation.description"))
		.setColor("Orange")

	const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId("confirm").setLabel(translate("labels.confirm")).setStyle(ButtonStyle.Primary),
		new ButtonBuilder().setCustomId("cancel").setLabel(translate("labels.cancel")).setStyle(ButtonStyle.Secondary)
	)

	// Send a message for confirmation
	const confirmMessage = await buttonInteraction.editReply({
		embeds: [confirmEmbed],
		components: [confirmRow],
	})
	const userResponse = await confirmMessage
		.awaitMessageComponent<ComponentType.Button>({
			filter: componentFilter(buttonInteraction),
			idle: DEFAULT_IDLE_TIME,
		})
		.catch(() => {})

	// No Response
	if (!userResponse) {
		confirmEmbed.setAuthor({ name: translate("errors.timeout.title") })
		confirmEmbed.setDescription(translate("errors.timeout.description"))
		confirmEmbed.setColor("Red")

		confirmMessage.edit({ embeds: [confirmEmbed], components: [] }).catch(() => {})
		return
	}

	await userResponse.deferUpdate()

	// Cancel
	if (userResponse.customId === "cancel") {
		confirmEmbed.setAuthor({ name: translate("errors.cancel.title") })
		confirmEmbed.setDescription(translate("errors.cancel.description"))
		confirmEmbed.setColor("Red")

		userResponse.editReply({ embeds: [confirmEmbed], components: [] })
		return
	}

	// Confirmed
	if (userResponse.customId === "confirm") {
		// Deletes all addresses in the leaderboard
		await resetGuildLeaderboard(confirmMessage.guildId)

		confirmEmbed.setAuthor({ name: translate("success.reset.title") })
		confirmEmbed.setDescription(translate("success.reset.description"))
		confirmEmbed.setColor("Green")
		userResponse.editReply({ embeds: [confirmEmbed], components: [] })
		return
	}
}

async function handleRemove(
	buttonInteraction: ButtonInteraction<"cached">,
	dbGuild: GuildWithLeaderboard,
	translate: TranslateFunction
) {
	const removeEmbed = new EmbedBuilder()
		.setTitle(translate("remove_prompt.title"))
		.setDescription(translate("remove_prompt.description"))
		.setImage(`https://i.imgur.com/xBuZqQ1.png`)
		.setColor("Orange")

	const removeMessage = await buttonInteraction.editReply({
		embeds: [removeEmbed],
		components: [],
	})
	const msgFilter: CollectorFilter<[Message<any>]> = (message: Message<true>) =>
		message.author.id === buttonInteraction.user.id
	const userResponse = await removeMessage.channel
		.awaitMessages({ filter: msgFilter, time: DEFAULT_IDLE_TIME, max: 1 })
		.catch(() => {})

	// No Response
	if (!userResponse) {
		const noResponseEmbed = createErrorEmbed({
			title: translate("errors.timeout.title"),
			description: translate("errors.timeout.description"),
		})

		return removeMessage.channel.send({ embeds: [noResponseEmbed] })
	}

	const msgContent = userResponse.first()!.content.toLowerCase()

	// Cancel
	if (msgContent == "cancel") {
		const cancelEmbed = createErrorEmbed({
			title: translate("errors.cancel.title"),
			description: translate("errors.cancel.description"),
		})

		await userResponse
			.first()
			?.reply({ embeds: [cancelEmbed] })
			.catch(() => {})

		return
	}

	const addressesArray = msgContent.trim().split(/\s+/)
	let playerIDsToRemove = [...new Set(addressesArray)] // No Duplicates

	if (!playerIDsToRemove) {
		const noIdEmbed = createErrorEmbed({
			title: translate("errors.no_id_provided.title"),
			description: translate("errors.no_id_provided.description"),
		})

		await removeMessage.channel.send({ embeds: [noIdEmbed] }).catch(() => {})
		return
	}

	playerIDsToRemove = playerIDsToRemove
		.filter((id) => determineAddress(id))
		.map((id) => {
			if (id.length == 40) id = "ronin:" + id
			if (id.startsWith("0x")) id = id.replace("0x", "ronin:")
			return id
		})

	// Filter Array to Only Unique
	const playersToRemove = dbGuild!.leaderboard
		.filter((player) =>
			playerIDsToRemove.some((idsToRemove) => idsToRemove === player.id || idsToRemove === player.roninAddress)
		)
		.map((players) => players.id)

	const uniquePlayersToRemove = [...new Set(playersToRemove)]

	const newLeaderboardPlayers = await removePlayersFromLeaderboard(buttonInteraction.guildId, uniquePlayersToRemove)

	const removeEmbedText = translate("success.remove.description", {
		numOfIDs: playerIDsToRemove.length,
		numOfIDsRemoved: playersToRemove.length,
	})

	const embed = new EmbedBuilder()
		.setAuthor({
			name: translate("success.remove.title", {
				playersToRemove: playersToRemove.length,
			}),
		})
		.setDescription(removeEmbedText)
		.setFooter({
			text: translate("action.footer", {
				leaderboardPlayers: newLeaderboardPlayers.leaderboard.length,
				maxLeaderboardPlayers: MAX_LEADERBOARD_PLAYERS,
			}),
		})
		.setColor("Green")

	await userResponse
		.first()
		?.reply({ embeds: [embed] })
		.catch(() => {})
	return
}

async function handleAdd(
	buttonInteraction: ButtonInteraction<"cached">,
	dbGuild: GuildWithLeaderboard,
	translate: TranslateFunction
) {
	const addEmbed = new EmbedBuilder()
		.setTitle(translate("add_prompt.title"))
		.setDescription(translate("add_prompt.description"))
		.setImage(`https://i.imgur.com/xBuZqQ1.png`)
		.setColor("Orange")

	const addMessage = await buttonInteraction.editReply({ embeds: [addEmbed] })
	const msgFilter: CollectorFilter<any> = (m: Message<true>) => m.author.id === buttonInteraction.user.id
	const userResponse = await addMessage.channel
		.awaitMessages({ filter: msgFilter, time: 1000 * 60 * 10, max: 1 })
		.catch(() => {})

	// No Response
	if (!userResponse || !userResponse.size || !userResponse.first()) {
		const noResponseEmbed = createErrorEmbed({
			title: translate("errors.timeout.title"),
			description: translate("errors.timeout.description"),
		})
		return addMessage.edit({ embeds: [noResponseEmbed] }).catch(() => {})
	}

	const msgContent = userResponse.first()!.content.toLowerCase()

	// Cancel
	if (msgContent == "cancel") {
		const cancelEmbed = createErrorEmbed({
			title: translate("errors.cancel.title"),
			description: translate("errors.cancel.description"),
		})
		return addMessage.edit({ embeds: [cancelEmbed] }).catch(() => {})
	}

	const providedIDs = msgContent
		.trim()
		.split(/\s+/)
		.map((id) => {
			if (id.length == 40) id = "ronin:" + id
			if (id.startsWith("0x")) id = id.replace("0x", "ronin:")
			return id
		})

	if (!providedIDs.length) {
		const noIdEmbed = createErrorEmbed({
			title: translate("errors.no_id_provided.title"),
			description: translate("errors.no_id_provided.description"),
		})
		return addMessage.channel.send({ embeds: [noIdEmbed] })
	}

	if (!dbGuild) dbGuild = await updateGuildLeaderboard(buttonInteraction.guildId, [])

	// No Duplicates
	const uniqueIDsToAdd = [...new Set(providedIDs)].map((address) => {
		if (address.length === 40) address = "ronin:" + address
		if (address.startsWith("0x")) address = address.replace("0x", "ronin:")
		return address
	})

	// Max Limit Check
	if (dbGuild.leaderboard.length + uniqueIDsToAdd.length >= MAX_LEADERBOARD_PLAYERS) {
		const embed = createErrorEmbed({
			title: translate("errors.limit_exceed.title"),
			description: translate("errors.limit_exceed.description", {
				numOfMaxPlayers: MAX_LEADERBOARD_PLAYERS - dbGuild.leaderboard.length,
			}),
		}).setFooter({ text: translate("errors.limit_exceed.footer") })

		return addMessage.edit({ embeds: [embed], components: [] }).catch(() => {})
	}

	const processEmbed = new EmbedBuilder()
		.setTitle(translate("process.title"))
		.setDescription(translate("process.description"))
		.setThumbnail("https://i.imgur.com/pZZaY0o.gif")
		.setColor("Random")

	const processMessage = await userResponse
		.first()
		?.reply({ embeds: [processEmbed] })
		.catch(() => {})

	// IDs that have valid format
	const validFormat_IDs = providedIDs.filter((id) => determineAddress(id))

	// Invalid IDs due to formatting
	const invalidFormat_IDs = providedIDs.filter((id) => !validFormat_IDs.includes(id))

	const uniqueValidIDs = [...new Set(validFormat_IDs)]
	const parsedUniqueValidIDs = parseUniqueIDs(uniqueValidIDs, dbGuild) // Removed duplicates of ronin address and user id

	// IDs that are already in the leaderboard
	const alreadyInLeaderboard_IDs = parsedUniqueValidIDs.filter((idToAdd) => {
		const alreadyExists = (player: PlayerProfile) => player.id === idToAdd || player.roninAddress === idToAdd
		return dbGuild!.leaderboard.some(alreadyExists)
	}) // returns address and clientId

	// Get Player Profiles
	const promises = parsedUniqueValidIDs
		.filter((id) => !alreadyInLeaderboard_IDs.includes(id))
		.map((validID) => getValidProfile(validID))

	const fulfilledPromises = await Promise.allSettled(promises)

	// List of Valid Player Profiles
	let playersToAdd = fulfilledPromises.filter(isFulfilled).flatMap((v) => v.value) as unknown as PlayerProfileIngame[]
	playersToAdd = playersToAdd.filter(
		(obj, index, self) =>
			index === self.findIndex((item) => item.userID === obj.userID && item.roninAddress === obj.roninAddress)
	) // Making it unique cause of ronin and clientId couldnt be determined if its the same player

	// List of Invalid IDs due to not having a profile
	const invalidProfile_IDs = parsedUniqueValidIDs
		.filter((id) => !alreadyInLeaderboard_IDs.includes(id))
		.filter((id) => {
			return !playersToAdd.some((profile) => profile.userID === id || profile.roninAddress === id)
		})

	// Add Players in Leaderboard
	dbGuild = await updateGuildLeaderboard(dbGuild.id, playersToAdd)

	let addedPlayersText =
		`${providedIDs.length} ${translate("ids_provided")}\n` + `${validFormat_IDs.length} ${translate("valid_format")}\n`

	const mergedInvalidIDs = [...new Set([...alreadyInLeaderboard_IDs, ...invalidFormat_IDs, ...invalidProfile_IDs])]

	if (mergedInvalidIDs.length) {
		if (providedIDs.length - uniqueIDsToAdd.length) {
			addedPlayersText += `${providedIDs.length - uniqueIDsToAdd.length} ${translate("duplicates")}\n`
		}

		if (invalidFormat_IDs.length) {
			addedPlayersText += `${invalidFormat_IDs.length} ${translate("invalid_format")}\n`
		}

		if (invalidProfile_IDs.length) {
			addedPlayersText += `${invalidProfile_IDs.length} ${translate("invalid_profile")}\n`
		}

		if (alreadyInLeaderboard_IDs.length) {
			addedPlayersText += `${alreadyInLeaderboard_IDs.length} ${translate("already_added")}\n`
		}

		addedPlayersText += `\n**${translate("invalid_list")}**\n\`\`\`${trimStringInBack(
			mergedInvalidIDs.join("\n"),
			3900
		)}\`\`\``
	}

	const addedEmbed = new EmbedBuilder()
		.setAuthor({
			name: translate("success.add.title", {
				numOfPlayers: playersToAdd.length,
			}),
		})
		.setDescription(addedPlayersText)
		.setFooter({
			text: translate("action.footer", {
				leaderboardPlayers: dbGuild.leaderboard.length || 0,
				maxLeaderboardPlayers: MAX_LEADERBOARD_PLAYERS,
			}),
		})
		.setColor(`Green`)

	return processMessage?.edit({ embeds: [addedEmbed] }).catch(() => {})
}

async function getValidProfile(validID: string) {
	if (determineAddress(validID) == "roninAddress") {
		const resolvedProfile = await resolveProfile(validID)

		if (!resolvedProfile || isAPIError(resolvedProfile)) return

		validID = resolvedProfile.accountId
	}

	return getPlayerProfile(validID)
}

function parseUniqueIDs(ids: string[], guild: GuildWithLeaderboard) {
	const parsedToClientIds = []
	for (let id of ids) {
		// Check if the id can be identified with the leaderboard
		if (guild?.leaderboard.some((player) => player.id === id || player.roninAddress === id)) {
			// Replace the id with the clientId
			const clientId = guild.leaderboard.find((player) => player.id === id || player.roninAddress === id)!.id

			parsedToClientIds.push(clientId)
		} else {
			// Otherwise its not in the leaderboard
			parsedToClientIds.push(id)
		}
	}

	return [...new Set(parsedToClientIds)]
}
