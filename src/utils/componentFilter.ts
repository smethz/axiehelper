import { ButtonInteraction, ChatInputCommandInteraction, StringSelectMenuInteraction } from "discord.js"
import i18next from "i18next"

export function componentFilter(interaction: ChatInputCommandInteraction | ButtonInteraction) {
	const filter = (componentInteraction: StringSelectMenuInteraction | ButtonInteraction) => {
		if (componentInteraction.user.id === interaction.user.id) return true

		componentInteraction
			.reply({
				content: i18next.t("errors.unauthorized_interaction", {
					ns: "common",
					lng: componentInteraction.locale,
				}),
				ephemeral: true,
				allowedMentions: { repliedUser: true },
			})
			.catch(() => {})

		return false
	}

	return filter
}
