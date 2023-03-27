import { getMinTokenPrice } from "@apis/marketplace-api/getMinTokenPrice"
import { CronJob } from "cron"

export const updateMinPriceJob = new CronJob({
	cronTime: "0 */15 * * * *",
	onTick: updatePrice,
	start: true, // invoke the job on start
})

async function updatePrice() {
	const prices = await getMinTokenPrice()
	if (prices) globalThis.tokensPrice = prices
}
