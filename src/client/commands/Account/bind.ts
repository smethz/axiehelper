import { getPlayerProfile } from "@apis/game-api/getPlayerProfile"
import { resolveProfile } from "@apis/ronin-rest/resolveProfile"
import { createErrorEmbed, createSuccessEmbed } from "@client/components/embeds"
import { MAX_SAVED_PROFILES } from "@constants/index"
import { CommandExecuteParams, InteractionModalParams, SlashCommand } from "@custom-types/command"
import { Prisma } from "@prisma/client"
import { db } from "@services/db"
import { createUser, getUser } from "@utils/dbFunctions"
import { isValidClientID, isValidRoninAddress } from "@utils/validateAddress"
import {
	ActionRowBuilder,
	EmbedBuilder,
	ModalActionRowComponentBuilder,
	ModalBuilder,
	PermissionsBitField,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js"

const config: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "bind",
	description: "Bind a profile to your account",
}

const command: SlashCommand = {
	config,
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Account",
	execute,
	validateModal,
}

async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	const user = await getUser(interaction.user.id)

	if (user && user.savedProfiles.length >= MAX_SAVED_PROFILES) {
		const maxReachedEmbed = new EmbedBuilder()
			.setAuthor({ name: translate("errors.max_limit_reached.title") })
			.setDescription(translate("errors.max_limit_reached.description"))
			.setColor("Red")
		await interaction.reply({ embeds: [maxReachedEmbed] }).catch(() => {})
		return
	}

	const modal = new ModalBuilder().setCustomId(`${command.config.name}-modal`).setTitle(translate("modal.title"))

	const userIdInput = new TextInputBuilder()
		.setCustomId("userIdInput")
		.setLabel(translate("modal.id_input.label"))
		.setStyle(TextInputStyle.Short)
		.setRequired(true)
		.setPlaceholder(translate("modal.id_input.placeholder"))
		.setMinLength(36)
		.setMaxLength(46)

	const nameInput = new TextInputBuilder()
		.setCustomId("nameInput")
		.setLabel(translate("modal.name_input.label"))
		.setStyle(TextInputStyle.Short)
		.setRequired(false)
		.setPlaceholder(translate("modal.name_input.placeholder"))
		.setMaxLength(150)

	const userIdActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(userIdInput)
	const nameActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(nameInput)

	// Add inputs to the modal
	modal.addComponents(userIdActionRow, nameActionRow)

	// Show the modal to the user
	await interaction.showModal(modal)
}

async function validateModal({ interaction, translate }: InteractionModalParams): Promise<void> {
	await interaction.deferReply()

	let playerId = interaction.fields.getTextInputValue("userIdInput")
	let customName = interaction.fields.getTextInputValue("nameInput")

	if (!isValidClientID(playerId) && !isValidRoninAddress(playerId)) {
		const invalidEmbed = createErrorEmbed({
			title: translate("errors.invalid_id.title"),
			description: translate("errors.invalid_id.description"),
		})
		await interaction.editReply({ embeds: [invalidEmbed] }).catch(() => {})
		return
	}

	const profileIdentifier = await resolveProfile(playerId)

	const invalidEmbed = createErrorEmbed({
		title: translate("errors.profile_not_retrieved.title"),
		description: translate("errors.profile_not_retrieved.description"),
	})

	if (!profileIdentifier) {
		await interaction.editReply({ embeds: [invalidEmbed] }).catch(() => {})
		return
	}

	const profileDetails = await getPlayerProfile(profileIdentifier.accountId)

	if (!profileDetails) {
		await interaction.editReply({ embeds: [invalidEmbed] }).catch(() => {})
		return
	}

	const userData = await getUser(interaction.user.id)

	if (!userData) {
		const newUserData: Prisma.UserCreateInput = {
			id: interaction.user.id,
			savedProfiles: {
				create: {
					id: profileDetails.userID,
					customName,
					profile: {
						connectOrCreate: {
							where: {
								id: profileDetails.userID,
							},
							create: {
								id: playerId,
								name: profileDetails.name,
								roninAddress: profileDetails.roninAddress,
							},
						},
					},
				},
			},
		}

		await createUser(newUserData)

		const addedEmbed = createSuccessEmbed({
			title: translate("success.added.title"),
			description: translate("success.added.description", {
				userId: playerId,
				name: profileDetails.name,
			}),
		})
		await interaction.editReply({ embeds: [addedEmbed] }).catch(() => {})

		return
	}

	if (userData.savedProfiles?.some((savedProfile) => savedProfile.profileId === playerId)) {
		const addressAlreadyExistsEmbed = createErrorEmbed({
			title: translate("errors.already_added.title"),
			description: translate("errors.already_added.description"),
		})
		await interaction.editReply({ embeds: [addressAlreadyExistsEmbed] }).catch(() => {})
		return
	}

	await db.user
		.update({
			where: {
				id: interaction.user.id,
			},
			data: {
				savedProfiles: {
					create: {
						id: profileDetails.userID,
						customName,
						profile: {
							connectOrCreate: {
								where: {
									id: profileDetails.userID,
								},
								create: {
									id: profileDetails.userID,
									name: profileDetails.name,
									roninAddress: profileDetails.roninAddress,
								},
							},
						},
					},
				},
			},
		})
		.catch(async () => {
			const updateError = createErrorEmbed({
				title: translate("errors.unexpected_error.title"),
				description: translate("errors.unexpected_error.description"),
			})
			await interaction.editReply({ embeds: [updateError] }).catch(() => {})
		})
		.finally(async () => await db.$disconnect())

	const addedSuccessEmbed = createSuccessEmbed({
		title: translate("success.added.title"),
		description: translate("success.added.description", {
			userId: playerId,
			name: profileDetails.name,
		}),
	})

	await interaction.editReply({ embeds: [addedSuccessEmbed] }).catch(() => {})
}

export default command
