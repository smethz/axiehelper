import { getAxieDetails } from "@apis/marketplace-api/getAxieDetails"
import { createErrorEmbed } from "@client/components/embeds"
import axieClassProps from "@constants/props/axie-class-props.json"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { ApplicationCommandOptionType, ColorResolvable, EmbedBuilder, PermissionsBitField } from "discord.js"

const command: SlashCommand = {
	config: {
		name: "peek",
		description: "Shows the image of the specified Axie",
		options: [
			{
				type: ApplicationCommandOptionType.Integer,
				name: "id",
				description: "Axie ID Number",
				required: true,
			},
		],
	},
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Axie",
	execute,
}

async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const axieId = interaction.options.getInteger("id", true)

	const axie = await getAxieDetails(axieId)

	if (!axie) {
		const failedEmbed = createErrorEmbed({
			title: translate("errors.request_failed.failed.title"),
			description: translate("errors.request_failed.description", { axieId }),
		})

		await interaction.editReply({ embeds: [failedEmbed] }).catch(() => {})
		return
	}

	if (axie.chain.toLowerCase() === "ethereum") {
		const unsupportedEmbed = createErrorEmbed({
			title: translate("errors.unsupported_chain.title"),
			description: translate("errors.unsupported_chain.description"),
		})

		await interaction.editReply({ embeds: [unsupportedEmbed] }).catch(() => {})
		return
	}

	const axieEmbed = new EmbedBuilder().setImage(axie.image)

	if (!axie.class) {
		axieEmbed.setDescription(`[${axie.id} - #${axie.name}](${axie.url})`)
	} else {
		axieEmbed.setDescription(`[${axieClassProps[axie.class].emoji} #${axie.id} - ${axie.name}](${axie.url})`)

		axieEmbed.setColor(axieClassProps[axie.class].color as ColorResolvable)
	}

	axieEmbed.setImage(axie.image)

	await interaction.editReply({ embeds: [axieEmbed] }).catch(() => {})
}

export default command
