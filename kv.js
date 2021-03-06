let KvMaxSize = 500
// A key-value database with a cache layer

// db: {all, removes, put, clear}
export default class {
	constructor (db, schema) {
		this.name = schema
		schema += '_kv'
		this.dead = false
		this.db = db
		this.cache = {}

		this.initialized = false
		this.init()
	}

	refreshCache () {
		if (this.dead) return
		let inmemItemM = {}
		let allitems = this.db.all('items')
		allitems.forEach(function (item) {
			inmemItemM[item.key] = item.value
		})
		this.cache = inmemItemM
	}

	init () {
		if (this.initialized) return
		let inmemItemM = {}

		let allitems = this.db.all('items')
		allitems.forEach(function (item) {
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
			this.db.removes('items', removekeys)
		}

		this.initialized = true
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
		if (!key) return []
 		if (this.dead) return []
		if (!this.initialized) throw new Error('uninitialized')

		if (typeof key === 'string') {
			this.cache[key] = value
			this.db.put('items', key, { key, value })
			return value
		}

		// if multiple key
		var objs = []
		let items = []
		if (!Array.isArray(key)) objs = [key]
		else objs = key

		var path = value || 'id'
		objs.forEach(obj => {
			let key = obj[path]
			this.cache[key] = obj
			items.push({ key: key, value: obj })
		})

		items.forEach(item => this.db.put('items', item.key, { key: item.key, value: item.value }))
		return objs
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
		this.initialized = false
	}
}
