let memlocalStorage = require('./inmem_localstorage.js').default
let requestIdleCallback = window.requestIdleCallback || (cb => cb())

const LIMIT = 80

export default class {
	constructor (schema, inmem) {
		this.localStorage = memlocalStorage
		this.allkeys = {}
		if (!inmem) {
			try {
				window.localStorage.setItem('sbzstore1029', '?')
				window.localStorage.removeItem('sbzstore1029')
				this.localStorage = window.localStorage
			} catch (e) {}
		}

		this.schema = schema
	}

	// all loads all items inside the table, return [] if there is no item found
	all (table) {
		let items = []
		for (var i = 0; i < this.localStorage.length; i++) {
			let key = this.localStorage.key(i)
			if (!key.startsWith(this.schema + '#' + table + '#')) continue
			this.allkeys[key] = true
			items.push(JSON.parse(this.localStorage.getItem(key)))
		}
		return items
	}

	// removes deletes all items which match keys
	// keys must be an array
	removes (table, keys) {
		for (var i = 0; i < keys.length; i++) {
			delete this.allkeys[this.schema + '#' + table + '#' + keys[i]]
			this.localStorage.removeItem(this.schema + '#' + table + '#' + keys[i])
		}
	}

	// clear removes all item inside the table
	clear (table) {
		let matchkeys = []
		for (var i = 0; i < this.localStorage.length; i++) {
			let key = this.localStorage.key(i)
			if (!key.startsWith(this.schema + '#' + table + '#')) continue
			matchkeys.push(key)
		}

		for (var i = 0; i < matchkeys.length; i++) this.localStorage.removeItem(matchkeys[i])
		this.allkeys = {}
	}

	// put writes a (key,value) pair to the table
	// if the localstorage is already full, it would try to free by delete the whole table!
	put (table, key, value) {
		this.allkeys[this.schema + '#' + table + '#' + key] = true
		if (Object.keys(this.allkeys).length > LIMIT) this.clear(table)
		requestIdleCallback(() => {
			try {
				this.localStorage.setItem(this.schema + '#' + table + '#' + key, toString(value))
			} catch (e) {
				this.clear(table)
			}
		})
	}
}

function toString (obj) {
	if (obj === undefined) return 'null'
	return JSON.stringify(obj)
}
