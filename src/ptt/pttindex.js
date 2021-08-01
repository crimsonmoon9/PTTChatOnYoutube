import { PTTControler } from './PTTControler.js'

export function InitPTT (messagePoster) {
  const msg = messagePoster
  const cryptkey = GM_getValue('cryptkey', Math.random())
  const ptt = new PTTControler()
  function hook (obj, key, cb) {
    const fn = obj[key].bind(obj)
    obj[key] = (...args) => {
      fn.apply(this, args)
      cb.apply(this, args)
    }
  }
  hook(unsafeWindow.console, 'log', t => {
    if (t === 'view update') {
      ptt.update()
    }
  })
  msg.login = data => {
    const i = CryptoJS.AES.decrypt(data.id, cryptkey).toString(CryptoJS.enc.Utf8)
    const p = CryptoJS.AES.decrypt(data.pw, cryptkey).toString(CryptoJS.enc.Utf8)
    ptt.checkLock(ptt.loginPtt, i, p)
  }
}
