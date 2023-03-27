export function trimStringInMiddle(
	string: string,
	truncateString: string = "...",
	frontLength: number = 10,
	backLength: number = 6
): string {
	let strLen = string.length
	frontLength = ~~frontLength
	backLength = ~~backLength

	if (
		(frontLength === 0 && backLength === 0) ||
		frontLength >= strLen ||
		backLength >= strLen ||
		frontLength + backLength >= strLen
	) {
		return string
	} else if (backLength === 0) {
		return string.slice(0, frontLength) + truncateString
	} else {
		return string.slice(0, frontLength) + truncateString + string.slice(strLen - backLength)
	}
}

export function trimStringInBack(string: string, length: number, trimStr: string = "..."): string {
	return string.length > length ? string.substring(0, length) + trimStr : string
}
