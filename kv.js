let KvMaxSize = 500
// A key-value database with a cache layer
export default class {
	constructor (DB, schema) {
		this.name = schema
		schema += '_kv'
		this.dead = false
		this.db = new DB(schema)
		this.cache = {}

		this.initialized = false
	}

	refreshCache () {
		if (this.dead) return
		let inmemItemM = {}
		let allitems = this.db.all('items')
		allitems.forEach(function(item) {
			inmemItemM[item.key] = item.value
		})
		this.cache = inmemItemM
	}

	init () {
		if (this.initialized) return
		let inmemItemM = {}

		console.time('KV' + this.name)
		let allitems = this.db.all('items')
		allitems.forEach(function(item) {
			inmemItemM[item.key] = item.value
		})
		this.cache = inmemItemM

		// If the cache is full. Randomly remove half of the cache. credit to thanos
		// this is so simple since we don't need to keep track of last modified time
		// for each key. Implementing a LRU cache won't add much value.
		let allkeys = Object.keys(this.cache)
		if (allkeys.length > KvMaxSize) {
			let liveChance = KvMaxSize / 2 / allkeys.lenth

			let removekeys = []
			for (var i = 0; i < KvMaxSize; i++) {
				let live = Math.random() <= liveChance
				if (live) continue

				let key = allkeys[i]
				delete this.cache[key]
				removekeys.push(key)
			}

			this.db.removes('items', [removekeys])

		}

		this.initialized = true
		console.timeEnd('KV' + this.name)
	}

	all () {
		if (this.dead) return []
		if (!this.initialized) return []
		return this.cache
	}

	match (key) {
		if (this.dead || !this.initialized) return
		if (!key) return
		return this.cache[key]
	}

	// keys could be a string or array
	// put('1', {id: '1', name: 'thanh'})
	// put({id: '1', name: 'thanh'}, 'id')
	// put([{id: '1', name: 'thanh'},{id: '2', name: 'van'}], 'id')
	put (key, value) {
		if (!key) return
		if (this.dead) return []
		if (!this.initialized) throw new Error('uninitialized')
		// if multiple key
		this.cache[key] = value
		this.db.put('items', key, { key, value })
	}

	// delete an record in a schema
	del (key) {
		if (this.dead) return
		if (!this.initialized) throw new Error('uninitialized')
		delete this.cache[key]
		this.db.removes('items', [key])
	}

	destroy () {
		// clear all data
		this.db.clear('items')

		this.dead = true
		this.db = undefined
		this.cache = undefined
	}
}
