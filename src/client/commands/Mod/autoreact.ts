import { createErrorEmbed, createSuccessEmbed } from "@client/components/embeds"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { db } from "@services/db"
import { createGuild, getGuild } from "@utils/dbFunctions"
import { EmbedBuilder, PermissionFlagsBits, PermissionsBitField, SlashCommandBuilder } from "discord.js"
import logger from "pino-logger"

const command: SlashCommand = {
	config: new SlashCommandBuilder()
		.setName("autoreact")
		.setDescription("Disable or enable auto react on a message for this server")
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.addStringOption((option) =>
			option
				.setName("keyword")
				.setRequired(true)
				.setDescription("Select the keyword to auto react to messages")
				.setChoices(
					{
						name: "Axie",
						value: "axie",
					},
					{
						name: "AXS",
						value: "axs",
					},
					{
						name: "Marketplace",
						value: "marketplace",
					},
					{
						name: "Ronin",
						value: "ronin",
					},
					{
						name: "SLP",
						value: "slp",
					}
				)
		)
		.toJSON(),
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	ownerOnly: false,
	category: "Mod",
	execute,
}

async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const keyword = interaction.options.getString("keyword", true).toLowerCase()

	try {
		let guild = await getGuild(interaction.guildId)

		if (!guild) {
			guild = await createGuild({
				id: interaction.guildId,
				settings: {
					connectOrCreate: {
						where: { id: interaction.guildId },
						create: {
							id: interaction.guildId,
						},
					},
				},
			})
		}

		// Disable Keyword to Auto React
		if (guild.settings?.autoreacts?.includes(keyword)) {
			for (const [index, react] of guild.settings.autoreacts.entries()) {
				if (react.toLowerCase() === keyword.toLowerCase()) guild.settings.autoreacts.splice(index, 1)
			}

			await db.guild
				.update({
					where: { id: interaction.guildId },
					data: {
						settings: {
							update: {
								autoreacts: {
									set: guild.settings.autoreacts,
								},
							},
						},
					},
				})
				.finally(async () => await db.$disconnect())

			const disabledEmbed = new EmbedBuilder()
				.setDescription(translate("keyword.disabled", { keyword: keyword.toUpperCase() }))
				.setColor("Red")
			await interaction.editReply({ embeds: [disabledEmbed] })
		} else {
			if (!guild.settings) {
				guild = await db.guild.update({
					where: { id: interaction.guildId },
					data: {
						settings: {
							connectOrCreate: {
								where: { id: interaction.guildId },
								create: {
									id: interaction.guildId,
								},
							},
						},
					},
					include: {
						settings: true,
					},
				})
			}

			// Enable Keyword to Auto React
			await db.guild
				.update({
					where: { id: interaction.guildId },
					data: {
						settings: {
							update: {
								autoreacts: {
									push: keyword,
								},
							},
						},
					},
				})
				.finally(async () => await db.$disconnect())

			const successEmbed = createSuccessEmbed({
				title: translate("success.enabled.title"),
				description: translate("success.enabled.description", {
					keyword: keyword.toUpperCase(),
				}),
			})

			interaction.editReply({ embeds: [successEmbed] })
		}
	} catch (error) {
		logger.error(error, error.message)

		const errorEmbed = createErrorEmbed({
			title: translate("errors.failed.title"),
			description: translate("errors.failed.description"),
		})

		await interaction.editReply({ embeds: [errorEmbed] })
	}
}

export default command
