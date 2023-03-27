import { resolveProfile } from "@apis/ronin-rest/resolveProfile"
import { createErrorEmbed } from "@client/components/embeds"
import { AXIES_IO_URL } from "@constants/url"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { parseAddress } from "@utils/parsers"
import { determineAddress } from "@utils/validateAddress"
import { ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField } from "discord.js"

const command: SlashCommand = {
	config: {
		name: "profile",
		description: "Shows the basic details of the given Ronin Address or User ID",
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "id",
				description: "Ronin Address or User ID",
				required: true,
			},
		],
	},
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Misc",
	execute,
}

async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const id = interaction.options.getString("id", true)

	const determinedId = determineAddress(id)

	if (!determinedId) {
		const invalidIdEmbed = createErrorEmbed({
			title: translate("errors.invalid_format.title"),
			description: translate("errors.invalid_format.description"),
		})

		await interaction.editReply({ embeds: [invalidIdEmbed] }).catch(() => {})
		return
	}

	const profile = await resolveProfile(id)

	if (!profile || !profile.accountId || !profile.ronin) {
		const invalidProfileEmbed = createErrorEmbed({
			title: translate("errors.no_profile.title"),
			description: translate("errors.no_profile.description"),
		})

		await interaction.editReply({ embeds: [invalidProfileEmbed] }).catch(() => {})
		return
	}

	const parsedAddress = parseAddress(profile.ronin, "ronin")

	const profileEmbed = new EmbedBuilder()
		.setTitle(translate("profile_title", { name: profile.name }))
		.setURL(`${AXIES_IO_URL}/profile/${parsedAddress}`)
		.addFields([
			{
				name: translate("ronin_address"),
				value: parsedAddress,
				inline: false,
			},
			{
				name: translate("user_id"),
				value: profile.accountId,
				inline: false,
			},
		])
		.setColor("Random")
	await interaction.editReply({ embeds: [profileEmbed] }).catch(() => {})
}

export default command
