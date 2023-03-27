/**
 * Sort the given Array of objects to ascending or descending order
 * @param {String} sortDirection ascending, descending
 * @param {String} sortKey key of the object to sort
 * @param {Array} list the array to sort
 * @returns {Array} the sorted array
 */
export function sortList<T extends Record<string, any>>(
	list: Array<T>,
	sortKey: string,
	sortDirection: "ascending" | "descending"
): Array<T> {
	return list.sort((a, b) => {
		const nestedSortKey = sortKey.split(".")

		let aValue = a
		let bValue = b

		for (const key of nestedSortKey) {
			aValue = aValue[key]
			bValue = bValue[key]
		}

		if (aValue == undefined && bValue == undefined) return 0
		if (aValue == undefined) return 1
		if (bValue == undefined) return -1

		if (sortDirection === "descending") {
			;[aValue, bValue] = [bValue, aValue]
		}

		if (aValue < bValue) return -1
		if (aValue > bValue) return 1
		return 0
	})
}
