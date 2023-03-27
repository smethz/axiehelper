import { AXIEINFINITY_CDN_URL } from "@constants/url"
import axios from "axios"
import { writeJSONSync } from "fs-extra"
import path from "path"
import logger from "pino-logger"

export function updateBodyParts() {
	axios
		.get<string>(
			`${AXIEINFINITY_CDN_URL}/marketplace-website/_next/static/chunks/modules_axie-detail_origin-cards_data_ts-6afd860707061214.js`
		)
		.then((response) => {
			const bodyParts = response.data.match(/(?<=c\=JSON\.parse\(\').*?(?='\),)/g)

			if (!bodyParts) throw new Error("RegExp Failed")

			const parsedBodyParts = bodyParts[0].replaceAll("\\", "")

			writeJSONSync(path.join(__dirname, `../../constants/props/body-parts.json`), JSON.parse(parsedBodyParts))
		})
		.catch((error) => logger.error(error, "Failed to update Body Parts"))
}
