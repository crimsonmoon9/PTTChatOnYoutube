import { PTTStatus } from './PTT.js'
export class PTTControler {
  /**
   * @param {PTTStatus} pttStatus 
   */
  constructor(pttStatus) {
    this.pttStatus = pttStatus
    this.controlState = 0
    this.commandList = []
    this.autoCommands = [
      { reg: /您想刪除其他重複登入的連線嗎/, input: 'n\n' },
      { reg: /您要刪除以上錯誤嘗試的記錄嗎/, input: 'n\n' },
      { reg: /按任意鍵繼續/, input: ' ' },
      { reg: /動畫播放中\.\.\./, input: 'q' },
      { reg: /大富翁 排行榜|發表次數排行榜/, input: 'q' },
      { reg: /本日十大熱門話題/, input: 'q' },
      { reg: /本週五十大熱門話題/, input: 'q' },
      { reg: /每小時上站人次統計/, input: 'q' },
      { reg: /本站歷史 \.\.\.\.\.\.\./, input: 'q' },
      { reg: /看 板 {2}目錄數 {3}檔案數 {5}byte數 {3}總 分 {5}板 {3}主/, input: 'q' },
      { reg: /名次──────範本───────────次數/, input: 'q' },
      { reg: /鴻雁往返 {2}\(R\/y\)回信 \(x\)站內轉寄 \(d\/D\)刪信 \(\^P\)寄發新信/, input: 'q' },
      { reg: /【精華文章】/, input: 'q' },
      { reg: /【看板列表】/, input: 'q' },
      { reg: /【分類看板】/, input: 'q' },
      { reg: /【電子郵件】/, input: 'e' },
      { reg: /【聊天說話】/, input: 'e' },
      { reg: /【個人設定】/, input: 'e' },
      { reg: /【工具程式】/, input: 'e' },
      { reg: /【網路遊樂場】/, input: 'e' },
      { reg: /您確定要離開【 批踢踢實業坊 】嗎\(Y\/N\)？/, input: 'n\n' }
    ]
  }

  lock () {
    console.log('lock')
    this.controlState = 1
  }

  unlock () {
    console.log('unlock')
    this.controlState = 0
    this.commandList = []
  }

  insertText (str) {
    console.log('insertText')
    if (!str) return
    const e = new CustomEvent('paste')
    e.clipboardData = { getData: () => str }
    document.querySelector('#t').dispatchEvent(e)
  }

  add (reg, input, callback, ...args) {
    console.log('add: ', { reg, input, callback, ...args })
    this.commandList.push({ reg, input, callback, ...args })
  }

  runTasks (taskList, finishBehavior) {
    console.log('runTasks')
    for (let i = 0; i < taskList.length; i++) {
      const result = taskList[i]()
      if (!result.pass) {
        result.callback()
        this.add(/.*/, '', this.runTasks, taskList, finishBehavior)
        return
      }
    }
    finishBehavior()
  }

  checkAutoCommands () {
    console.log('checkAutoComands')
    const commands = this.autoCommands
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i]
      const result = this.pttStatus.screenHasText(cmd.reg)
      if (result) {
        this.insertText(cmd.input)
        return true
      }
    }
    return false
  }

  execCommands () {
    const cmd = this.commandList.shift()
    console.log(`execCommands: "${cmd}"`)
    if (cmd && this.pttStatus.screenHasText(cmd.reg)) {
      this.insertText(cmd.input)
      if (cmd.callback) {
        const args = cmd.args ? cmd.args : []
        cmd.callback.apply(this, args)
      }
    }
  }

  update () {
    console.log('update')
    this.pttStatus.updatePttState()
    if (!this.checkAutoCommands()) this.execCommands()
  }

  checkLock (cb, ...args) {
    console.log('checkLock')
    if (this.controlState === 0) {
      this.lock()
      cb.apply(this, args)
    }
  }

  loginPtt (id, pwd) {
    console.log('loginPtt')
    if (!this.login) {
      const result = this.pttStatus.screenHasText(/請輸入代號，或以 guest 參觀，或以 new 註冊/)
      if (result) {
        this.insertText(id + '\n' + pwd + '\n')
        this.add(/.*/, '', this.checkLogin)
      } else {
        this.add(/.*/, '', this.loginPtt, id, pwd)
      }
    } else {
      this.unlock()
    }
  }

  checkLogin () {
    console.log('checkLogin')
    if (this.pttStatus.screenHasText(/密碼不對或無此帳號。請檢查大小寫及有無輸入錯誤。|請重新輸入/)) {
      this.unlock()
    } else if (this.pttStatus.screenHasText(/上方為使用者心情點播留言區|【 精華公佈欄 】/)) {
      this.login = true
      this.unlock()
    } else if (this.pttStatus.screenHasText(/登入中，請稍候\.\.\.|正在更新與同步線上使用者及好友名單，系統負荷量大時會需時較久|密碼正確！ 開始登入系統/)) {
      this.add(/.*/, '', this.checkLogin)
    }
  }
}
