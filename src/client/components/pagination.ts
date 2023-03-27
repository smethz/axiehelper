import emojis from "@constants/props/emojis.json"
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, Message } from "discord.js"
import i18next from "i18next"
import logger from "pino-logger"

export function createPaginationButtons(pageIndex: number, pages: unknown[]) {
	const isFirst = pageIndex === 0
	const isLast = pageIndex === pages.length - 1
	const disabledStyle = (disabled: boolean) => (disabled ? ButtonStyle.Secondary : ButtonStyle.Primary)

	return new ActionRowBuilder<ButtonBuilder>({
		components: [
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
		],
	})
}

export function createPages(items: string, itemsPerPage: number = 20) {
	const NUM_OF_ITEMS_PER_PAGE_REGEX = new RegExp(`(?=[\\s\\S])(?:.*\n?){1,${itemsPerPage}}`, "gm")

	return (items.match(NUM_OF_ITEMS_PER_PAGE_REGEX) as string[]) || []
}

export function getPageIndex(pageIndex: number, pages: string[], paginationAction: string) {
	switch (paginationAction) {
		case "first": {
			pageIndex = 0
			break
		}
		case "previous": {
			pageIndex = Math.max(pageIndex - 1, 0)
			break
		}
		case "next": {
			pageIndex = Math.min(pageIndex + 1, pages.length - 1)
			break
		}
		case "last": {
			pageIndex = pages.length - 1
			break
		}
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
	await buttonInteraction.deferUpdate()
	const embed = new EmbedBuilder(message.embeds[0]?.toJSON())

	embed.setDescription(pages[pageIndex] as string)
	embed.setFooter({
		text: getFooter(pageIndex, pages, buttonInteraction.locale),
	})
	embed.setColor("Random")

	paginationControllerButtons = createPaginationButtons(pageIndex, pages)

	await buttonInteraction
		.editReply({ embeds: [embed], components: [paginationControllerButtons] })
		.catch((error) => logger.error(error))
}

export function getFooter(pageIndex: number, pages: string[], locale: string) {
	return i18next.t("pagination.footer", {
		currentPage: pageIndex + 1,
		numOfPages: pages.length,
		ns: "common",
		lng: locale,
	})
}
