import { createErrorEmbed } from "@client/components/embeds"
import { OWNER_IDS } from "@configs/config.json"
import { Interaction } from "discord.js"
import i18next, { TOptions } from "i18next"
import logger from "pino-logger"
import Client from ".."

export default async function (interaction: Interaction, client: Client) {
	if (!globalThis.isClientReady) return

	if (
		!interaction.isChatInputCommand() &&
		!interaction.isAutocomplete() &&
		!interaction.isUserContextMenuCommand() &&
		!interaction.isMessageContextMenuCommand() &&
		!interaction.isModalSubmit()
	) {
		return
	}

	if (!interaction.inCachedGuild()) {
		return
	}

	const commandName = interaction.isModalSubmit()
		? (interaction.customId.split("-")[0] as string)
		: interaction.commandName

	const command = client.slashCommands.get(commandName)

	if (!command) {
		return
	}

	// Auto Complete Handler
	if (interaction.isAutocomplete() && command.autocomplete) {
		await command.autocomplete({ interaction, client, translate })
		return
	}

	// Modal Submit Handler
	if (interaction.isModalSubmit() && command.validateModal) {
		await command.validateModal({ interaction, client, translate })
		return
	}

	if (!interaction.isChatInputCommand()) {
		return
	}

	if (command.ownerOnly && !OWNER_IDS.includes(interaction.user.id)) {
		return
	}

	if (command.botPermissions && interaction.channel?.isTextBased()) {
		const clientPerms = interaction.guild.members.me?.permissionsIn(interaction.channel)

		if (!clientPerms?.has(command.botPermissions)) {
			const missingPerms = clientPerms?.missing(command.botPermissions).join("` `")
			const missingPermsEmbed = createErrorEmbed({
				title: translate("errors.missing_perms.title", { ns: "common" }),
				description: translate("errors.missing_perms.description", {
					missingPerms,
					ns: "common",
				}),
			})

			return interaction.reply({ embeds: [missingPermsEmbed] }).catch(() => {})
		}
	}

	logger.info(`${interaction.user.username} (${interaction.user.id}): executed /${command.config.name}`)

	// Slash Command Handler
	try {
		await command.execute({ interaction, client, translate })
	} catch (error) {
		logger.error(error, `Command: ${command.config.name}`)

		if (!interaction.deferred) await interaction.deferReply()

		const errorEmbed = createErrorEmbed({
			title: translate("errors.execution_failed.title", { ns: "common" }),
			description: translate("errors.execution_failed.description", {
				commandName,
				ns: "common",
			}),
		})

		await interaction.editReply({
			embeds: [errorEmbed],
			components: [],
			attachments: [],
		})
	}

	return

	/**
	 * Transforms the given text to translated string for the specified namespace and locale
	 * @param {string | string[]} text Text to transform
	 * @param {object} options Options
	 * @return {string} The translated string
	 */
	function translate(
		text: string | string[],
		options: TOptions = {
			ns: command?.config.name,
			lng: interaction.locale || interaction.guildLocale,
		}
	): string {
		return i18next.t(text, {
			ns: options.ns ?? command?.config.name,
			lng: options.lng ?? interaction.locale,
			...options,
		})
	}
}
