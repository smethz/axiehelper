import { getLunacianNews } from "@apis/getLunacianNews"
import { createErrorEmbed } from "@client/components/embeds"
import { DEFAULT_IDLE_TIME } from "@constants/index"
import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import type { News } from "@custom-types/news"
import { componentFilter } from "@utils/componentFilter"
import { disableComponents } from "@utils/componentsToggler"
import dayjs from "dayjs"
import { ActionRowBuilder, ComponentType, EmbedBuilder, PermissionsBitField, StringSelectMenuBuilder } from "discord.js"

const command: SlashCommand = {
	config: {
		name: "news",
		description: "Shows the latest Lunacian News.",
	},
	userPermissions: [],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	guildOnly: false,
	ownerOnly: false,
	category: "Info",
	execute,
}

async function execute({ interaction, translate }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const latestLunacianNewsList = await getLunacianNews()

	if (!latestLunacianNewsList?.length) {
		const requestFailedEmbed = createErrorEmbed({
			title: translate("errors.request_failed.title"),
			description: translate("errors.request_failed.description"),
		})

		interaction.editReply({ embeds: [requestFailedEmbed] }).catch(() => {})
		return
	}

	let newsEmbed = createNewsEmbed(latestLunacianNewsList[0]!)

	const latestNewsOptions = latestLunacianNewsList.map((news, index) => {
		return {
			description: dayjs(news.post_date).format("llll"),
			label: news.title,
			value: index.toString(),
			default: index === 0,
		}
	})

	const newsSelectorMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder().setCustomId("news-selector").addOptions(latestNewsOptions)
	)

	const message = await interaction.editReply({
		embeds: [newsEmbed],
		components: [newsSelectorMenu],
	})

	const collector = message.createMessageComponentCollector<ComponentType.StringSelect>({
		filter: componentFilter(interaction),
		idle: DEFAULT_IDLE_TIME,
	})

	collector.on("collect", async (selectMenuInteraction) => {
		await selectMenuInteraction.deferUpdate()

		const newsToDisplayIndex = Number(selectMenuInteraction.values[0])

		newsSelectorMenu.components[0]?.options.filter((option) => option.data.default === true)[0]?.setDefault(false)
		newsSelectorMenu.components[0]?.options
			.filter((option) => option.data.value === selectMenuInteraction.values[0])[0]
			?.setDefault(true)

		newsEmbed = createNewsEmbed(latestLunacianNewsList[newsToDisplayIndex]!)

		await selectMenuInteraction.editReply({ embeds: [newsEmbed], components: [newsSelectorMenu] }).catch(() => {})
	})

	collector.on("end", async () => {
		disableComponents(newsSelectorMenu)
		await message.edit({ components: [newsSelectorMenu] }).catch(() => {})
	})
}

function createNewsEmbed(news: News): EmbedBuilder {
	return new EmbedBuilder()
		.setTitle(news.title)
		.setURL(news.canonical_url)
		.setDescription(news.truncated_body_text)
		.setImage(news.cover_image)
		.setTimestamp(news.post_date)
		.setColor("Random")
}

export default command
