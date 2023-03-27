import { CommandExecuteParams, SlashCommand } from "@custom-types/command"
import { cache } from "@services/cache"
import { PermissionFlagsBits, PermissionsBitField, SlashCommandBuilder } from "discord.js"

const command: SlashCommand = {
	config: new SlashCommandBuilder()
		.setName("cache")
		.setDescription("Manages the cache")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false)
		.addSubcommand((command) => command.setName("size").setDescription("Check cache size"))
		.addSubcommand((command) =>
			command
				.setName("keys")
				.setDescription("Check matching keys for the specified pattern. Returns the number of matches")
				.addStringOption((option) => option.setName("pattern").setDescription("The pattern to use").setRequired(true))
		)
		.addSubcommand((command) =>
			command
				.setName("delete")
				.setDescription("Delete cached items matching given pattern. Returns the number of matches")
				.addStringOption((option) => option.setName("pattern").setDescription("The pattern to use").setRequired(true))
		)
		.toJSON(),
	userPermissions: [PermissionsBitField.Flags.Administrator],
	botPermissions: [PermissionsBitField.Flags.ReadMessageHistory],
	ownerOnly: true,
	execute,
	category: "Owner",
}

async function execute({ interaction }: CommandExecuteParams): Promise<void> {
	await interaction.deferReply()

	const action = interaction.options.getSubcommand()

	switch (action) {
		case "size": {
			const cacheSize = await cache.dbsize()
			await interaction.editReply({ content: `${cacheSize} total items` })
			break
		}
		case "keys": {
			const pattern = interaction.options.getString("pattern", true)
			const keys = await cache.keys(pattern)

			await interaction.editReply({
				content: `${keys.length} keys found`,
			})
			break
		}
		case "delete": {
			const pattern = interaction.options.getString("pattern", true)

			const stream = cache.scanStream({
				match: pattern,
			})

			let i = 0

			stream.on("data", async (keys) => {
				// `keys` is an array of strings representing key names
				if (keys.length) {
					const pipeline = cache.pipeline()
					keys.forEach(async (key: string) => {
						pipeline.del(key)
						i++
					})
					await pipeline.exec()
				}
			})

			stream.on("end", function () {
				interaction.editReply({ content: `Deleted ${i} keys` })
			})

			break
		}
	}
}

export default command
