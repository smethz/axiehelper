import { utils } from "ethers"

export function parseBalance(balance: string, decimals: number, locale: string = "en-US") {
	balance = utils.formatUnits(balance, decimals)
	return parseFloat(balance).toLocaleString(locale)
}
