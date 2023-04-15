import { getLandDetails } from "@apis/marketplace-api/getLandDetails"
import { createErrorEmbed } from "@client/components/embeds"
import { DEFAULT_IDLE_TIME, MAX_LAND_COORDS } from "@constants/index"
import emojis from "@constants/props/emojis.json"
import land_props from "@constants/props/land-props.json"
import { AXIEINFINITY_CDN_URL, MARKETPLACE_URL } from "@constants/url"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { ParsedLand } from "@custom-types/land"
import { componentFilter } from "@utils/componentFilter"
import { disableComponents } from "@utils/componentsToggler"
import { isAPIError } from "@utils/isAPIError"
import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ColorResolvable,
	ComponentType,
	EmbedBuilder,
	ModalActionRowComponentBuilder,
	ModalBuilder,
	PermissionsBitField,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js"

const command: SlashCommand = {
	config: {
		name: "land",
		description: "Shows the information of the specified Land",
		options: [
			{
				type: ApplicationCommandOptionType.Integer,
				name: "column",
				description: "Land Column Number",
				max_value: MAX_LAND_COORDS,
				min_value: -MAX_LAND_COORDS,
				required: true,
			},
			{
				type: ApplicationCommandOptionType.Integer,
				name: "row",
				description: "Land Row Number",
				max_value: MAX_LAND_COORDS,
				min_value: -MAX_LAND_COORDS,
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

	let column = interaction.options.getInteger("column", true)
	let row = interaction.options.getInteger("row", true)

	let landDetail = await getLandDetails(column, row)

	const requestFailedEmbed = createErrorEmbed({
		title: translate("errors.request_failed.title"),
		description: translate("errors.request_failed.description", { column, row }),
	})

	if (isAPIError(landDetail)) {
		await interaction.editReply({ embeds: [requestFailedEmbed] })
		return
	}

	let landEmbed = landDetail ? createLandEmbed(landDetail) : createLandNotFoundEmbed(column, row)
	let navigationButtons = createNavigationButtons(column, row)

	const message = await interaction.editReply({ embeds: [landEmbed], components: [navigationButtons] })

	const collector = message.createMessageComponentCollector<ComponentType.Button>({
		filter: componentFilter(interaction),
		idle: DEFAULT_IDLE_TIME,
	})

	collector.on("collect", async (buttonInteraction) => {
		const [currentColumn, currentRow] = await getCurrentCoords(column, row, buttonInteraction)

		column = currentColumn
		row = currentRow

		landDetail = await getLandDetails(column, row)

		if (isAPIError(landDetail)) {
			await interaction.editReply({ embeds: [requestFailedEmbed] })
			return
		}

		landEmbed = landDetail ? createLandEmbed(landDetail) : createLandNotFoundEmbed(column, row)
		navigationButtons = createNavigationButtons(column, row)

		await buttonInteraction.editReply({ embeds: [landEmbed], components: [navigationButtons] })
	})

	collector.on("end", () => {
		disableComponents(navigationButtons)
		message.edit({ components: [navigationButtons] }).catch(() => {})
	})

	function createLandEmbed(land: ParsedLand) {
		const landEmbed = new EmbedBuilder()
			.setTitle(translate("land_title", { landType: land.landType, column: land.col, row: land.col }))
			.setURL(land.url)
			.setThumbnail(land.thumbnail_url)
			.addFields({
				name: translate("owner"),
				value: `[${land.ownerProfile?.name ?? land.owner}](${MARKETPLACE_URL}/profile/${land.owner})`,
				inline: true,
			})
			.setColor(land.color as ColorResolvable)
			.setImage(land.image)

		if (land.order) {
			landEmbed.addFields({
				name: translate("price"),
				value: `${emojis.tokens.ethereum} **${Number(land.order.currentPrice) / 1e18}**\n$${Number(
					land.order.currentPriceUsd
				).toFixed(2)}`,
				inline: false,
			})
		}

		if (land.highestOffer) {
			landEmbed
				.addFields({
					name: translate("highest_offer_price"),
					value: `${emojis.tokens.ethereum} **${Number(land.highestOffer.currentPrice) / 1e18}**\n$${Number(
						land.highestOffer.currentPriceUsd
					).toFixed(2)}`,
					inline: true,
				})
				.addFields({
					name: translate("highest_bidder"),
					value: `[${land.highestOffer.makerProfile.name}](${MARKETPLACE_URL}/profile/${land.highestOffer.maker})`,
					inline: true,
				})
				.addFields({ name: translate("total_offers"), value: `${land.offers?.total}`, inline: true })
		}

		return landEmbed
	}

	function createLandNotFoundEmbed(column: number, row: number) {
		const notFoundEmbed = new EmbedBuilder()
			.setTitle(translate("unclaimed_plot", { column, row }))
			.setThumbnail(`${AXIEINFINITY_CDN_URL}/avatars/land/square/square_${column}_${row}.png`)

		return notFoundEmbed
	}

	async function getCurrentCoords(
		currentColumn: number,
		currentRow: number,
		navigationButton: ButtonInteraction
	): Promise<[number, number]> {
		switch (navigationButton.customId) {
			case "left":
				currentColumn = currentColumn - 1
				break
			case "right":
				currentColumn = currentColumn + 1
				break
			case "up":
				currentRow = currentRow - 1
				break
			case "down":
				currentRow = currentRow + 1
				break
			default:
				const coordsSelectModal = createCoordsSelectModal()

				await navigationButton.showModal(coordsSelectModal)

				await navigationButton
					.awaitModalSubmit({
						time: 1000 * 60 * 15,
					})
					.then(async (modalInteraction) => {
						if (!modalInteraction.deferred) await modalInteraction.deferUpdate()

						const columnInput = modalInteraction.fields.getTextInputValue("columnInput")
						const rowInput = modalInteraction.fields.getTextInputValue("rowInput")

						const intColumnInput = parseInt(columnInput)
						const intRowInput = parseInt(rowInput)

						if (
							isNaN(intColumnInput) ||
							isNaN(intRowInput) ||
							intColumnInput > MAX_LAND_COORDS ||
							intRowInput > MAX_LAND_COORDS ||
							intColumnInput < -MAX_LAND_COORDS ||
							intRowInput < -MAX_LAND_COORDS
						) {
							const invalidErrorMessage = translate("errors.invalid_coords")

							await modalInteraction.followUp({ content: invalidErrorMessage, ephemeral: true })
							return
						}

						currentColumn = intColumnInput
						currentRow = intRowInput
					})
					.catch(() => {})
		}

		if (navigationButton.customId !== "coords" && !navigationButton.deferred) {
			await navigationButton.deferUpdate()
		}

		return [currentColumn, currentRow]
	}

	function createCoordsSelectModal() {
		const modal = new ModalBuilder().setCustomId(`select-coords`).setTitle(translate("modal.title"))

		const columnInput = new TextInputBuilder()
			.setCustomId("columnInput")
			.setLabel(translate("modal.column_label"))
			.setPlaceholder(`-${MAX_LAND_COORDS} - ${MAX_LAND_COORDS}`)
			.setMaxLength(4)
			.setMinLength(1)
			.setStyle(TextInputStyle.Short)
			.setRequired(true)

		const rowInput = new TextInputBuilder()
			.setCustomId("rowInput")
			.setLabel(translate("modal.row_label"))
			.setPlaceholder(`-${MAX_LAND_COORDS} - ${MAX_LAND_COORDS}`)
			.setMaxLength(4)
			.setMinLength(1)
			.setStyle(TextInputStyle.Short)
			.setRequired(true)

		const columnActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(columnInput)
		const rowActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(rowInput)

		modal.addComponents([columnActionRow, rowActionRow])

		return modal
	}
}

export default command

function createNavigationButtons(currentColumn: number, currentRow: number) {
	const isMaxColumn = currentColumn === MAX_LAND_COORDS
	const isMinColumn = currentColumn === -MAX_LAND_COORDS
	const isMaxRow = currentRow === MAX_LAND_COORDS
	const isMinRow = currentRow === -MAX_LAND_COORDS

	const disabledStyle = (disabled: boolean) => (disabled ? ButtonStyle.Secondary : ButtonStyle.Primary)

	const components = [
		new ButtonBuilder({
			style: disabledStyle(isMinColumn),
			emoji: emojis.pagination.previous,
			customId: "left",
			disabled: isMinColumn,
		}),
		new ButtonBuilder({
			style: disabledStyle(isMaxColumn),
			emoji: emojis.pagination.next,
			customId: "right",
			disabled: isMaxColumn,
		}),
		new ButtonBuilder({
			style: ButtonStyle.Success,
			emoji: land_props.Arctic.emoji,
			label: `${currentColumn}, ${currentRow}`,
			customId: "coords",
		}),
		new ButtonBuilder({
			style: disabledStyle(isMinRow),
			emoji: emojis.pagination.up,
			customId: "up",
			disabled: isMinRow,
		}),
		new ButtonBuilder({
			style: disabledStyle(isMaxRow),
			emoji: emojis.pagination.down,
			customId: "down",
			disabled: isMaxRow,
		}),
	]

	return new ActionRowBuilder<ButtonBuilder>({ components })
}
