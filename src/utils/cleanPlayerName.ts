export function cleanPlayerName(name: string) {
	// Remove new lines in player's name
	name = name.replaceAll(/\r?\n|\r/g, "").trim()

	// Remove color tag in player's name
	name = name.replaceAll(/(<#.{3,6}>)|(<color=#.{3,6}>)/g, "")

	return name
}
