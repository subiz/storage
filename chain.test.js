var lo = require('lodash')
import store from './chain.js'

let testcase = {
	simple: async function () {
		let reload = false
		// clean up

		await new store.ChainMgr('acc').destroy()
		let chain = new store.ChainMgr('acc', async function (type, anchor, limit) {
			console.log('call api', type, anchor, limit)
			switch (anchor) {
			case '':
				if (reload) {
					return [
						[
							{ id: 'thanh12', index: 12, value: { name: 'thanh12' } },
							{ id: 'long13', index: 13, value: { name: 'long13' } },
							{ id: 'quan14', index: 14, value: { name: 'quan14' } },
							{ id: 'thanh8', index: 8, value: { name: 'thanh8' } },
							{ id: 'long9', index: 9, value: { name: 'long9' } },
							{ id: 'quan10', index: 10, value: { name: 'quan10' } },
						],
						'',
					]
				}

				return [
					[
						{ id: 'thanh8', index: 8, value: { name: 'thanh8' } },
						{ id: 'long9', index: 9, value: { name: 'long9' } },
						{ id: 'quan10', index: 10, value: { name: 'quan10' } },
					],
					'111',
				]

			case '111':
				return [
					[
						{ id: 'thanh5', index: 5, value: { name: 'thanh5' } },
						{ id: 'long6', index: 6, value: { name: 'long6' } },
						{ id: 'quan7', index: 7, value: { name: 'quan7' } },
					],
					'222',
				]

			case '222':
				return [
					[
						{ id: 'thanh1', index: 1, value: { name: 'thanh1' } },
						{ id: 'long2', index: 2, value: { name: 'long2' } },
						{ id: 'quan3', index: 3, value: { name: 'quan3' } },
					],
					'222',
				]

			default:
				console.log('RE', type, anchor, limit)
				throw 'wat'
			}
		})

		// ignore
		await chain.put('a', 'thanh', 1, { name: 'thanh', age: 20 })
		await chain.put('a', 'long', 2, { name: 'long', age: 20 })

		console.log('DD0', await chain.list('thanh'))

		await chain.loadMore('thanh', 10)

		// should be 10, 9, 8
		console.log('DD1', await chain.list('thanh'))

		await chain.loadMore('thanh', 10)
		// should be 10, 9, 8, 7, 6, 5
		console.log('DD2', await chain.list('thanh'))

		reload = true
		await chain.reload('thanh')

		// should be 10, 9, 8, 7, 6, 5, 4, 3, 2 1
		console.log('DD3', await chain.list('thanh'))
	},
}

export default async function run () {
	console.log('RUNNING TEST')
	for (const tc of lo.map(testcase)) {
		await tc()
	}
	console.log('DONE--------')
}
