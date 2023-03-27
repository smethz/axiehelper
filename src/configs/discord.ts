import { Partials, GatewayIntentBits, Options, ClientOptions } from "discord.js"

const clientConfig: ClientOptions = {
	shards: "auto",
	makeCache: Options.cacheWithLimits({
		...Options.DefaultMakeCacheSettings,
		MessageManager: { maxSize: 200 },
	}),
	sweepers: {
		messages: {
			interval: 60,
			lifetime: 1200,
		},
	},
	partials: [Partials.User, Partials.GuildMember, Partials.Channel, Partials.Message, Partials.Reaction],
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.DirectMessages,
	],
	allowedMentions: { parse: ["roles", "users"] },
}

export default clientConfig
