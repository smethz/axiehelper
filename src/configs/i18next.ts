import { LOCALES_PATH } from "@constants/index"
import { readdirSync } from "fs"
import type { InitOptions } from "i18next"

const namespaces = () => {
	const files = readdirSync(`${LOCALES_PATH}/en-US`).filter((file) => file.endsWith(".json"))
	return files.map((file) => file.split(".")[0]) as string[]
}

const i18nextConfig: InitOptions = {
	ns: namespaces(),
	defaultNS: "common",
	backend: {
		loadPath: `${LOCALES_PATH}/{{lng}}/{{ns}}.json`,
	},
	cleanCode: true,
	preload: ["en-US"],
	supportedLngs: ["en-US"],
	fallbackLng: {
		default: ["en-US"],
	},
}

export default i18nextConfig
