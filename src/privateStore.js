const KeyValueStore = require('./keyValueStore')
const utils = require('./utils')
const nacl = require('tweetnacl')

const SALT_KEY = '3BOX_SALT'

class PrivateStore extends KeyValueStore {

  constructor (muportDID, orbitdb, name) {
    super(orbitdb, name)
    this.muportDID = muportDID
  }

  async get (key) {
    const encryptedEntry = await super.get(this._genDbKey(key))
    return encryptedEntry ? this._decryptEntry(encryptedEntry) : null
  }

  async set (key, value) {
    value = this._encryptEntry(value)
    key = this._genDbKey(key)
    return super.set(key, value)
  }

  async remove (key) {
    key = this._genDbKey(key)
    return super.remove(key)
  }

  async _sync (orbitAddress) {
    const address = await super._sync(orbitAddress)
    let encryptedSalt = await super.get(SALT_KEY)
    if (encryptedSalt) {
      this._salt = this._decryptEntry(encryptedSalt)
    } else {
      this._salt = Buffer.from(nacl.randomBytes(16)).toString('hex')
      encryptedSalt = this._encryptEntry(this._salt)
      await super.set(SALT_KEY, encryptedSalt)
    }
    return address
  }

  _genDbKey (key) {
    return utils.sha256Multihash(this._salt + key)
  }

  _encryptEntry (entry) {
    if (typeof entry === 'undefined') throw new Error('Entry to encrypt cannot be undefined')

    return this.muportDID.symEncrypt(JSON.stringify(entry))
  }

  _decryptEntry ({ ciphertext, nonce }) {
    return JSON.parse(this.muportDID.symDecrypt(ciphertext, nonce))
  }
}

module.exports = PrivateStore
