import { getTokenPrice } from "@apis/getTokenPrice"
import { createErrorEmbed } from "@client/components/embeds"
import emojis from "@constants/props/emojis.json"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { currencyFormatter, numberFormatter } from "@utils/currencyFormatter"
import { getUser } from "@utils/dbFunctions"
import { ApplicationCommandOptionType, EmbedBuilder, PermissionsBitField } from "discord.js"

const command: SlashCommand = {
	config: {
		name: "eth",
		description: "Get the current price of Ethereum (ETH)",
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "currency",
				description: "Choose the currency to use. Leave empty for user's preferred currency",
				required: false,
				choices: [
					{
						name: "AUD $ - Australian Dollar",
						value: "AUD",
					},
					{
						name: "BRL R$ - Brazilian Real",
						value: "BRL",
					},
					{
						name: "CAD $ - Canadian Dollar",
						value: "CAD",
					},
					{
						name: "CZK $ - Czech Koruna",
						value: "CZK",
					},
					{
						name: "ETH Ξ - Ethereum",
						value: "ETH",
					},
					{
						name: "EUR € - Euro",
						value: "EUR",
					},
					{
						name: "IDR Rp - Indonesian Rupiah",
						value: "IDR",
					},
					{
						name: "INR ₹ - Indian Rupee",
						value: "INR",
					},
					{
						name: "JPY ¥ - Japanese Yen",
						value: "JPY",
					},
					{
						name: "KRW ₩ - South Korean won",
						value: "KRW",
					},
					{
						name: "PHP ₱ - Philippine Peso",
						value: "PHP",
					},
					{
						name: "MYR RM - Malaysian Ringgit",
						value: "MYR",
					},
					{
						name: "RUB ₽ - Russian Ruble",
						value: "MYR",
					},
					{
						name: "USD $ - United States Dollar",
						value: "USD",
					},
					{
						name: "VND ₫ - Đồng Việt Nam",
						value: "VND",
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Number,
				name: "amount",
				description: "Amount to be multiplied with. (Current Price of ETH × Amount)",
				required: false,
			},
		],
	},
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Crypto",
	execute,
}

async function execute({ interaction, translate }: CommandExecuteParams) {
	await interaction.deferReply()

	let preferredCurrency = interaction.options.getString("currency")

	let currencyTicker: string
	if (preferredCurrency) {
		currencyTicker = preferredCurrency
	} else {
		const userPreferredCurrency = await getUser(interaction.user.id)
		currencyTicker = userPreferredCurrency?.settings?.currency ? userPreferredCurrency.settings.currency : "USD"
	}

	const amountInput = interaction.options.getNumber("number")
	const amount = amountInput ? amountInput : null

	const eth = await getTokenPrice("eth", currencyTicker)

	if (!eth) {
		const requesFailedEmbed = createErrorEmbed({
			title: translate("errors.request_failed.title"),
			description: translate("errors.request_failed.description"),
		})

		await interaction.editReply({ embeds: [requesFailedEmbed] }).catch(() => {})
		return
	}

	const priceAmt = amount ? currencyFormatter(currencyTicker, amount, eth.price) : 1

	const priceEmbed = new EmbedBuilder()
		.addFields({
			name: `${emojis.tokens.ethereum} ETH`,
			value: `${eth.price} ${currencyTicker?.toUpperCase()}`,
			inline: true,
		})
		.addFields({
			name: translate("fields.24h_change"),
			value: eth.change,
			inline: true,
		})
		.addFields({ name: `\u200b`, value: `\u200b`, inline: true })
		.addFields({
			name: translate("fields.24h_high"),
			value: `${eth.high} ${currencyTicker?.toUpperCase()}`,
			inline: true,
		})
		.addFields({
			name: translate("fields.24h_low"),
			value: `${eth.low} ${currencyTicker?.toUpperCase()}`,
			inline: true,
		})
		.addFields({ name: `\u200b`, value: `\u200b`, inline: true })
		.setColor(`Random`)
		.setTimestamp()

	if (amount && !isNaN(amount) && amount !== 1) {
		priceEmbed.setTitle(`**${numberFormatter(amount)} ${emojis.tokens.ethereum}** = **${priceAmt}**`)
	}

	await interaction.editReply({ embeds: [priceEmbed] }).catch(() => {})
}

export default command
