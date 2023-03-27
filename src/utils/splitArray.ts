export function splitArray<T>(arr: T[], size: number): T[][] {
	const result: T[][] = []
	let n = 0
	while (n < arr.length) result.push(arr.slice(n, (n += size)))
	return result
}
