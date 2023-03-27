import { createErrorEmbed, createSuccessEmbed } from "@client/components/embeds"
import { MAX_OPTIONS_IN_SELECT_MENU } from "@client/components/selection"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { ButtonBuilder } from "@discordjs/builders"
import { componentFilter } from "@utils/componentFilter"
import { deleteSavedProfile, getUser } from "@utils/dbFunctions"
import {
	ActionRowBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	PermissionsBitField,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	SelectMenuComponentOptionData,
	StringSelectMenuBuilder,
} from "discord.js"

const config: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "unbind",
	description: "Unbind saved profiles from your account",
}

const command: SlashCommand = {
	config,
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Account",
	execute,
}

async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const userId = interaction.user.id

	const userData = await getUser(userId)

	if (!userData?.savedProfiles?.length) {
		await interaction
			.editReply({
				embeds: [
					createErrorEmbed({
						title: translate("errors.no_address.title"),
						description: translate("errors.no_address.description"),
					}),
				],
			})
			.catch(() => {})
		return
	}

	const cancelledEmbed = createErrorEmbed({
		title: translate("errors.cancelled.title"),
		description: translate("errors.cancelled.description"),
	})

	const timedOutEmbed = createErrorEmbed({
		title: translate("errors.timed_out.title"),
		description: translate("errors.timed_out.description"),
	})

	const failedEmbed = createSuccessEmbed({
		title: translate("errors.failed.title"),
		description: translate("errors.failed.description"),
	})

	const profiledRemovedEmbed = createSuccessEmbed({
		title: translate("success.removed_selected.title"),
		description: translate("success.removed_selected.description"),
	})

	// Show Confirmation to remove
	if (userData.savedProfiles.length === 1) {
		const removedProfileEmbed = new EmbedBuilder()
			.setAuthor({ name: translate("confirmation.title") })
			.setDescription(
				translate("confirmation.description", {
					profileId: userData.savedProfiles[0]!.profileId,
				})
			)
			.setColor("Orange")

		const actionButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder().setCustomId("remove").setStyle(ButtonStyle.Danger).setLabel(translate("remove-button-label")),
			new ButtonBuilder()
				.setCustomId("cancel")
				.setStyle(ButtonStyle.Secondary)
				.setLabel(translate("cancel-button-label"))
		)

		const message = await interaction.editReply({
			embeds: [removedProfileEmbed],
			components: [actionButtons],
		})

		const buttonInteraction = await message.awaitMessageComponent<ComponentType.Button>({
			filter: componentFilter(interaction),
			time: DEFAULT_IDLE_TIME,
		})

		// Timeout
		if (!buttonInteraction) {
			await message.edit({ embeds: [timedOutEmbed], components: [] }).catch(() => {})
			return
		}

		// Remove
		if (buttonInteraction.customId === "remove") {
			try {
				await deleteSavedProfile(userData.id, [userData.savedProfiles[0]!.profileId])

				await message.edit({ embeds: [profiledRemovedEmbed], components: [] }).catch(() => {})
			} catch {
				await message
					.edit({
						embeds: [failedEmbed],
						components: [],
					})
					.catch(() => {})
			}
		}

		// Cancel
		if (buttonInteraction.customId === "cancel") {
			message.edit({ embeds: [cancelledEmbed], components: [] }).catch(() => {})
		}

		return
	}

	if (userData.savedProfiles.length > MAX_OPTIONS_IN_SELECT_MENU)
		userData.savedProfiles.length = MAX_OPTIONS_IN_SELECT_MENU

	// Select which account to remove
	const profileSelectionOptions = userData.savedProfiles.map((savedProfile) => {
		return {
			value: savedProfile.profileId,
			description: savedProfile.profileId,
			label: savedProfile.customName || savedProfile.profile.name,
		}
	})

	const profileSelector = createProfileSelectMenu(profileSelectionOptions)
	const cancelButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId("cancel").setStyle(ButtonStyle.Danger).setLabel(translate("cancel-button-label"))
	)

	const selectAddressEmbed = new EmbedBuilder()
		.setAuthor({ name: translate("select_address.title") })
		.setDescription(translate("select_address.description"))
		.setColor("Blue")

	const message = await interaction.editReply({
		embeds: [selectAddressEmbed],
		components: [profileSelector, cancelButton],
	})

	const componentInteraction = await message.awaitMessageComponent<ComponentType.Button | ComponentType.StringSelect>({
		filter: componentFilter(interaction),
		time: DEFAULT_IDLE_TIME,
	})

	if (!componentInteraction) {
		await message.edit({ embeds: [timedOutEmbed], components: [] }).catch(() => {})
		return
	}

	if (componentInteraction.isButton()) {
		await message.edit({ embeds: [cancelledEmbed], components: [] }).catch(() => {})
		return
	}

	if (componentInteraction.isStringSelectMenu()) {
		await componentInteraction.deferUpdate()

		try {
			const profileIdsToDelete = userData.savedProfiles
				.filter((value) => componentInteraction.values.includes(value.profileId))
				.map((profile) => profile.profileId)

			// Remove Selected Saved Profiles from the User
			await deleteSavedProfile(userData.id, profileIdsToDelete)

			profileSelector.components[0]?.setPlaceholder(
				translate("selected-placeholder", {
					removedSize: componentInteraction.values.length,
				})
			)
			profileSelector.components[0]?.setDisabled(true)

			await componentInteraction.editReply({
				embeds: [profiledRemovedEmbed],
				components: [profileSelector],
			})
		} catch {
			await componentInteraction.editReply({
				embeds: [failedEmbed],
				components: [],
			})
		}
	}

	function createProfileSelectMenu(profileToRemoveOptions: SelectMenuComponentOptionData[]) {
		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId("selected-address")
				.setPlaceholder(translate("selection-placeholder"))
				.setMinValues(1)
				.setMaxValues(profileToRemoveOptions.length)
				.addOptions(profileToRemoveOptions)
		)
	}
}

export default command
