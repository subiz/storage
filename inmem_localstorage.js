// this file implements localstorage in memory
var localStorageMemory = {}
var cache = {}

localStorageMemory.length = 0

localStorageMemory.getItem = function (key) {
	if (key in cache) return cache[key]
	return null
}

localStorageMemory.setItem = function (key, value) {
	if (typeof value === 'undefined') localStorageMemory.removeItem(key)
	else cache[key] = '' + value
	localStorageMemory.length = Object.keys(cache).length
}

localStorageMemory.removeItem = function (key) {
	if (Object.prototype.hasOwnProperty.call(cache, key)) {
		delete cache[key]
		localStorageMemory.length = Object.keys(cache).length
	}
}

localStorageMemory.key = function (index) {
	return Object.keys(cache)[index] || null
}

localStorageMemory.clear = function () {
	cache = {}
	localStorageMemory.length = 0
}

export default localStorageMemory
