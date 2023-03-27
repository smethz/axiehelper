import { updateBodyParts } from "@apis/getBodyParts"
import Client from "@client/index"
import { updateMinPriceJob } from "@jobs/updateMinPrice"
import { updateCardsList, updateCharmsList, updateRunesList } from "@utils/updateItemList"
import { ActivityType } from "discord.js"
import logger from "pino-logger"

export default async function (client: Client) {
	client.user?.setActivity(`docs.axiehelper.com`, {
		type: ActivityType.Watching,
	})

	await Promise.allSettled([updateBodyParts(), updateCardsList(), updateCharmsList(), updateRunesList()])
	await updateMinPriceJob.fireOnTick()

	globalThis.isClientReady = true

	logger.info("Client is now ready.")
}
