import { CLIENT_INVITE_URL, GUILD_INVITE_URL } from "@configs/config.json"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	PermissionsBitField,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js"

const config: RESTPostAPIChatInputApplicationCommandsJSONBody = {
	name: "invite",
	description: `Generates a link you can use to invite the bot to your own server`,
}

const command: SlashCommand = {
	config,
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Misc",
	execute,
}
async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	const inviteEmbed = new EmbedBuilder().setTitle(translate("invite_title")).setColor("Random")

	const inviteButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setLabel(translate("labels.add_bot")).setStyle(ButtonStyle.Link).setURL(CLIENT_INVITE_URL),

		new ButtonBuilder().setLabel(translate("labels.support_server")).setStyle(ButtonStyle.Link).setURL(GUILD_INVITE_URL)
	)

	interaction
		.reply({
			embeds: [inviteEmbed],
			components: [inviteButtons],
			allowedMentions: { repliedUser: true },
		})
		.catch(() => {})
}

export default command
