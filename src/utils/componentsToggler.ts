import { ActionRowBuilder, MessageActionRowComponentBuilder } from "discord.js"

export function disableComponents(...actionRows: ActionRowBuilder<MessageActionRowComponentBuilder>[]) {
	actionRows.forEach((row) => row.components.forEach((component) => component.setDisabled(true)))
}

export function enableComponents(...actionRows: ActionRowBuilder<MessageActionRowComponentBuilder>[]) {
	actionRows.forEach((row) => row.components.forEach((components) => components.setDisabled(false)))
}
