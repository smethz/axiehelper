import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { PermissionsBitField } from "discord.js"

const command: SlashCommand = {
	config: {
		name: "ping",
		description: "Checks the Latency and API response times.",
	},
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Misc",
	execute,
}

async function execute({ interaction, client, translate }: CommandExecuteParams): Promise<void> {
	interaction
		.reply({ content: translate("pinging"), fetchReply: true })
		.then((message) => {
			const latency = Math.abs(message.createdTimestamp - interaction.createdTimestamp)
			message.edit(translate("pong", { latency, ping: Math.round(client.ws.ping) }))
		})
		.catch(() => {})
}

export default command
