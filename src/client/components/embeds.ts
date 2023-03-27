import { AxiosError } from "axios"
import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import i18next from "i18next"

export function createErrorEmbed({ title, description }: { title: string; description: string }) {
	return new EmbedBuilder().setAuthor({ name: title }).setDescription(description).setColor("Red")
}

export function createAPIErrorEmbed(error: AxiosError) {
	return createErrorEmbed({
		title: `${error.response?.status} ${error.response?.statusText}`,
		description: error.message,
	})
}

export function createSuccessEmbed({ title, description }: { title: string; description: string }) {
	return new EmbedBuilder().setAuthor({ name: title }).setDescription(description).setColor("Green")
}

export async function sendError(interaction: ChatInputCommandInteraction, errorId: string) {
	const invalidIdEmbed = createErrorEmbed({
		title: i18next.t(`errors.${errorId}.title`, {
			ns: "common",
			lng: interaction.locale,
		}),
		description: i18next.t(`errors.${errorId}.description`, {
			ns: "common",
			lng: interaction.locale,
		}),
	})

	await interaction.editReply({ embeds: [invalidIdEmbed] }).catch(() => {})
}

export async function sendInvalidUserIdError(interaction: ChatInputCommandInteraction) {
	await sendError(interaction, "invalid_id")
}

export async function sendInvalidProfileError(interaction: ChatInputCommandInteraction) {
	await sendError(interaction, "invalid_profile")
}

export async function sendInvalidFormatError(interaction: ChatInputCommandInteraction) {
	await sendError(interaction, "invalid_format")
}

export async function sendInvalidRoninAddressError(interaction: ChatInputCommandInteraction) {
	await sendError(interaction, "invalid_address")
}

export async function sendNoSavedProfilesError(interaction: ChatInputCommandInteraction, specifiedUserId: string) {
	const noAddressEmbed = createErrorEmbed({
		title: i18next.t("errors.no_profile.title", {
			ns: "common",
			lng: interaction.locale,
		}),
		description: i18next.t(
			specifiedUserId === interaction.user.id
				? "errors.no_profile.description.self"
				: "errors.no_profile.description.others",
			{ ns: "common", lng: interaction.locale }
		),
	})

	await interaction.editReply({ embeds: [noAddressEmbed] }).catch(() => {})

	return
}
