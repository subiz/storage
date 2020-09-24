var kv = require('./kv.js').default
var chain = require('./chain.js').default
var inmem_localstorage = require('./inmem_localstorage.js').default
var lsdb = require('./lsdb.js').default

export default { kv, lsdb, chain, inmem_localstorage }
