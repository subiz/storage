const ChainMaxSize = 50
// NOTE:
// index must be number and index must be positive
//

class Chain {
	constructor (DB, schema, inmem) {
		this.schema = schema + '_chain'
		this.dead = false
		this.db = new DB(this.schema, inmem)
		this.anchorCache = {}
		this.cache = {} // note: cache must be continuously from start

		this.initialized = false
	}

	init () {
		if (this.initialized) return
		console.time('CHAIN' + this.schema)
		let inmemItemM = {}

		let allitems = this.db.all('items')
		allitems.map(item => {
			inmemItemM[item.chain] = inmemItemM[item.chain] || {}
			inmemItemM[item.chain][item.id] = {
				id: item.id,
				chain: item.chain,
				full_id: item.full_id,
				index: item.index,
				value: item.value,
			}
		})

		map(inmemItemM, (itemM, chain) => {
			if (size(itemM) < ChainMaxSize) return
			let items = orderBy(map(itemM), ['index'], 'desc')
			let removekeys = []
			for (var i = ChainMaxSize; i < items.length; i++) {
				removekeys.push(items[i].full_id)
				delete itemM[items[i].id]
			}
			this.db.removes('items', removekeys)
			inmemItemM[chain] = itemM
		})

		this.cache = inmemItemM
		this.initialized = true
		console.timeEnd('CHAIN' + this.schema)
	}

	destroy () {
		// clear all data
		this.db.clear('items')

		this.dead = true
		this.cache = {}
		this.anchorCache = {}
		this.db = undefined
		this.initialized = false
	}

	// item: {id, index, value}
	// note: should only call update when db is synced
	put (chain, id, node_index, value) {
		if (this.dead) return

		let inmemItemM = this.cache[chain] || {}
		let bottom = minIndex(inmemItemM) || {}
		let bottomIndex = bottom.index || 'z'

		let item = { id, index: node_index, value, chain, full_id: chain + ':' + id }
		delete inmemItemM[item.id]

		if (bottomIndex > item.index + '') return
		inmemItemM[item.id] = item

		this.cache[chain] = inmemItemM
		this.db.put('items', item.full_id, item)
	}

	listM (chain) {
		if (this.dead) return {}
		let inmemItemM = this.cache[chain] || {}
		let out = {}
		map(inmemItemM, (item, id) => {
			out[id] = item.value
		})
		return out
	}

	async fetchMore (chain, limit = 20, api) {
		if (this.dead) return { error: 'dead' }
		if (!api) return { error: 'no api' }

		let anchor = this.anchorCache[chain] || ''

		var [apiItems, newanchor, error] = await api(chain, anchor, limit)

		if (error) return { error }
		if (this.dead) return { error: 'dead' }

		let inmemItemM = this.cache[chain] || {}

		if (apiItems.length === 0) return { end: true }

		apiItems.each(item => {
			item.chain = chain
			item.full_id = chain + ':' + item.id
			inmemItemM[item.id] = item
			this.db.put('items', item.full_id, item)
		})

		// save items fetch from api to the db
		this.anchorCache[chain] = newanchor
		this.cache[chain] = inmemItemM
		return {}
	}

	del (chain, id) {
		if (this.dead) return
		let inmemItemM = this.cache[chain] || {}
		let full_id = chain + ':' + id

		delete inmemItemM[id]
		this.db.removes('items', [full_id])
	}

	match (chain, id) {
		return this.listM(chain)[id]
	}

	async reload (chain, api) {
		if (this.dead) return

		let top = maxIndex(this.listM(chain)) || {}
		let topindex = top.index
		if (!topindex) topindex = Date.now()
		var lastanchor = ''
		var fetchedItems = {}
		for (;;) {
			if (this.dead) return
			let [newItems, newanchor, error] = await api(chain, lastanchor, 50)
			if (error) return
			if (this.dead) return
			newItems.map(item => {
				fetchedItems[item.id] = Object.assign({}, item, { chain, full_id: chain + ':' + item.id })
			})
			if (newItems.length === 0 || newanchor === lastanchor) break // out of item

			// still cannot join
			if (fetchedItems.length() >= 200) {
				// fetch too much but still cannot merge with old data
				// clear old data and write new data

				let inmemItemM = this.cache[chain] || {}
				let removeids = []
				map(inmemItemM, item => {
					if (item.chain !== chain) return
					removeids.push(item.full_id)
				})
				this.db.removes('items', removeids)
				this.cache[chain] = {}
				break
			}

			// try to join old data
			if (lo.get(minIndex(fetchedItems), 'index') <= topindex) {
				// successfully joined, reuse anchor

				lastanchor = this.anchorCache[chain] || newanchor
				break
			}
			lastanchor = newanchor
		}

		fetchedItems.map(item => {
			this.db.put('items', item.full_id, item)
			this.cache = this.cache || {}
			this.cache[item.id] = item
		})
		this.anchorCache[chain] = lastanchor
	}
}

function minIndex (obj) {
	if (!obj) return
	let keys = Object.keys(obj)
	if (!keys.length) return
	let min = Infinity
	let minKey = Object.keys(obj)[0]
	for (var i = 0; i < keys.length; i++) {
		let index = (obj[keys[i]] && obj[keys[i]].index) || -Infinity
		if (index < min) {
			min = index
			minKey = keys[i]
		}
	}

	return obj[keys[minKey]]
}

function maxIndex (obj) {
	if (!obj) return
	let keys = Object.keys(obj)
	if (!keys.length) return
	let max = -Infinity
	let maxKey = Object.keys(obj)[0]
	for (var i = 0; i < keys.length; i++) {
		let index = (obj[keys[i]] && obj[keys[i]].index) || -Infinity
		if (index > max) {
			max = index
			maxKey = keys[i]
		}
	}

	return obj[keys[maxKey]]
}

function map (collection, predicate) {
	if (!collection) return []
	if (!predicate) return collection

	var out = []
	if (Array.isArray(collection)) {
		for (let i = 0; i < collection.length; i++) {
			out.push(predicate(collection[i], i))
		}
		return out
	}

	if (typeof collection === 'object') {
		var keys = Object.keys(collection)
		for (let i = 0; i < keys.length; i++) {
			var k = keys[i]
			out.push(predicate(collection[k], k))
		}
		return out
	}

	return out
}

function size (o) {
	if (!o) return 0
	if (o.length !== undefined) return o.length
	return Object.keys(o).length
}

function orderBy (a, k, d) {
	var clone = []
	map(a, v => clone.push(v))
	clone.sort((i, j) => {
		if (i[k] === j[k]) return 0
		var r = i[k] < j[k] ? -1 : 1
		return d === 'desc' ? -r : r
	})
	return clone
}

module.exports = Chain
