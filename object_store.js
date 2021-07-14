const flow = require('@subiz/flow')
import KV from './kv.js'

// parent {api, realtime, insync, pubsub}
// like kv store, but support match and pubsub
export default function NewObjectStore (db_prefix, realtime, pubsub, name, matcher, topics) {
	let kv = new KV(db_prefix + name)
	kv.init()

	// expires time in ms
	// must re-fetch data if expires
	let expires = {}

	let isExpired = key => (expires[key] || 0) < Date.now()

	var me = {}
	me.put = async (key, value) => {
		let ret = kv.put(key, value)
		if (!Array.isArray(ret)) ret = [ret]
		let itemM = {}
		ret.forEach(item => {
			if (item && item.id) itemM[item.id] = item
		})
		if (Object.keys(itemM).length === 0) return
		pubsub.publish(name, itemM)
	}

	me.has = key => {
		if (!key) return false
		return !!kv.match(key)
	}

	me.match = key => {
		if (!key) return {}
		if (isExpired(key)) fetchQueue.push(key)

		let out = kv.match(key)
		return out
	}

	me.del = key => kv.del(key)

	me.fetch = async (keys, force) => {
		if (!keys) return {}
		if (typeof keys === 'string') keys = [keys]
		if (!Array.isArray(keys)) throw new Error('keys must be array')
		let unsyncids = keys.filter(k => !!k)
		if (!force) unsyncids = unsyncids.filter(k => isExpired(k))

		await Promise.all(unsyncids.map(id => fetchQueue.push(id)))
		return keys.map(k => kv.match(k))
	}

	let fetchQueue = new flow.batch(100, 500, async ids => {
		let { error: suberr } = await realtime.subscribe(topics)

		// make ids unique
		var idM = {}
		ids.forEach(id => (idM[id] = true))
		ids = Object.keys(idM)

		// filter items that must be fetched
		ids = ids.filter((id, i) => {
			if (!id) return false
			// if (!isExpired(id)) return false
			return true
		})

		let items = ids.map(id => {
			let item = kv.match(id) || {}
			item.id = id
			return item
		})

		if (items.length === 0) return []

		ids.map(id => {
			expires[id] = Date.now() + 30000 // should retry in 30 sec
		})
		let { data: newitems, error } = await matcher(items)
		if (error) {
			console.log('ERR', error)
			return []
		}

		newitems = newitems || {}
		let itemM = {}
		ids.map((id, i) => {
			let newitem = newitems[i] || {}
			if (newitem.id) itemM[id] = newitem // server does return new data
		})

		// add 1 more expire days if subscribe success
		if (!suberr) {
			ids.map(id => {
				expires[id] = Date.now() + 120000 // 2 mins
			})
		}

		kv.put(Object.values(itemM))
		pubsub.publish(name, itemM)
	})
	return me
}
