import emojis from "@constants/props/emojis.json"
import { getGuild } from "@utils/dbFunctions"
import { Message, PermissionsBitField } from "discord.js"

const reactKeywords = ["slp", "axs", "ronin", "axie", "marketplace"]

export default async function (message: Message) {
	// Autoreact when message has matching keyword
	if (reactKeywords.some((keyword) => message.content.toLowerCase().includes(keyword))) {
		if (
			message.inGuild() &&
			message.guild.members.me?.permissions.has([
				PermissionsBitField.Flags.UseExternalEmojis,
				PermissionsBitField.Flags.AddReactions,
				PermissionsBitField.Flags.ReadMessageHistory,
			])
		) {
			const guild = await getGuild(message.guild.id)

			if (guild?.settings?.autoreacts?.length) {
				const keywordMatches = guild.settings?.autoreacts?.filter(
					(keyword) => reactKeywords.includes(keyword) && message.content.toLowerCase().includes(keyword)
				)

				const reactionPromises = keywordMatches.map((keyword) => {
					return message.react(emojis.reactions[keyword as keyof typeof emojis.reactions])
				})

				Promise.allSettled(reactionPromises)
			}
		}
	}
}
