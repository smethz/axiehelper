import emojis from "@constants/props/emojis.json"
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	EmbedBuilder,
	Message,
	ModalActionRowComponentBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js"
import i18next from "i18next"
import logger from "pino-logger"

export function createPaginationButtons({
	pageIndex,
	maxPage,
	isDynamic,
}: {
	pageIndex: number
	maxPage: number
	isDynamic?: boolean
}) {
	const isFirst = pageIndex === 0
	const isLast = pageIndex === maxPage - 1
	const isSinglePage = maxPage === 1
	const disabledStyle = (disabled: boolean) => (disabled ? ButtonStyle.Secondary : ButtonStyle.Primary)

	const components = [
		new ButtonBuilder({
			style: disabledStyle(isFirst),
			emoji: emojis.pagination.first,
			customId: "first",
			disabled: isFirst,
		}),
		new ButtonBuilder({
			style: disabledStyle(isFirst),
			emoji: emojis.pagination.previous,
			customId: "previous",
			disabled: isFirst,
		}),
		new ButtonBuilder({
			style: disabledStyle(isLast),
			emoji: emojis.pagination.next,
			customId: "next",
			disabled: isLast,
		}),
		new ButtonBuilder({
			style: disabledStyle(isLast),
			emoji: emojis.pagination.last,
			customId: "last",
			disabled: isLast,
		}),
	]

	if (isDynamic) {
		components.splice(
			2,
			0,
			new ButtonBuilder({
				style: isSinglePage ? ButtonStyle.Secondary : ButtonStyle.Success,
				emoji: emojis.pagination.jump,
				customId: "page-jump",
				disabled: isSinglePage,
			})
		)
	}

	return new ActionRowBuilder<ButtonBuilder>({ components })
}

export function createPages(items: string, itemsPerPage: number = 20) {
	const NUM_OF_ITEMS_PER_PAGE_REGEX = new RegExp(`(?=[\\s\\S])(?:.*\n?){1,${itemsPerPage}}`, "gm")

	return (items.match(NUM_OF_ITEMS_PER_PAGE_REGEX) as string[]) || []
}

export async function getPageIndex(buttonInteraction: ButtonInteraction, pageIndex: number, maxPage: number) {
	switch (buttonInteraction.customId) {
		case "first": {
			pageIndex = 0
			break
		}
		case "previous": {
			pageIndex = Math.max(pageIndex - 1, 0)
			break
		}
		case "next": {
			pageIndex = Math.min(pageIndex + 1, maxPage)
			break
		}
		case "last": {
			pageIndex = maxPage - 1
			break
		}
		default: {
			// Show Modal
			const pageSelectModal = createPageSelectModal(maxPage)

			await buttonInteraction.showModal(pageSelectModal)

			await buttonInteraction
				.awaitModalSubmit({
					time: 1000 * 60 * 15,
				})
				.then(async (modalInteraction) => {
					if (!modalInteraction.deferred) await modalInteraction.deferUpdate()
					let pageInput = modalInteraction.fields.getTextInputValue("pageInput")

					const rawPageIndex = parseInt(pageInput)

					if (isNaN(rawPageIndex) || rawPageIndex < 1 || rawPageIndex > maxPage) {
						const invalidErrorMessage = i18next.t("pagination.invalid_page_number", {
							maxPage,
							ns: "common",
							lng: buttonInteraction.locale,
						})

						await modalInteraction.followUp({ content: invalidErrorMessage, ephemeral: true })
						return
					}

					pageIndex = rawPageIndex - 1
				})
				.catch(() => {})
		}
	}

	if (buttonInteraction.customId !== "page-jump" && !buttonInteraction.deferred) {
		await buttonInteraction.deferUpdate()
	}

	return pageIndex
}

/**
 * Handles Paginations
 * Limited to Buttons Only, Doesn't Support Multiple Action Rows
 * @export
 * @param {ButtonInteraction} buttonInteraction
 * @param {ActionRowBuilder<ButtonBuilder>} paginationControllerButtons
 * @param {Message} message
 * @param {string[]} pages
 * @param {number} pageIndex
 */
export async function handlePagination(
	buttonInteraction: ButtonInteraction,
	paginationControllerButtons: ActionRowBuilder<ButtonBuilder>,
	message: Message,
	pages: string[],
	pageIndex: number
) {
	const embed = new EmbedBuilder(message.embeds[0]?.toJSON())

	embed.setDescription(pages[pageIndex] as string)
	embed.setFooter({
		text: getFooter(pageIndex, pages, buttonInteraction.locale),
	})
	embed.setColor("Random")

	paginationControllerButtons = createPaginationButtons({ pageIndex, maxPage: pages.length })

	await buttonInteraction
		.editReply({ embeds: [embed], components: [paginationControllerButtons] })
		.catch((error) => logger.error(error))
}

export function getFooter(pageIndex: number, pages: string[] | number, locale: string) {
	return i18next.t("pagination.footer", {
		currentPage: pageIndex + 1,
		numOfPages: Array.isArray(pages) ? pages.length : pages,
		ns: "common",
		lng: locale,
	})
}

export function createPageSelectModal(maxPage: number) {
	const modal = new ModalBuilder().setCustomId(`select-page`).setTitle("Jump to Page")

	const pageInput = new TextInputBuilder()
		.setCustomId("pageInput")
		.setLabel("Page Number")
		.setPlaceholder(`1 - ${maxPage}`)
		.setMaxLength(maxPage.toString().length)
		.setMinLength(1)
		.setStyle(TextInputStyle.Short)
		.setRequired(true)

	const pageActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(pageInput)

	modal.addComponents(pageActionRow)

	return modal
}

export function getPageFromOffset(offset: number | null, numOfItemsPerPage: number = 20) {
	if (!offset) return 1

	const pageNum = Math.ceil(offset / numOfItemsPerPage)

	return Math.min(Math.max(pageNum, 1), pageNum || Infinity)
}
