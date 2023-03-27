import { createErrorEmbed } from "@client/components/embeds"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import { Card } from "@custom-types/card"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { createCardCanvas } from "@utils/canvas"
import { getCardsList } from "@utils/getItemList"
import { AttachmentBuilder, Collection, EmbedBuilder, PermissionsBitField, Snowflake } from "discord.js"

const command: SlashCommand = {
	config: {
		name: "hangman",
		description: "Starts a new hangman game",
	},
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: true,
	ownerOnly: false,
	category: "Fun",
	execute,
}

async function execute({ interaction, translate, client }: CommandExecuteParams) {
	await interaction.deferReply()

	if (client.hangmanChannels.has(interaction.channelId)) {
		const gameExistingEmbed = createErrorEmbed({
			title: translate("game.ongoing.title"),
			description: translate("game.ongoing.description"),
		})

		await interaction
			.editReply({
				embeds: [gameExistingEmbed],
			})
			.catch(() => {})

		return
	}

	// Start a new game
	client.hangmanChannels.set(interaction.channelId, "IN_GAME")
	const hangmanGame = new Hangman()

	console.log("ANSWER:", hangmanGame.phraseToGuess)

	let hiddenWord = hangmanGame.generateHiddenWord()

	const gameStartedEmbed = new EmbedBuilder()
		.setTitle(translate("game.start.title"))
		.setDescription(`${translate("game.start.description")}\n\`${hiddenWord}\`` + `\n` + hangmanGame.stages[0])
		.setColor("Blurple")

	await interaction.editReply({ embeds: [gameStartedEmbed] }).catch(() => {})

	const collector = interaction.channel?.createMessageCollector({
		filter: async (message) => {
			if (message.author.bot) return false

			const messageContent = message.content.toUpperCase()

			if (/^[A-Z]$/.test(messageContent) || messageContent === hangmanGame.phraseToGuess) {
				if (!hangmanGame.guessCooldowns.has(message.author.id)) return true

				const now = Date.now()
				const expirationTime = hangmanGame.guessCooldowns.get(message.author.id)! + 3000

				if (now < expirationTime) {
					const timeLeft = (expirationTime - now) / 1000

					await message.channel
						.send(
							translate("cooldown", {
								username: message.member?.toString(),
								timeLeft: timeLeft.toFixed(1),
							})
						)
						.then((msg) => setTimeout(() => msg.delete(), expirationTime - now + 1000))
					return false
				}
			}

			return false
		},
		idle: DEFAULT_IDLE_TIME - 5,
		dispose: true,
	})

	collector?.on("collect", async (messageCollected) => {
		const messageContent = messageCollected.content.toUpperCase()

		// Guessed Full Card Name - End Game with Winner
		if (messageContent === hangmanGame.phraseToGuess) {
			hangmanGame.winner = messageCollected.author.toString()
			collector.stop()
			return
		}

		if (hangmanGame.guesses.indexOf(messageContent) !== -1) return

		// Add Letter in Guesses - [] => ['A',]
		hangmanGame.guesses.push(messageContent)
		hiddenWord = hangmanGame.generateHiddenWord()

		if (hangmanGame.phraseToGuess.indexOf(messageContent) === -1) {
			// Wrong Letter Guessed
			++hangmanGame.stage

			const gameProgressDescription = `\`${hiddenWord}\`` + `\n` + hangmanGame.stages[hangmanGame.stage]

			// Game Over - No Lives Left
			if (hangmanGame.stage >= hangmanGame.maxStage) {
				const gameProgressEmbed = new EmbedBuilder()
					.setTitle(translate("game.over.title"))
					.setDescription(
						`${translate("game.over.description", {
							guessedLetter: messageContent,
						})}\n\n${gameProgressDescription}`
					)
					.setColor(`Red`)
					.setFooter({ text: `${hangmanGame.guesses.join(", ")}` })
				await messageCollected.channel.send({ embeds: [gameProgressEmbed] })
				collector.stop()
			} else {
				// Add Cooldown Penalty
				hangmanGame.guessCooldowns.set(messageCollected.author.id, Date.now())
				setTimeout(() => hangmanGame.guessCooldowns.delete(messageCollected.author.id), 3000 /* 3s */)

				const gameProgressEmbed = new EmbedBuilder()
					.setAuthor({
						name: translate("wrongGuess", { guessedLetter: messageContent }),
					})
					.setDescription(
						`${translate("cooldown", {
							username: messageCollected.author.toString(),
							timeLeft: 3,
						})}\n\n${gameProgressDescription}`
					)
					.setColor(`Red`)
					.setFooter({ text: `${hangmanGame.guesses.join(", ")}` })

				await messageCollected.channel.send({ embeds: [gameProgressEmbed] })
			}
		} else {
			// Correct Letter Guessed

			const gameProgressDescription = `\`${hiddenWord}\`` + `\n` + hangmanGame.stages[hangmanGame.stage]
			const gameProgressEmbed = new EmbedBuilder()
				.setDescription(
					`${translate("correctGuess", {
						username: messageCollected.author.toString(),
						guessedLetter: messageContent,
					})}\n\n${gameProgressDescription}`
				)
				.setColor("Green")
				.setFooter({ text: hangmanGame.guesses.join(", ") })

			await messageCollected.channel.send({ embeds: [gameProgressEmbed] })

			// Game Over - Word has been guessed
			if (!hiddenWord.includes("_")) {
				hangmanGame.winner = messageCollected.author.toString()
				collector.stop()
				return
			}
		}
	})

	// Game Ended
	collector?.on("end", async () => {
		const winner = hangmanGame.winner
		hangmanGame.guessCooldowns.clear()

		const cardCanvas = await createCardCanvas(hangmanGame.cardToGuess)
		const fileAttachment = new AttachmentBuilder(cardCanvas, {
			name: "card.png",
		})

		const gameEndDescription =
			`${translate("game.end.winner", { context: winner ? "user" : "none", username: winner })}\n` +
			`${translate("answer", { cardName: hangmanGame.cardToGuess.name })}`

		const gameOverEmbed = new EmbedBuilder()
			.setTitle(translate("game.end.title"))
			.setDescription(gameEndDescription)
			.setImage(`attachment://card.png`)
			.setColor(winner ? "Green" : "Red")

		client.hangmanChannels.delete(interaction.channelId)
		await interaction.channel?.send({
			embeds: [gameOverEmbed],
			files: [fileAttachment],
		})
	})
}

export default command

class Hangman {
	public stage: number = 0
	public guesses: string[] = []
	public _winner: string | null = null
	public cardToGuess: Card = this.getRandomCard()
	public phraseToGuess: string = this.cardToGuess.name.toUpperCase()

	public set winner(playerId: string | null) {
		this._winner = playerId
	}

	public get winner(): string | null {
		return this._winner
	}

	guessCooldowns = new Collection<Snowflake, number>()

	validLetterRegex = /[A-Z]/g

	stages = [
		`\`\`\`
/---|
|       ❤️❤️❤️❤️❤️❤️
|
|
|_______
\`\`\``,
		`\`\`\`
/---|
|  😲  ❤️❤️❤️❤️❤️🖤
|
|
|_______
\`\`\``,
		`\`\`\`
/---|
|  😲  ❤️❤️❤️❤️🖤🖤
|   |
| 
|_______
\`\`\``,
		`\`\`\`
/---|
|  😟 ❤️❤️❤️🖤🖤🖤
|  /|
|
|_______
\`\`\``,
		`\`\`\`
/---|
|  😡  ❤️❤️🖤🖤🖤🖤
|  /|\\
|
|_______
\`\`\``,
		`\`\`\`
/---|
|  😢 ❤️🖤🖤🖤🖤🖤
|  /|\\
|  /
|_______
\`\`\``,
		`\`\`\`
/---|
|  😵 🖤🖤🖤🖤🖤🖤
|  /|\\
|  / \\
|_______
\`\`\``,
	]

	maxStage = this.stages.length - 1

	private getRandomCard() {
		const cardsList = getCardsList()
		const randomCard = cardsList[Math.floor(Math.random() * cardsList.length)]!

		return randomCard
	}

	public generateHiddenWord(): string {
		return [...this.phraseToGuess]
			.map((letter) => {
				if (this.guesses.indexOf(letter) !== -1) return letter
				if (letter.match(this.validLetterRegex)) return "_"
				return letter
			})
			.join("  ")
	}
}
