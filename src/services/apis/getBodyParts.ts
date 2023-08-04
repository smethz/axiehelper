import { AXIEINFINITY_CDN_URL } from "@constants/url"
import { Part } from "@custom-types/parts"
import { getCardsList } from "@utils/getItemList"
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

			let parsedBodyParts: Part[] = Object.values(JSON.parse(bodyParts[0].replaceAll("\\", "")))

			const cardsList = getCardsList()

			parsedBodyParts = parsedBodyParts.map((part) => {
				const originCard = cardsList.find((card) => {
					const cardId = `${card.partClass}-${card.partType}-${card.partValue
						.toString()
						.padStart(2, "0")}`.toLowerCase()
					return part.ability_id === cardId
				})

				part.originCard = originCard!
				return part
			})

			writeJSONSync(path.join(__dirname, `../../constants/props/body-parts.json`), parsedBodyParts)
		})
		.catch((error) => logger.error(error, "Failed to update Body Parts"))
}
