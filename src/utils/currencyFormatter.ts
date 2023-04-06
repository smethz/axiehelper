import currencies from "@constants/props/currencies.json"

export interface Currency {
	key: string
	name: string
	locale: string
	minimumFractionDigits?: number
	maximumFractionDigits?: number
	value: string
	prefix: string
	suffix: string
	price: number
	style: number
}

export function toGWei(wei: number) {
	return Math.round(wei / 1_000_000_000)
}

export function toAverage(from: number, to: number) {
	return to != null ? (from * 1 + to * 1) / 2 : from
}

export function currencyFormatter(ticker: string, amount: number, price: number) {
	ticker = ticker.toUpperCase()

	if (ticker == "ETH") {
		if (amount < 20) return (amount * price).toFixed(6) + " ETH"
		return (amount * price).toFixed(4) + " ETH"
	} else {
		let currency: Currency = currencies[ticker as keyof typeof currencies]

		switch (true) {
			case currency.locale !== "": {
				return new Intl.NumberFormat(currency.locale, {
					style: "currency",
					currency: currency.key,
					minimumFractionDigits: currency.minimumFractionDigits,
					maximumFractionDigits: currency.maximumFractionDigits,
				}).format(amount * price)
			}
			case currency.style === 1: {
				const value = (amount * price).toFixed(0)

				return currency.prefix + value + currency.suffix
			}
			case currency.style === 2: {
				const value = ((amount * price) / 1000).toFixed(0)

				return currency.prefix + value + "k" + currency.suffix
			}
			default: {
				const value = Math.round(amount * price)

				return currency.prefix + value + currency.suffix
			}
		}
	}
}

export function numberFormatter(number: number | undefined, locale: string = "en-US") {
	if (!number) return number
	return new Intl.NumberFormat(locale).format(number)
}
