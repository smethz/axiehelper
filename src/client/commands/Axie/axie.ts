import { getAxieDetails } from "@apis/marketplace-api/getAxieDetails"
import { createErrorEmbed } from "@client/components/embeds"
import classProps from "@constants/props/axie-class-props.json"
import { MARKETPLACE_URL } from "@constants/url"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { createDetailedAxieCanvas } from "@utils/canvas"
import { isAPIError } from "@utils/isAPIError"
import { parseAddress, parseAxieGenes } from "@utils/parsers"
import { ApplicationCommandOptionType, AttachmentBuilder, EmbedBuilder, PermissionsBitField } from "discord.js"

const command: SlashCommand = {
	config: {
		name: "axie",
		description: "Shows the information of the specified Axie",
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

	if (!axie || isAPIError(axie)) {
		const noAxieEmbed = createErrorEmbed({
			title: translate("errors.no_axie.title"),
			description: translate("errors.no_axie.description", { axieId }),
		})

		await interaction.editReply({ embeds: [noAxieEmbed] }).catch(() => {})
		return
	}

	if (!axie.class) {
		const axieEggEmbed = createErrorEmbed({
			title: translate("errors.axie_egg.title"),
			description: translate("errors.axie_egg.description"),
		})

		await interaction.editReply({ embeds: [axieEggEmbed] }).catch(() => {})
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

	const axieParsedGenes = parseAxieGenes(axie.newGenes)

	const axieCanvas = await createDetailedAxieCanvas(axie, axieParsedGenes)

	const axieEmbed = new EmbedBuilder()
		.setDescription(
			`${classProps[axie.class.toLowerCase() as keyof typeof classProps].emoji} [${axie.name} - ${axie.id}](${
				axie.url
			})`
		)
		.addFields({
			name: translate("breed.name"),
			value: translate("breed.value", {
				breedCount: axie.breedCount,
				purityCount: axieParsedGenes.purity,
				qualityPercentage: axieParsedGenes.quality,
			}),
			inline: true,
		})
		.addFields({
			name: translate("owner.name"),
			value: translate("owner.value", {
				ownerName: axie.ownerProfile?.name ?? translate("owner.default"),
				ownerProfileUrl: `${MARKETPLACE_URL}/profile/${parseAddress(axie.owner, "ronin")}`,
			}),
			inline: true,
		})
		.addFields({
			name: translate("birthdate.name"),
			value: translate("birthdate.value", {
				birthDate: `<t:${axie.birthDate}:f>`,
			}),
			inline: true,
		})
		.setImage("attachment://axie.png")
		.setColor("Random")
		.setTimestamp()

	const attachment = new AttachmentBuilder(axieCanvas, { name: "axie.png" })

	interaction.editReply({ embeds: [axieEmbed], files: [attachment] }).catch(() => {})
}

export default command
