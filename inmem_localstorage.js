// this file implements localstorage in membory
var localStorageMemory = {}
var cache = {}

localStorageMemory.length = 0

localStorageMemory.getItem = function (key) {
	if (key in cache) return cache[key]
	return null
}

localStorageMemory.setItem = function (key, value) {
	if (typeof value === 'undefined') {
		localStorageMemory.removeItem(key)
	} else {
		if (!Object.prototype.hasOwnProperty.call(cache, key)) {
			localStorageMemory.length++
		}

		cache[key] = '' + value
	}
}

localStorageMemory.removeItem = function (key) {
	if (Object.prototype.hasOwnProperty.call(cache, key)) {
		delete cache[key]
		localStorageMemory.length--
	}
}

localStorageMemory.key = function (index) {
	return Object.keys(cache)[index] || null
}

localStorageMemory.clear = function () {
	cache = {}
	localStorageMemory.length = 0
}

module.exports = localStorageMemory
