export interface FilterCriteria {
	[key: string]: any
}

interface DataItem {
	[key: string]: any
}

/**
 * Filters an array of objects based on multiple criteria.
 * @param {Object[]} data - The array of objects to filter.
 * @param {Object} filters - An object containing the filter criteria.
 * @returns {Object[]} An array of objects that match all filter criteria.
 */
export function deepFilter<T extends DataItem>(data: T[], filters: FilterCriteria): T[] {
	return data.filter((item) => Object.entries(filters).every(([key, values]) => checkValue(item, key, values)))
}

/**
 * Checks if the value of a nested property of an object matches any of the possible values.
 * @param {Object} item - The object to check.
 * @param {string} key - The key path of the nested property to check (using dot notation).
 * @param {Array} values - An array of possible values for the property.
 * @returns {boolean} True if the value matches any of the possible values, false otherwise.
 */
function checkValue<T extends DataItem>(item: T, key: string, values: string[] | FilterCriteria): boolean {
	const parts = key.split(".")
	let value = item

	for (const part of parts) {
		value = value[part]

		if (value === undefined || value === null) {
			return false
		}
	}

	// If the value is a nested filter criteria object, recursively call filterData with the value as the filters argument.
	if (typeof values === "object" && values !== null && !Array.isArray(values)) {
		return deepFilter([item], values).length > 0
	} else if (Array.isArray(value)) {
		// If the value is an array, check if any of its elements match any of the possible values.
		return value.some((v) => values.includes(v))
	} else if (typeof values === "boolean") {
		if (values && value) return true
		return false
	} else {
		// If the value is not an array, check if it matches any of the possible values.
		return values.includes(value)
	}
}
