import axieClassProps from "@constants/props/axie-class-props.json"
import {
	ActionRow,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	MessageActionRowComponent,
} from "discord.js"

import { getAxieFromChain } from "@apis/chain/getAxie"
import { createErrorEmbed } from "@client/components/embeds"
import { MARKETPLACE_URL } from "@constants/url"
import { CommandExecuteParams, SlashCommand, TranslateFunction } from "@custom-types/command"
import { componentFilter } from "@utils/componentFilter"
import { parseAxieGenes } from "@utils/parsers"
import { Part } from "agp-npm/dist/models/part"
import { ApplicationCommandOptionType, PermissionsBitField } from "discord.js"

const command: SlashCommand = {
	config: {
		name: "guess",
		description: "Guess the answer for the question asked",
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "mode",
				description: "Select the mode of questions",
				required: false,
				choices: [
					{
						name: `guess the class of the asked part`,
						value: "guessClass",
					},
					{
						name: `guess the number of parts that have the same class`,
						value: "guessPart",
					},
				],
			},
		],
	},
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Fun",
	execute,
}

async function execute({ interaction, translate }: CommandExecuteParams) {
	await interaction.deferReply()

	const mode = interaction.options.getString("mode") ?? pickRandomGameMode()

	const currentMode = modes[mode as keyof typeof modes]
	const randomAxie = await getRandomAxie()

	if (!randomAxie) {
		const noAxieEmbed = createErrorEmbed({
			title: translate("errors.request_failed.title"),
			description: translate("errors.request_failed.description"),
		})

		await interaction.editReply({ embeds: [noAxieEmbed] }).catch(() => {})
		return
	}

	const { axieId, axie } = randomAxie

	const axieName = `Axie #${axieId}`

	const randomAxiePart = axie.traits[Math.floor(Math.random() * axie.traits.length)]!
	const correctAnswer = currentMode.getAnswer(randomAxiePart, axie.traits)

	const answerDescription = `**Answer:** ${currentMode.formatAnswer(
		randomAxiePart,
		correctAnswer
	)}\n**Axie:** [${axieName}](${MARKETPLACE_URL}/axie/${axieId})`

	const guessEmbed = new EmbedBuilder()
		.setTitle(currentMode.getQuestion(randomAxiePart, translate))
		.setImage(`https://axiecdn.axieinfinity.com/axies/${axieId}/axie/axie-full-transparent.png`)
		.setColor("Aqua")

	const buttonActionRows = generateButtons(currentMode.buttons)

	const message = await interaction.editReply({
		embeds: [guessEmbed],
		components: buttonActionRows,
	})

	const collector = message.createMessageComponentCollector<ComponentType.Button>({
		filter: componentFilter(interaction),
		max: 1,
		time: currentMode.idleTimeout,
	})

	collector.on("end", async (collected, reason) => {
		const disableAllComponents = (components: ButtonBuilder[]) =>
			components.forEach((component) => {
				component.setDisabled(true)
				component.setStyle(ButtonStyle.Secondary)
			})

		buttonActionRows.forEach((row) => disableAllComponents(row.components))

		setStyleCorrectButton(message.components, correctAnswer, buttonActionRows)

		if (reason === "time") {
			// TIMEOUT
			guessEmbed.setDescription(`**${translate("timedOut")}**\n${answerDescription}`)
			guessEmbed.setColor("Red")

			message.edit({ embeds: [guessEmbed], components: buttonActionRows }).catch(() => {})
			return
		}

		const buttonInteraction = collected.first()!
		await buttonInteraction.deferUpdate()

		if (buttonInteraction.customId === correctAnswer) {
			// WIN
			guessEmbed.setDescription(`**${translate("correctAnswer")}**\n${answerDescription}`)
			guessEmbed.setColor("Green")
		} else {
			// LOSE
			guessEmbed.setDescription(`**${translate("wrongAnswer")}**\n${answerDescription}`)
			guessEmbed.setColor("Red")
			setStyleWrongButton(message.components, buttonInteraction.customId, buttonActionRows)
		}

		buttonInteraction.editReply({ embeds: [guessEmbed], components: buttonActionRows }).catch(() => {})
	})
}

export default command

interface Button {
	id: string
	label: string
	emoji: string
}

const modes = {
	guessClass: {
		getQuestion: (part: Part, translate: TranslateFunction) =>
			translate("question.class", { partClass: part.d.type.toUpperCase() }),
		getAnswer: (part: Part) => part.d.cls.toLowerCase(),
		formatAnswer: (part: Part, answer: string) => `${axieClassProps[part.d.cls].emoji} ${answer.toUpperCase()}`,
		idleTimeout: 1000 * 15, // 15s
		buttons: [
			{ id: "plant", label: "Plant", emoji: axieClassProps.plant.emoji },
			{ id: "aquatic", label: "Aquatic", emoji: axieClassProps.aquatic.emoji },
			{ id: "beast", label: "Beast", emoji: axieClassProps.beast.emoji },
			{ id: "reptile", label: "Reptile", emoji: axieClassProps.reptile.emoji },
			{ id: "bird", label: "Bird", emoji: axieClassProps.bird.emoji },
			{ id: "bug", label: "Bug", emoji: axieClassProps.bug.emoji },
		],
	},

	guessPart: {
		getQuestion: (part: Part, translate: TranslateFunction) =>
			translate("question.part", { partClass: part.d.cls.toUpperCase() }),
		getAnswer: (randomPart: Part, parts: Part[]) =>
			parts.filter((part) => part.d.cls == randomPart.d.cls).length.toString(),
		formatAnswer: (part: Part, answer: string) => `${answer.toUpperCase()} ${axieClassProps[part.d.cls].emoji} `,
		idleTimeout: 1000 * 30, // 30s
		buttons: [
			{ id: "1", label: "One", emoji: "1️⃣" },
			{ id: "2", label: "Two", emoji: "2️⃣" },
			{ id: "3", label: "Three", emoji: "3️⃣" },
			{ id: "4", label: "Four", emoji: "4️⃣" },
			{ id: "5", label: "Five", emoji: "5️⃣" },
			{ id: "6", label: "Six", emoji: "6️⃣" },
		],
	},
}

function pickRandomGameMode() {
	const gamemodes = Object.keys(modes)

	return gamemodes[Math.floor(Math.random() * gamemodes.length)]
}

function getRandomAxieID() {
	let min = Math.ceil(5)
	let max = Math.floor(11_000_000)

	return Math.floor(Math.random() * (max - min) + min) // The maximum is exclusive and the minimum is inclusive
}

async function getRandomAxie() {
	// Get Genes from Chain
	let axieId = 1
	let axie = await getAxieFromChain(axieId)
	let currentRetry = 0
	const maxRetries = 5

	while (!axie) {
		if (currentRetry == maxRetries) return
		axieId = getRandomAxieID()
		axie = await getAxieFromChain(axieId)
		if (axie) break
		setTimeout(() => currentRetry++, 2000)
	}

	// Parse Genes
	return { axieId, axie: parseAxieGenes(axie.genes_512) }
}

function generateButtons(buttonsData: Button[]) {
	const buttons = buttonsData.map((button) => {
		return new ButtonBuilder()
			.setCustomId(button.id)
			.setLabel(button.label)
			.setEmoji(button.emoji)
			.setStyle(ButtonStyle.Primary)
	})

	const buttonsRow1 = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(0, 3))

	const buttonsRow2 = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(3))

	return [buttonsRow1, buttonsRow2]
}

function setStyleCorrectButton(
	msgComponents: ActionRow<MessageActionRowComponent>[],
	correctAnswer: string,
	buttonActionRows: ActionRowBuilder<ButtonBuilder>[]
) {
	const correctRow = msgComponents.find((row) =>
		row.components.find((component) => component.customId === correctAnswer)
	)!

	const correctRowIndex = msgComponents.findIndex((row) =>
		row.components.find((component) => component.customId === correctAnswer)
	)

	const correctButtonIndex = correctRow.components.findIndex((component) => component.customId == correctAnswer)!

	buttonActionRows[correctRowIndex]?.components[correctButtonIndex]?.setStyle(ButtonStyle.Success)

	return buttonActionRows
}

function setStyleWrongButton(
	msgComponents: ActionRow<MessageActionRowComponent>[],
	wrongAnswer: string,
	buttonActionRows: ActionRowBuilder<ButtonBuilder>[]
) {
	const wrongRow = msgComponents.find((row) => row.components.find((component) => component.customId === wrongAnswer))!

	const wrongRowIndex = msgComponents.findIndex((row) =>
		row.components.find((component) => component.customId === wrongAnswer)
	)

	const wrongButtonIndex = wrongRow.components.findIndex((component) => component.customId == wrongAnswer)!

	buttonActionRows[wrongRowIndex]?.components[wrongButtonIndex]?.setStyle(ButtonStyle.Danger)
}
