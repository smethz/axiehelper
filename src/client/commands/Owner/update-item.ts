import { updateBodyParts } from "@apis/getBodyParts"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { updateCardsList, updateCharmsList, updateRunesList } from "@utils/updateItemList"
import { updateSeason } from "@utils/updateSeason"
import { PermissionFlagsBits, PermissionsBitField, SlashCommandBuilder } from "discord.js"
import logger from "pino-logger"

const command: SlashCommand = {
	config: new SlashCommandBuilder()
		.setName("update-item")
		.setDescription("Update item lists")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false)
		.addSubcommand((command) =>
			command.setName("all").setDescription("Updates Cards, Runes, Charms, & Body Parts List")
		)
		.addSubcommand((command) => command.setName("body-parts").setDescription("Updates Body Parts List"))
		.addSubcommand((command) => command.setName("cards").setDescription("Updates Cards List"))
		.addSubcommand((command) => command.setName("runes").setDescription("Updates Runes List"))
		.addSubcommand((command) => command.setName("charms").setDescription("Updates Charms List"))
		.addSubcommand((command) => command.setName("seasons").setDescription("Updates Seasons List"))
		.toJSON(),
	userPermissions: [PermissionsBitField.Flags.Administrator],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	ownerOnly: true,
	execute,
	category: "Owner",
}

async function execute({ interaction }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const action = interaction.options.getSubcommand()

	try {
		switch (action) {
			case "cards": {
				await updateCardsList()
				break
			}
			case "charms": {
				await updateCharmsList()
				break
			}
			case "runes": {
				await updateRunesList()
				break
			}
			case "body-parts": {
				updateBodyParts()
				break
			}
			case "seasons": {
				updateSeason()
				break
			}
			default: {
				await Promise.all([updateBodyParts(), updateCardsList(), updateCharmsList(), updateRunesList(), updateSeason()])
				break
			}
		}

		await interaction.editReply(`Updated ${action} list`)
	} catch (error) {
		logger.error(error)
		await interaction.editReply("An error occured while trying to update the list")
	}
}

export default command
