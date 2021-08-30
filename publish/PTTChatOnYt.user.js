// ==UserScript==
// @name               pttchatonyoutube
// @namespace          https://github.com/zoosewu/PTTChatOnYoutube
// @version            2.7.28
// @description        Connect ptt pushes to youtube chatroom
// @author             Zoosewu, crimsonmoon9
// @match              https://www.youtube.com/*
// @match              https://youtu.be/*
// @match              https://term.ptt.cc/*
// @match              https://hololive.jetri.co/*
// @match              https://www.twitch.tv/*
// @match              https://niji-mado.web.app/home
// @match              https://lin.ee/*
// @match              https://today.line.me/tw/v2/article/*
// @match              http://blank.org/
// @match              https://holodex.net/*
// @match              https://staging.holodex.net/*
// @grant              GM_xmlhttpRequest
// @grant              GM_info
// @grant              unsafeWindow
// @grant              GM_getValue
// @grant              GM_setValue
// @grant              GM_deleteValue
// @license            MIT
// @name:zh-TW         Youtube聊天室顯示PTT推文
// @description:zh-tw  連結PTT推文到Youtube聊天室  讓你簡單追實況搭配推文
// @run-at             document-start
// @require            https://code.jquery.com/jquery-3.5.1.slim.min.js
// @require            https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js
// @require            https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.min.js
// @require            https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/aes.js
// @require            https://cdn.jsdelivr.net/npm/vue@2.6.12/dist/vue.min.js
// @require            https://cdn.jsdelivr.net/npm/vuex@3.6.0/dist/vuex.min.js
// @require            https://cdn.jsdelivr.net/npm/@akryuminfinitum/vue-virtual-scroller@1.0.11-canary.2/dist/vue-virtual-scroller.min.js
// @require            https://cdn.jsdelivr.net/npm/xss@1.0.8/dist/xss.js
// @homepageURL        https://github.com/zoosewu/PTTChatOnYoutube/tree/master/homepage
// @//downloadURL      https://greasyfork.org/scripts/418469-pttchatonyt/code/PttChatOnYt.user.js
// ==/UserScript==

/* eslint-disable no-unused-vars */
// user log
const reportmode = false
// all log
const showalllog = false
// dev log
const showPTTscreen = (false || reportmode || showalllog)
const showcommand = (false || reportmode || showalllog)
const showPostMessage = (false || reportmode || showalllog)
const showonMessage = (false || reportmode || showalllog)
const showalertmsg = false || showalllog

function MessagePoster () {
  this.targetorigin = ''
  this.ownerorigin = ''
  this.targetWindow = null
  this.PostMessage = function (msg, data) {
    if (this.targetWindow === null) return

    const d = { m: msg, d: data }
    this.targetWindow.postMessage(d, this.targetorigin)
    if (showPostMessage && msg !== 'PlayerUpdate') { console.log(this.ownerorigin + ' message posted to ' + this.targetorigin, d) }
  }
  this.onMessage = function (event) {
    // Check sender origin to be trusted
    if (event.origin !== this.targetorigin) return

    const data = event.data
    console.log('typeof (this[data.m])', typeof (this[data.m]))
    if (typeof (this[data.m]) === 'function') {
      this[data.m].call(null, data.d)
    }
    if (showonMessage && data.m !== 'PlayerUpdate') console.log(this.ownerorigin + ' get message from ' + this.targetorigin, data)
  }
  if (window.addEventListener) {
    if (reportmode) console.log('addEventListener message')
    /* eslint-disable no-useless-call */
    window.addEventListener('message', event => { this.onMessage.call(this, event) }, false)
  } else if (window.attachEvent) {
    if (reportmode) console.log('addEventListener onmessage')
    window.attachEvent('onmessage', event => { this.onMessage.call(this, event) }, false)
    /* eslint-enable no-useless-call */
  }
}

function InitPTT (messageposter) {
  const SkipCommand = true
  const msg = messageposter
  /* eslint-disable no-global-assign */
  // get crypt key;
  cryptkey = GM_getValue('cryptkey', Math.random())
  /* eslint-enable no-global-assign */

  // start script
  // const PageState = Object.freeze({ Unlogin: 0, MainScreen: 1, BoardSceen: 2, FirstPageOfPost: 3, OtherPageOfPost: 4 })
  const PTT = {
    connect: true, // 自動 連線狀態
    login: false, // 自動
    controlstate: 0,
    lastviewupdate: 0,
    lock: function () {
      PTT.controlstate = 1
    },
    unlock: function () {
      PTT.controlstate = 0
      PTT.commands.list = []
    },
    // 0 free,1 lock 手動更新 每次操作都要打開 用完關閉
    pagestate: 0, // PTT頁面狀態 0未登入畫面 1主畫面 2看板畫面 3文章畫面第一頁 4文章畫面其他頁
    screen: [], // 自動 畫面資料
    screenstate: 0, // 0 clear, 1 full 自動 畫面是否已更新
    wind: null, // 自動
    screenHaveText: function (regText) {
      let result = null
      let reg = regText
      if (typeof regText.exec !== 'function') { reg = new RegExp(regText, 'i') }
      if (this.screenstate === 0) {
        const sElement = $("[data-type='bbsline']", this.wind.document)
        for (let i = 0; i < sElement.length; i++) {
          const txt = sElement[i].textContent
          if (result == null) result = new RegExp(reg, 'i').exec(txt)
          this.screen.push(txt)
          // if (reportmode) console.log("==screenHaveText", reg, result, txt);
        }
        this.screenstate = 1
        return result
      } else {
        for (let i = 0; i < this.screen.length; i++) {
          const txt = this.screen[i]
          result = new RegExp(reg, 'i').exec(txt)
          // if (reportmode) console.log("==screenHaveText", reg, result, txt);
          if (result != null) {
            return result
          }
        }
        return null
      }
    },
    screenclear: function () {
      this.screenstate = 0
      this.screen = []
    },
    commands: {
      list: [],
      add: function (reg, input, callback, ...args) {
        const com = { reg, input, callback, args }
        if (showcommand) console.log('==Add command ', com)
        this.list.push(com)
      },
      getfirst: function () {
        return this.list[0]
      },
      removefirst: function () {
        this.list.shift()
      }
    },
    pagestatefilter: [
      { reg: /請輸入代號，或以 guest 參觀，或以 new 註冊/, state: 0 },
      { reg: /上方為使用者心情點播留言區|【 精華公佈欄 】/, state: 1 },
      { reg: /^\[←\]離開 \[→\]閱讀/, state: 2 },
      { reg: /目前顯示: 第 01/, state: 3 },
      { reg: /目前顯示: 第/, state: 4 }
    ],
    autocom: [
      {
        reg: /您想刪除其他重複登入的連線嗎/,
        input: '',
        callback: () => {
          const inserttxt = PTT.DeleteOtherConnect ? 'y\n' : 'n\n'
          insertText(inserttxt)
          return SkipCommand
        }
      },
      { reg: /您要刪除以上錯誤嘗試的記錄嗎/, input: 'n\n' },
      {
        reg: /按任意鍵繼續/,
        input: '',
        callback: () => {
          const reg = /(找不到這個文章代碼\(AID\)，可能是文章已消失，或是你找錯看板了|這一篇文章值|◆ 本文已過長, 禁止快速連續推文|◆ 對不起，您的文章或推文間隔太近囉！)/
          const result = PTT.screenHaveText(reg)
          if (result) { return !SkipCommand } else {
            insertText('\n')
            return SkipCommand
          }
        }
      },
      { reg: /動畫播放中\.\.\./, input: 'q' },
      {
        reg: /系統過載, 請稍後再來\.\.\./,
        input: '',
        callback: () => {
          serverfull = true
          if (PTT.controlstate === 1) {
            PTT.unlock()
            msg.PostMessage('alert', { type: 0, msg: '系統過載, 請稍後再來...' })
            return SkipCommand
          }
        },
        args: []
      },
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
  PTT.wind = window
  let PTTPost = {
    board: '',
    AID: '',
    title: '',
    posttime: '',
    pushes: [],
    startline: 0,
    endline: 3,
    percent: 0,
    samepost: false,
    haveNormalTitle: false,
    enteredAID: false,
    searchingTitle: {
      boardforsearch: '',
      titleforsearch: '',
      titlefetched: '',
      enteredsearchtitle: false,
      isend: {
        insertP: true,
        insert$: true
      }
    },
    enteredTitle: false,
    enableautofetchpost: false,
    buffer: {
      title: '',
      board: '',
      autofetch: false
    }
  }
  let serverfull = false
  const insertText = (() => {
    let t = PTT.wind.document.querySelector('#t')
    return str => {
      if (!t) t = PTT.wind.document.querySelector('#t')
      const e = new CustomEvent('paste')
      // debug用
      if (reportmode) console.log('insertText : "' + str + '"')
      e.clipboardData = { getData: () => str }
      t.dispatchEvent(e)
    }
  })()
  function ComLog (cmd) {
    if (showcommand) console.log('==execute command:', [cmd])
  }
  function updatePagestate () {
    for (let i = 0; i < PTT.pagestatefilter.length; i++) {
      const filter = PTT.pagestatefilter[i]
      const result = PTT.screenHaveText(filter.reg)
      if (result != null) {
        if (reportmode) console.log('==page state:' + PTT.pagestate + '->' + filter.state, result)
        PTT.pagestate = filter.state
        if (PTT.pagestate > 1) reconnecttrytimes = 10
        msg.PostMessage('PTTState', PTT.pagestate)
        return
      }
    }
  }
  function chechAutoCommand () {
    const commands = PTT.autocom
    for (let autoi = 0; autoi < commands.length; autoi++) {
      const cmd = commands[autoi]
      const result = PTT.screenHaveText(cmd.reg)
      // if (showcommand) console.log("==auto command", cmd, result);
      if (result != null) {
        ComLog(cmd)
        insertText(cmd.input)
        if (typeof cmd.callback !== 'undefined') {
          const args = cmd.args ? cmd.args : []
          return cmd.callback(...args)
        } else { return true }
      }
    }
    return false
  }

  function command () {
    const cmd = PTT.commands.getfirst()
    if (typeof cmd !== 'undefined' && PTT.screenHaveText(cmd.reg) != null) {
      PTT.commands.removefirst()
      ComLog(cmd)
      insertText(cmd.input)
      if (typeof cmd.callback === 'function') {
        const args = cmd.args ? cmd.args : []
        cmd.callback(...args)
      }
    }
  }
  function OnUpdate () {
    if (showalllog) console.log('==OnUpdate start')
    PTT.screenclear()
    if (showalllog) console.log('==set pagestate.')
    updatePagestate()
    if (showalllog) console.log('==check autocommand.')
    if (!chechAutoCommand()) {
      if (showalllog) console.log('==check command.')
      command()
    }
    if (showPTTscreen) console.log('==PTT screen shot:', PTT.screen)
    const nextcom = PTT.commands.getfirst()
    if (showcommand && typeof nextcom !== 'undefined') console.log('==next command : reg:' + nextcom.reg + 'input:' + nextcom.input, [nextcom.callback])
    else if (showcommand) console.log('==next command : none.')
    if (showalllog) console.log('==OnUpdate end')
  }
  // hook start
  function hook (obj, key, cb) {
    const fn = obj[key].bind(obj)
    obj[key] = function (...args) {
      fn.apply(this, args)
      cb.apply(this, args)
    }
  }
  hook(unsafeWindow.console, 'log', t => {
    if (typeof t === 'string') {
      if (t.indexOf('page state:') >= 0) {
        /* const newstate = /->(\d)/.exec(t)[1]; */
      } else if (t === 'view update') {
        PTT.lastviewupdate = Date.now()
        serverfull = false
        OnUpdate()
      }
    }
  })
  // hook end
  function Reconnect () {
    const disbtn = $('.btn.btn-danger[type=button]')
    if (disbtn && disbtn.length > 0) {
      msg.PostMessage('alert', { type: 0, msg: 'PTT已斷線，請重新登入。' })
      PTT.login = false
      disbtn[0].click()
      serverfull = false
      PTT.screenstate = -1
      PTT.unlock()
      reconnecttrytimes--
      return true
    }
    return false
  }
  function checkscreenupdate () {
    if (PTT.controlstate === 0) return
    const now = Date.now()
    if (now > PTT.lastviewupdate + 10000) {
      msg.PostMessage('alert', { type: 0, msg: 'PTT無回應，請稍後再試，或重新整理頁面。' })
      PTT.unlock()
    } else {
      msg.PostMessage('alert', { type: 1, msg: '指令執行中......' })
      setTimeout(checkscreenupdate, 3500)
    }
  }

  // -----------------------task getpostbyline --------------------
  function gotoBoard () {
    if (PTTPost.enableautofetchpost) {
      insertText('s' + PTTPost.searchingTitle.boardforsearch + '\n')
    } else insertText('s' + PTTPost.board + '\n')
  }
  function boardcheck () {
    const res = { pass: false, callback: gotoBoard }
    let reg = ''; let re = ''
    if (PTT.pagestate === 4 || PTT.pagestate === 3) {
      res.pass = true
      return res
    } else if (PTT.pagestate === 1) return res
    else if (PTT.pagestate === 2) {
      reg = '看板《' + (PTTPost.enableautofetchpost ? PTTPost.searchingTitle.boardforsearch : PTTPost.board) + '》'
      re = '系列《' + (PTTPost.enableautofetchpost ? PTTPost.searchingTitle.boardforsearch : PTTPost.board) + '》'
    }
    const currect = PTT.screenHaveText(reg); const curr = PTT.screenHaveText(re)
    if (currect || curr) res.pass = true
    return res
  }

  function gotoPost () {
    if (!PTTPost.enableautofetchpost) {
      if (PTT.screenHaveText(/系列《.+》/)) insertText('q') // 關鍵字搜尋狀態不能#AID
      else if (PTTPost.enteredAID) {
        insertText('r')
        PTTPost.enteredAID = false
      } else {
        insertText('NPP#' + PTTPost.AID + '\n')
        PTTPost.enteredAID = true
      }
    } else {
      if (!PTTPost.enteredTitle) {
        insertText('/' + PTTPost.searchingTitle.titleforsearch + '\n')
        PTTPost.enteredTitle = true
      } else {
        insertText('$r')
      }
    }
  }
  function PostCheck () {
    const res = { pass: true, callback: gotoPost }
    if (PTT.pagestate === 2) {
      if ((PTTPost.enableautofetchpost && !PTTPost.enteredTitle) || (!PTTPost.enableautofetchpost && !PTTPost.enteredTitle)) res.pass = false
      if ((!PTTPost.enableautofetchpost && PTTPost.enteredAID) || (PTTPost.enableautofetchpost && PTTPost.enteredTitle)) {
        if (PTT.screenHaveText(/找不到這個文章代碼\(AID\)，可能是文章已消失，或是你找錯看板了/)) {
          msg.PostMessage('alert', { type: 0, msg: '文章AID錯誤，文章已消失或是你找錯看板了。' })
          if (reportmode) console.log('文章AID錯誤，文章已消失或是你找錯看板了', PTT.pagestate, PTT, PTTPost)
          PTT.unlock()
          return
        } else res.pass = false
      }
    } else if (PTT.pagestate === 1) console.log('==PostCheck error, PTT.pagestate == 1.')
    return res
  }
  function backtoboard () { insertText('qP') }
  function PotsTitleCheck () {
    const res = { pass: true, callback: backtoboard }
    if (PTT.pagestate === 3) {
      const reg = / 標題 +(.+)/
      const posttitle = PTT.screenHaveText(reg)
      let title = ''
      if (posttitle) {
        PTTPost.haveNormalTitle = true
        if (reportmode) console.log('==set haveNormalTitle true', posttitle)
        title = posttitle[1].replace(/\s+$/g, '') // 抓一般標題
      } else for (let i = 0; i < 5 && i < PTT.screen.length; i++) title += PTT.screen[i] // 抓前幾行
      if (PTTPost.samepost) {
        if (!PTTPost.enableautofetchpost) {
          if (title !== PTTPost.title) res.pass = false
        }
      } else {
        PTTPost.title = title
        const result = PTT.screenHaveText(/時間 {2}(\S{3} \S{3} ...\d{2}:\d{2}:\d{2} \d{4})/)
        if (result) PTTPost.posttime = new Date(result[1])
        else PTTPost.posttime = new Date(Date.now())
      }
    } else if (PTT.pagestate === 1) console.log('==PotsTitleCheck error, PTT.pagestate == 1.')
    else if (PTT.pagestate === 2) console.log('==PotsTitleCheck error, PTT.pagestate == 2.')
    return res
  }

  function gotoline () { insertText(PTTPost.endline + '.\n') }
  function PostLineCheck () {
    const res = { pass: true, callback: gotoline }
    if (PTT.pagestate === 4 || PTT.pagestate === 3) {
      const lineresult = PTT.screenHaveText(/目前顯示: 第 (\d+)~(\d+) 行/)
      const startline = lineresult[1]
      let targetline = PTTPost.endline - startline + 1
      if (startline < 5 && PTTPost.haveNormalTitle) targetline += 1
      if ((targetline < 1 || targetline > 23) && PTT.screenHaveText(/瀏覽 第 \d+\/\d+ 頁 \(100%\) +目前顯示: 第 \d+~\d+ 行/) === null) res.pass = false
      else getpush()
    } else if (PTT.pagestate === 1) console.log('==PistLineCheck error, PTT.pagestate == 1.')
    else if (PTT.pagestate === 2) console.log('==PistLineCheck error, PTT.pagestate == 2.')
    return res
  }

  function searchfortitle () {
    if (!PTTPost.searchingTitle.enteredsearchtitle) {
      insertText('NPP/' + PTTPost.searchingTitle.titleforsearch + '\n')
      PTTPost.searchingTitle.enteredsearchtitle = true
    }
  }
  function istitleexistcheck () {
    const res = { pass: true, callback: searchfortitle }
    if (PTT.pagestate === 2) {
      if (!PTTPost.searchingTitle.enteredsearchtitle) res.pass = false
      else {
        if (PTT.screenHaveText(/看板《.+》/)) {
          if (reportmode) console.log('==searchfortitle error, title unavailable.')
          msg.PostMessage('alert', { type: 0, msg: '無此標題文章' })
          PTT.unlock()
          return
        }
      }
    }
    return res
  }
  function newesttitlecheck () {
    const res = { pass: true, callback: gotoend }
    if (PTT.pagestate === 2) {
      if (!PTTPost.searchingTitle.isend.insertP || !PTTPost.searchingTitle.isend.insert$) res.pass = false
      else {
        const reg = /^(>|●).+(□|R:|轉)/
        const posttitle = PTT.screenHaveText(reg)
        let title = ''
        if (posttitle) {
          PTTPost.haveNormalTitle = true
          if (reportmode) console.log('==set haveNormalTitle true', posttitle)
          title = posttitle.input.replace(/\s+$/g, '').substr(30)
          if (title[0] === '□') title = title.substr(1)
        }
        if (title === '' || title === null) res.pass = false
        else PTTPost.searchingTitle.titlefetched = title
      }
    }
    return res
  }
  function receiveTitle () {
    PTT.unlock()
    msg.PostMessage('alert', { type: 2, msg: '標題讀取完成。' })
    msg.PostMessage('getAutoFetchedPostTitle', PTTPost.searchingTitle.titlefetched)
    insertText('qq')
    PTTPost.searchingTitle.titlefetched = ''
    PTTPost.searchingTitle.titleforsearch = PTTPost.buffer.title
    PTTPost.searchingTitle.boardforsearch = PTTPost.buffer.board
    if (!PTTPost.buffer.autofetch) { PTTPost.enableautofetchpost = false }
  }

  function savepush (content, result) {
    const pushdata = {}
    pushdata.type = result[1]
    pushdata.id = result[2]
    pushdata.content = content
    pushdata.date = new Date(PTTPost.posttime.getFullYear(), result[4] - 1, result[5], result[6], result[7])
    PTTPost.pushes.push(pushdata)
    // console.log(result);
  }
  function getpush () {
    const lineresult = PTT.screenHaveText(/目前顯示: 第 (\d+)~(\d+) 行/)
    const startline = +lineresult[1]
    const endline = +lineresult[2]
    let targetline = PTTPost.endline - startline + 1
    if (startline < 5 && PTTPost.haveNormalTitle) targetline += 1
    const checkedline = []
    // console.log("==GetPush from " + targetline + "to " + (PTT.screen.length - 1));
    // console.log("==(pttstartline, pttendline, startline, endline, targetline): (" + PTTPost.startline + ", " + PTTPost.endline + ", " + startline + ", " + endline + ", " + targetline + ")");
    for (let i = targetline; i < PTT.screen.length; i++) {
      const line = PTT.screen[i]
      const result = /^(→ |推 |噓 )(.+?): (.*)(\d\d)\/(\d\d) (\d\d):(\d\d)/.exec(line)
      if (result != null) {
        let content = result[3]
        const reg = /\s+$/g
        content = content.replace(reg, '')
        savepush(content, result)
        if (reportmode) checkedline.push(i)
        if (reportmode) console.log('GetPush at line', i, content, line)
      } else if (reportmode) console.log('GetPush at line fail', i, line)
    }
    if (reportmode) console.log('GetPush startline,', startline, ', endline', PTTPost.endline, ', targetline', targetline, ', checkedline', checkedline, ', haveNormalTitle', PTTPost.haveNormalTitle)
    const percentresult = PTT.screenHaveText(/瀏覽 第 .+ 頁 \( *(\d+)%\)/)
    PTTPost.percent = percentresult[1]
    PTTPost.startline = startline
    PTTPost.endline = endline
  }

  function gotonextpage () { insertText(' ') }
  function PostPercentCheck () {
    const res = { pass: false, callback: gotonextpage }
    if ((PTT.pagestate === 3 || PTT.pagestate === 4) && PTT.screenHaveText(/瀏覽 第 \d+\/\d+ 頁 \(100%\) +目前顯示: 第 \d+~\d+ 行/) !== null) {
      res.pass = true
    } else if (PTT.pagestate === 1) console.log('==PostPercentCheck error, PTT.pagestate == 1.')
    else if (PTT.pagestate === 2) console.log('==PostPercentCheck error, PTT.pagestate == 2.')
    return res
  }
  // -----------------------task getpostbyrecent --------------------
  function gotoend () {
    if (!PTTPost.searchingTitle.isend.insertP || !PTTPost.searchingTitle.isend.insert$) {
      if (!PTTPost.searchingTitle.isend.insertP) {
        insertText('P')
        PTTPost.searchingTitle.isend.insertP = true
      } else if (!PTTPost.searchingTitle.isend.insert$) {
        insertText('$')
        PTTPost.searchingTitle.isend.insert$ = true
      }
    } else insertText('G')
  }
  function GetRecentLine () {
    const res = { pass: false, callback: gotoend }
    if (PTT.pagestate === 4 || PTT.pagestate === 3) {
      const line = PTT.screenHaveText(/瀏覽 第 \d+\/\d+ 頁 \(100%\) +目前顯示: 第 \d+~(\d+) 行/)
      if (line) {
        let targetline = +line[1] - PTTPost.endline - 1
        if (targetline < 3) targetline = 3
        // console.log("==GetRecentLine, TotalLine, GotoLline", line[1], targetline);
        PTTPost.endline = targetline
        /* if (PTT.pagestate === 4 || PTT.pagestate === 3) */
        insertText('qP') // insertText(PTTPost.endline + ".\n");
        res.pass = true
      }
    } else if (PTT.pagestate === 1) console.log('==GetPushTask error, PTT.pagestate == 1.')
    else if (PTT.pagestate === 2) console.log('==GetPushTask error, PTT.pagestate == 2.')
    return res
  }
  //
  // -----------------------task setNewPush --------------------
  let SetNewPushtrytime = 5
  function SetNewPush () {
    const res = { pass: false, callback: () => { } }
    SetNewPushtrytime--
    if (SetNewPushtrytime < 0) { res.pass = true; return res }
    if (PTT.pagestate === 4 || PTT.pagestate === 3) {
      const pushcd = PTT.screenHaveText(/◆ 本文已過長, 禁止快速連續推文|◆ 對不起，您的文章或推文間隔太近囉！/)
      if (pushcd) {
        msg.PostMessage('alert', { type: 0, msg: '推文遭暫時禁止。' })
        res.pass = true
        return res
      }
      const pushtext = PTTPost.setpush + '\n'
      const pushcheck = PTT.screenHaveText(/(.+?): (.+?) +確定\[y\/N]:/)
      if (pushcheck) {
        console.log('pushcheck')
        PTTPost.setpush = ''
        PTTPost.pushedtext = pushcheck[2]
        insertText('y\n\nG')
        res.pass = true
        msg.PostMessage('alert', { type: 2, msg: '推文成功。' })
        return res
      }
      const pushtype = PTT.screenHaveText(/您覺得這篇文章/)
      if (pushtype) {
        console.log('pushtype')
        insertText('\n' + pushtext)
        return res
      }
      const pushdirect = PTT.screenHaveText(/時間太近, 使用|作者本人, 使用/)
      if (pushdirect) {
        console.log('pushdirect', pushdirect)
        insertText(pushtext)
        return res
      }
      const unpush = PTT.screenHaveText(/瀏覽 第 .+ 頁 \( *(\d+)%\)/)
      if (unpush) {
        console.log('unpush')
        insertText('%')
        return res
      }
    } else if (PTT.pagestate === 1) console.log('==GetPushTask error, PTT.pagestate == 1.')
    else if (PTT.pagestate === 2) console.log('==GetPushTask error, PTT.pagestate == 2.')
    return res
  }
  // ------------------------task--------------------------------
  function RunTask (tasklist, finishBehavior) {
    for (let i = 0; i < tasklist.length; i++) {
      const result = tasklist[i]()
      if (result.pass === true) if (reportmode) console.log('RunTask pass, pagestate:', PTT.pagestate, ', task name:', tasklist[i].name)
      if (result.pass === false) {
        if (reportmode) console.log('RunTask failed, pagestate:', PTT.pagestate, ', task name:', tasklist[i].name)
        result.callback()
        PTT.commands.add(/.*/, '', RunTask, tasklist, finishBehavior)
        return
      }
    }
    finishBehavior()
  }
  // ------------------------tasks--------------------------------

  const task = {}
  task.GetPostByLine = [boardcheck, PostCheck, PotsTitleCheck, PostLineCheck, PostPercentCheck]
  task.GetPostRecentLine = [boardcheck, PostCheck, PotsTitleCheck, GetRecentLine]
  task.SetPostNewPush = [boardcheck, PostCheck, PotsTitleCheck, SetNewPush]
  task.GetPostTitle = [boardcheck, istitleexistcheck, newesttitlecheck]

  function SetNewPushTask (pushtext) {
    let allowedchar = 24
    let addedtext = ''
    let trytime = 7
    while (trytime >= 0 && allowedchar > 0 && pushtext.length > 0) {
      const addtextreg = '(.{0,' + allowedchar + '})(.*)'// (.{0,24})(.*)
      const result = new RegExp(addtextreg).exec(pushtext)
      addedtext += result[1]
      const halfchar = addedtext.match(/[A-Za-z0-9_ :/\\.?=%]/g)
      const halfcount = halfchar ? halfchar.length : 0
      allowedchar = parseInt((48 - addedtext.length * 2 + halfcount) / 2)
      pushtext = result[2]
      if (reportmode) {
        console.log('SetNewPushTask Text Reg==', addedtext.length * 2, '==', halfcount, '==', halfchar)
        console.log('SetNewPushTask Text Reg==', addedtext, '==', pushtext, '==', allowedchar, '==', result)
      }
      trytime--
    }
    SetNewPushtrytime = 5
    PTTPost.setpush = addedtext
    RunTask(task.SetPostNewPush, recieveNewPush)
  }
  function CheckTitleSame (_boardforsearch, _titleforsearch, task) {
    PTT.unlock()
    PTTPost.enteredAID = false
    PTTPost.enteredTitle = false
    PTTPost.buffer.title = PTTPost.searchingTitle.titleforsearch
    PTTPost.buffer.board = PTTPost.searchingTitle.boardforsearch
    msg.PostMessage('alert', { type: 1, msg: '搜尋中。' })
    PTTPost.searchingTitle.boardforsearch = _boardforsearch
    PTTPost.searchingTitle.titleforsearch = _titleforsearch
    PTTPost.searchingTitle.enteredsearchtitle = false
    PTTPost.searchingTitle.isend.insertP = false
    PTTPost.searchingTitle.isend.insert$ = false
    PTTPost.buffer.autofetch = false
    if (PTTPost.enableautofetchpost) PTTPost.buffer.autofetch = true
    PTTPost.enableautofetchpost = true
    if (PTT.pagestate === 1) {
      if (PTT.screenHaveText(/(> |●)\(M\)ail {9}【 私人信件區 】/)) insertText('c')// 隨意切畫面
      else insertText('m')// 隨意切畫面
    } else if (PTT.pagestate === 2) insertText('qP')
    else { // PTT.pagestate === 3 || 4
      insertText('qq')// 原本就在第一頁則直接退出
    }
    PTT.commands.add(/.*/, '', task)
  }
  function GetPostTitleTask () {
    RunTask(task.GetPostTitle, receiveTitle)
  }

  function recieveNewPush () {
    msg.PostMessage('pushedText', PTTPost.pushedtext)
    PTTPost.pushedtext = ''
    if (showalllog) console.log(PTTPost)
    GetPush(PTTPost.AID, PTTPost.board, PTTPost.endline, GetPushTask)
  }
  function GetRecentLineTask () { RunTask(task.GetPostRecentLine, () => PTT.commands.add(/.*/, '', GetPushTask)) }
  function GetPushTask () { RunTask(task.GetPostByLine, recievePushes) }
  function recievePushes () {
    PTT.unlock()
    msg.PostMessage('alert', { type: 2, msg: '文章讀取完成。' })
    msg.PostMessage('newPush', PTTPost)
    if (showalllog) console.log(PTTPost)
  }
  // ------------------------Main Command--------------------------------
  function GetPush (pAID, bname, startline, task, pboardforsearch, ptitleforsearch) {
    startline = startline || 3
    msg.PostMessage('alert', { type: 1, msg: '文章讀取中。' })
    const auto = (pAID === undefined) && (bname === undefined) && (pboardforsearch === undefined) && (ptitleforsearch === undefined)
    const samepostbyAID = (bname === PTTPost.board) && (pAID === PTTPost.AID) && (pAID !== undefined) && (bname !== undefined)
    const samepostbytitle = (pboardforsearch === PTTPost.searchingTitle.boardforsearch) && (ptitleforsearch === PTTPost.searchingTitle.titleforsearch)
    if (samepostbyAID) PTTPost.enableautofetchpost = false
    if (samepostbyAID || (samepostbytitle && (ptitleforsearch !== undefined) && (pboardforsearch !== undefined)) || auto) {
      PTTPost.pushes = []
      PTTPost.samepost = true
      PTTPost.endline = startline
      if (reportmode) console.log("Get same post's push.", bname, PTTPost.board, pAID, PTTPost.AID)
    } else {
      PTTPost = {
        board: bname,
        AID: pAID,
        title: '',
        posttime: '',
        pushes: [],
        startline: 0,
        endline: startline,
        percent: 0,
        samepost: false,
        haveNormalTitle: false,
        enteredAID: false,
        searchingTitle: {
          boardforsearch: (pboardforsearch === undefined ? '' : pboardforsearch),
          titleforsearch: (ptitleforsearch === undefined ? '' : ptitleforsearch),
          titlefetched: '',
          enteredsearchtitle: false,
          isend: {
            insertP: true,
            insert$: true
          }
        },
        enteredTitle: false,
        enableautofetchpost: (ptitleforsearch !== undefined),
        buffer: {
          title: '',
          board: '',
          autofetch: false
        }
      }
      if (reportmode) console.log("Get new post's push.", bname, PTTPost.board, pAID, PTTPost.AID)
    }
    if (PTT.pagestate === 1) {
      if (PTT.screenHaveText(/(> |●)\(M\)ail {9}【 私人信件區 】/)) insertText('c')// 隨意切畫面
      else insertText('m')// 隨意切畫面
    } else if (PTT.pagestate === 2) insertText('P')// 切下一頁
    else { // PTT.pagestate === 3 || 4
      if (!PTTPost.samepost) {
        insertText('qP')// 在標題或是其他文章就退出
      } else {
        if (PTT.screenHaveText(/目前顯示: 第 01~/)) { // 內容少於一頁會卡在看板畫面
          insertText('q') // 原本就在第一頁則直接退出
        } else { insertText('qr') }// 相同文章直接進入標題
      }
    }
    PTT.commands.add(/.*/, '', task)
  }
  let TryLogin = 0
  function Login (id, pw, DeleteOtherConnect) {
    msg.PostMessage('alert', { type: 1, msg: '登入中' })
    if (!PTT.login) {
      PTT.DeleteOtherConnect = DeleteOtherConnect
      const logincheck = () => {
        if (PTT.screenHaveText(/密碼不對或無此帳號。請檢查大小寫及有無輸入錯誤。|請重新輸入/)) {
          msg.PostMessage('alert', { type: 0, msg: '登入失敗，帳號或密碼有誤。' })
          PTT.unlock()
        } else if (PTT.screenHaveText(/上方為使用者心情點播留言區|【 精華公佈欄 】/)) {
          msg.PostMessage('alert', { type: 2, msg: '登入成功。' })
          PTT.login = true
          PTT.unlock()
          // testcode
          /* (() => {
            PTTLockCheck(GetPostPush, `#1VobIvqM (C_Chat)`);
            insertText("x");
          })(); */
        } else if (PTT.screenHaveText(/登入中，請稍候\.\.\.|正在更新與同步線上使用者及好友名單，系統負荷量大時會需時較久|密碼正確！ 開始登入系統/)) {
          PTT.commands.add(/.*/, '', logincheck)
        } else {
          msg.PostMessage('alert', { type: 0, msg: '發生了未知錯誤，可能是因為保留連線導致被踢掉。' })
          console.log(PTT.screen)
          PTT.unlock()
        }
      }
      const result = PTT.screenHaveText(/請輸入代號，或以 guest 參觀，或以 new 註冊/)
      if (result) {
        if (TryLogin <= 0) { // 防止過度嘗試
          msg.PostMessage('alert', { type: 0, msg: '未知原因登入失敗。' })
          PTT.unlock()
          return
        } else TryLogin--
        insertText(id + '\n' + pw + '\n')
        PTT.commands.add(/.*/, '', logincheck)
      } else {
        PTT.commands.add(/.*/, '', Login, id, pw)
      }
    } else {
      msg.PostMessage('alert', { type: 0, msg: '已經登入，請勿重複登入。' })
      PTT.unlock()
    }
  }
  // ------------------------Lock Check--------------------------------
  function CheckLoginState (command, ...args) {
    if (reportmode) console.log('CheckLoginState,PTT.pagestate = ', PTT.pagestate)
    if (PTT.pagestate > 0) {
      command(...args)
    } else if (PTT.pagestate === -1) {
      msg.PostMessage('alert', { type: 0, msg: 'PTT已斷線，請重新登入。' })
      PTT.unlock()
    } else if (PTT.pagestate === 0) {
      msg.PostMessage('alert', { type: 0, msg: 'PTT尚未登入，請先登入。' })
      PTT.unlock()
    }
  }
  function PTTLockCheck (CallBack, ...args) {
    if (!Reconnect()) {
      if (PTT.controlstate === 1) {
        msg.PostMessage('alert', { type: 0, msg: '指令執行中，請稍後再試。' })
      } else if (serverfull) {
        msg.PostMessage('alert', { type: 0, msg: '系統過載, 請稍後再來...' })
        PTT.unlock()
      } else if (!serverfull) {
        PTT.lastviewupdate = Date.now()
        PTT.lock()
        if (reportmode) console.log('PTTLockCheck', ...args)
        CallBack(...args)
        setTimeout(checkscreenupdate, 3500)
      }
    }
  }
  // end
  let reconnecttrytimes = 10
  // const ReconnectInterval =
  window.setInterval(() => {
    if (reconnecttrytimes >= 0) { Reconnect() }
  }, 1500)

  msg.login = data => {
    const i = CryptoJS.AES.decrypt(data.id, cryptkey).toString(CryptoJS.enc.Utf8)
    const p = CryptoJS.AES.decrypt(data.pw, cryptkey).toString(CryptoJS.enc.Utf8)
    TryLogin = 2
    // console.log(data );
    // console.log([i, p],cryptkey);
    PTTLockCheck(Login, i, p, data.DeleteOtherConnect)
  }
  msg.getPushByLine = data => { if (reportmode) console.log('getPushByLine', data); PTTLockCheck(CheckLoginState, GetPush, data.AID, data.board, data.startline, GetPushTask) }
  msg.getPushByRecent = data => { if (reportmode) console.log('getPushByRecent', data); PTTLockCheck(CheckLoginState, GetPush, data.AID, data.board, data.recent, GetRecentLineTask, data.boardforsearch, data.titleforsearch) }
  msg.setNewPush = data => { if (reportmode) console.log('setNewPush', data); PTTLockCheck(SetNewPushTask, data) }
  msg.getPostTitle = data => { if (reportmode) console.log('getPostTitle', data); PTTLockCheck(CheckLoginState, CheckTitleSame, data.boardforsearch, data.titleforsearch, GetPostTitleTask) }
}

function BootStrap (frame) {
  const frameHead = $('head', frame)
  const frameBody = $('body', frame)
  if (reportmode) console.log('Add BootStrap')
  if (reportmode) { frameHead.append($('<link rel="stylesheet" href="http://127.0.0.1:8889/css/index.css">')) }
  // else { frameHead.append($(`<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">`)); }
  frameBody.append($('<script src="https://code.jquery.com/jquery-3.5.1.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>'))
  frameBody.append($('<script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js" integrity="sha384-9/reFTGAW83EW2RDu2S0VKaIzap3H66lZH81PoYlFhbGU+6BZp6G7niu735Sk7lN" crossorigin="anonymous"></script>'))
  frameBody.append($('<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.min.js" integrity="sha384-w1Q4orYjBQndcko6MimVbzY0tgp4pWB4lZ7lr30WKz0vr/aWKhXdBNmNb5D92v7s" crossorigin="anonymous"></script>'))
  frameBody.append($('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vue-virtual-scroller@1.0.10/dist/vue-virtual-scroller.css"/>"'))
}

function HerfFilter (msg, filters) {
  const isTopframe = (window.top === window.self)
  if (/term\.ptt\.cc/.exec(window.location.href) !== null) {
    if (isTopframe) throw throwstring('PTT')// check script work in right frame
    // init msg
    msg.ownerorigin = 'https://term.ptt.cc'
    msg.targetorigin = /\?url=(.+?)\/?$/.exec(window.location.href)[1]// \?url=(https\:\/\/|http\:\/\/)(.+)
    msg.targetWindow = top
    // -----
    console.log('PTTChatOnYT PTT part started at ' + window.location.href)
    InitPTT(msg)
    console.log('PTTChatOnYT PTT part initialize finish.')
    // -----
  } else {
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i]
      if (f.Reg.exec(window.location.href) !== null) {
        if (!isTopframe) throw throwstring(f.Fullname)// check script work in right frame
        // init postmessage
        msg.targetorigin = 'https://term.ptt.cc'
        msg.ownerorigin = f.ownerorigin
        // -----
        console.log('PTTChatOnYT Script started at ' + f.Fullname + ', href:', window.location.href)
        switch (document.readyState) {
          case 'complete':
            InitualizeScript()
            break
          default:
            document.addEventListener('readystatechange', function () {
              if (document.readyState === 'complete') {
                InitualizeScript()
              }
            })
            break
        }
        function InitualizeScript () {
          BootStrap(document)
          f.callback(msg)
          console.log('PTTChatOnYT initialize finished at', f.Fullname)
        }
        // -----
        break
      }
    }
  }
  function throwstring (site) {
    return 'PTTonYT Script Stopped: ' + site + ' should run in top frame'
  }
}

function InsFilter (fullname, reg, ownerorigin, Initcallback) {
  return {
    Fullname: fullname,
    Reg: reg,
    ownerorigin: ownerorigin,
    callback: Initcallback
  }
}

const PTTAppNav = {
  computed: {
    isGotoChat: function () {
      const go = this.gotoChat
      if (reportmode) console.log('isGotoChat', go)
      if (go) {
        this.$store.dispatch('gotoChat', false)
        this.$refs.chatbtn.click()
        if (reportmode) console.log('gotoChat')
      }
      return go
    },
    ...Vuex.mapGetters([
      'gotoChat'
    ])
  },
  template: `<ul id="PTTChat-navbar" class="nav nav-tabs justify-content-center" role="tablist">
  <li class="nav-item" :go="isGotoChat">
    <a class="nav-link ptt-text bg-transparent" id="nav-item-Chat" data-toggle="tab" href="#PTTChat-contents-Chat"
      role="tab" aria-controls="PTTChat-contents-Chat" aria-selected="false" ref="chatbtn">聊天室</a>
  </li>
  <li class="nav-item">
    <a class="nav-link ptt-text bg-transparent active" id="nav-item-Connect" data-toggle="tab"
      href="#PTTChat-contents-Connect" role="tab" aria-controls="PTTChat-contents-Connect" aria-selected="true">連線設定</a>
  </li>
  <li class="nav-item">
    <a class="nav-link ptt-text bg-transparent" id="nav-item-other" data-toggle="tab" href="#PTTChat-contents-other"
      role="tab" aria-controls="PTTChat-contents-other" aria-selected="false">說明</a>
  </li>
  <li class="nav-item">
    <a class="nav-link ptt-text bg-transparent" id="nav-item-PTT" data-toggle="tab" href="#PTTChat-contents-PTT"
      role="tab" aria-controls="PTTChat-contents-PTT" aria-selected="false">PTT畫面</a>
  </li>
  <li class="nav-item">
    <a class="nav-link ptt-text bg-transparent" id="nav-item-log" data-toggle="tab" href="#PTTChat-contents-log"
      role="tab" aria-controls="PTTChat-contents-log" aria-selected="false">log</a>
  </li>
  <li class="nav-item">
    <button class="nav-link ptt-text bg-transparent d-none" id="nav-item-TimeSet" type="button" data-toggle="collapse"
      data-target="#PTTChat-Time" aria-controls="PTTChat-Time" aria-expanded="false">時間</button>
  </li>
</ul>`
}

const ChatPreviewImage = {
  data () {
    return {
      mousex: 0,
      mousey: 0,
      w: 0,
      h: 0
    }
  },
  methods: {
    getWidth: function () {
      if (this.preview) this.w = this.$refs.imgel.width
      else this.w = -10000
      if (this.w === 0) this.w = 400
      return this.w
    },
    getHeight: function () {
      if (this.preview) this.h = this.$refs.imgel.height
      else this.h = -10000
      if (this.h === 0) this.h = 400
      return this.h
    },
    getNormalImage (text) {
      if (text.match(/\.(jpeg|jpg|gif|png)$/)) { return text } else { return null }
    },
    getImgurImage (text) {
      const isImageURL = text.match(/\b(https?|ftp|file):\/\/imgur\.com\/(\w+)/)
      if (isImageURL && isImageURL.length > 2) { return 'https://i.imgur.com/' + isImageURL[2] + '.png' } else { return null }
    },
    getYoutubeImage (text) {
      const videoURL = this.isYoutubeVideo(text)
      if (videoURL !== null) { return 'https://i.ytimg.com/vi/' + videoURL + '/maxresdefault.jpg' } else { return null }
    },
    isYoutubeVideo (text) {
      try {
        const youtubeURL = new URL(text)
        switch (youtubeURL.host) {
          case 'www.youtube.com':
          case 'm.youtube.com':
            return this.parseYoutubePreviewImage(youtubeURL)
          case 'youtu.be':
            return this.parseYoutubePreviewImageWithShortUrl(youtubeURL)
          default:
            return null
        }
      } catch (e) {
        return null
      }
    },
    parseYoutubePreviewImage (youtubeURL) {
      const youtubeURLArgs = youtubeURL.search.split('&')
      for (let i = 0; i < youtubeURLArgs.length; i++) {
        const isargvideo = this.parseYoutubeArgument(youtubeURLArgs[i])
        if (isargvideo !== null) return isargvideo
      }
      return null
    },
    parseYoutubeArgument (youtubeURLArg) {
      const isYoutubeURLArgVideo = youtubeURLArg.match('v=(.+)')
      if (isYoutubeURLArgVideo !== null) return isYoutubeURLArgVideo[1]
      else return null
    },
    parseYoutubePreviewImageWithShortUrl (url) {
      return url.pathname.split('/')[1]
    }
  },
  computed: {
    preview: function () {
      return this.previewImageURL.match(/\.(jpeg|jpg|gif|png)$/) !== null
    },
    className: function () {
      const classes = ['position-fixed', 'my-2']
      if (this.preview) classes.push('d-block')
      else classes.push('d-none')
      return classes.join(' ')
    },
    style: function () {
      const l = this.mousex - this.getWidth() - 10
      const t = this.mousey - this.getHeight() - 10
      let styles = {
        left: l + 'px',
        top: t + 'px'
      }
      if (this.preview) {
        if (reportmode) console.log('W,H,', this.mousex, this.getWidth(), l, this.mousey, this.getHeight(), t)
        styles = {
          maxHeight: '400px',
          maxWidth: '400px',
          left: l + 'px',
          top: t + 'px'
        }
        // console.log("previewimage style", this.mousex, this.mousey, l, t, styles);
      }
      return styles
    },
    previewImageURL: function () {
      const url = this.previewImage
      return this.getNormalImage(url) || this.getImgurImage(url) || this.getYoutubeImage(url) || ''
    },
    ...Vuex.mapGetters(['previewImage'])
  },
  mounted () {
    const self = this
    $('body').mousemove(function (e) {
      self.mousex = e.pageX
      self.mousey = e.pageY
    })
  },
  beforeDestroy () { $('body').off('mousemove') },
  template: `<div style="z-index:460;">
  <img ref="imgel" :class="className" :style="style" :src="previewImageURL"></img>
</div>`
}

const ChatScrollBtn = {
  props: { isAutoScroll: { type: Boolean, required: true } },
  methods: {
    click: function () {
      this.$emit('autoscrollclick')
    }
  },
  computed: {
    className: function () {
      const classes = ['position-absolute']
      if (this.isAutoScroll) { classes.push('d-none') }
      return classes.join(' ')
      /*
      const disable = this.isAutoScroll ? "d-none" : "";
      return "position-absolute " + disable; */
    }
  },
  template: `<div id="PTTChat-contents-Chat-btn" :class="className"
  style="z-index:400; bottom:5%; left: 50%; -ms-transform: translateX(-50%); transform: translateX(-50%);">
  <button id="AutoScroll" class="btn btn-primary" type="button" @click="click">自動滾動</button>
</div>`
}

Vue.component('ChatItemMsg', {
  props: { msgs: { type: String, required: true }, style: { type: Object, required: true } },
  data () {
    return {
      parsedmsg: []
    }
  },
  /* methods: {
    $_ChatElementMessage_ParseMsg: function () {
      //var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
      //return this.chat.msg.replace(exp, "<a class='ptt-chat-msg' href='$1' target='_blank' rel='noopener noreferrer'>$1</a>");

    },
  }, */
  computed: {
    msgList: function () {
      return this.msgs
    },
    ...Vuex.mapGetters([
      'getFontsize',
      'previewImage'
    ])
  },
  /* mounted() {
    this.$_ChatElementMessage_ParseMsg();
  }, */
  beforeDestroy () {
    this.msgList.forEach(element => { if (element.islink && this.previewImage === element.string) this.$store.dispatch('previewImage', '') })
  },
  render: function (createElement) {
    // <p class="ptt-chat-msg mb-0 mx-2" :style="msgFontsize"></p>
    return createElement(
      'p',
      {
        class: {
          'ptt-chat-msg': true,
          'mb-0': true,
          'mx-2': true
        },
        style: this.style
      },
      this.msgList.map(data => {
        if (!data.islink) return data.string
        return createElement('a', {
          class: {
            'ptt-chat-msg': true
          },
          attrs: {
            href: data.string,
            target: '_blank',
            rel: 'noopener noreferrer'
          },
          on: {
            mouseover: () => { /* console.log("onmouseover", data.string); */ this.$store.dispatch('previewImage', data.string) },
            mouseleave: () => { /* console.log("onmouseout", data.string); */ this.$store.dispatch('previewImage', '') }
          }
        }, data.string)
      })
    )
  }
})

// cryptkey
function GenerateCryptKey () {
  const c = makeid(20 + Math.random() * 10)
  GM_setValue('cryptkey', c)
  return c

  function makeid (length) {
    let result = ''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
  }
}

// 左邊補0 右邊補0
function paddingLeft (str, lenght) {
  str = str + ''
  if (str.length >= lenght) { return str } else { return paddingLeft('0' + str, lenght) }
}
function paddingRight (str, lenght) {
  str = str + ''
  if (str.length >= lenght) { return str } else { return paddingRight(str + '0', lenght) }
}
// JSON轉換用
function dateReviver (key, value) {
  if (typeof value === 'string') {
    const a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value)
    if (a) {
      return new Date(+a[1], +a[2] - 1, +a[3], +a[4] + 8, +a[5], +a[6])
    }
  }
  return value
};

/* eslint-disable no-return-assign */
/* eslint-disable no-sequences */
// 对象深复制，不考虑循环引用的情况
function cloneObj (from) {
  return Object.keys(from).reduce((obj, key) => (obj[key] = clone(from[key]), obj), {})
}
/* eslint-enable no-return-assign */
/* eslint-enable no-sequences */

// 数组深复制，不考虑循环引用的情况
function cloneArr (from) {
  return from.map((n) => clone(n))
}

// 复制输入值
function clone (from) {
  if (from instanceof Array) {
    return cloneArr(from)
  } else if (from instanceof Object) {
    return cloneObj(from)
  } else {
    return (from)
  }
}

function ThemeCheck (CSSSelector, WhiteThemeColor) {
  const element = document.querySelector(CSSSelector)
  // console.log("ThemeCheck element", element);
  const bgcolor = getComputedStyle(element).backgroundColor
  // console.log("ThemeCheck bgcolor", bgcolor);
  console.log("Theme color check: website bgcolor is '" + bgcolor + "', WhiteThemeColor is '" + WhiteThemeColor + "', whitetheme =", bgcolor.indexOf(WhiteThemeColor) >= 0)
  return bgcolor.indexOf(WhiteThemeColor) >= 0
}

/* eslint-disable no-unused-vars */

/* eslint-enable no-unused-vars */

const ChatElement = {
  props: {
    item: { type: Object, required: true },
    msgStyle: { type: Object, required: true },
    infoStyle: { type: Object, required: true },
    spaceStyle: { type: Object, required: true },
    activeChat: { type: Boolean, required: true }
  },
  methods: {
    $_ChatElementMessage_GrayCheck () {
      if (reportmode) console.log('GrayCheck', this.item, 'id', this.item.id, 'activeChat', this.activeChat, this.item, 'id>activeChat', this.item.id > this.activeChat, '->', this.item.gray, 'getDisablePushGray', this.getDisablePushGray)
      if (this.item.id > this.activeChat && !this.item.gray) this.$emit('updategray', this.item.id, true)
      else if (this.item.id <= this.activeChat && this.item.gray) this.$emit('updategray', this.item.id, false)
    },
    $_ChatElementMessage_MoueseEnter (url) {
      this.$store.dispatch('previewImage', url)
    },
    $_ChatElementMessage_MoueseLeave (url) {
      this.$store.dispatch('previewImage', '')
    },
    $_ChatElementMessage_GotoPost (aid) {
      console.log('GotoPost')
      this.$store.dispatch('gotoPost', aid)
    }
  },
  computed: {
    timeH: function () { return paddingLeft(this.item.time.getHours(), +2) },
    timem: function () { return paddingLeft(this.item.time.getMinutes(), +2) },
    typeclass: function () {
      const typecolor = this.item.type === '推 ' ? 'ptt-chat-type' : 'ptt-chat-type-n'
      return typecolor + ' mr-2 mb-0'
    },
    bgc: function () {
      if (this.getDisablePushGray) return ''
      const isUnchat = this.item.gray ? '0.25' : '0'
      const color = 'rgba(128, 128, 128, ' + isUnchat + ')'
      return { backgroundColor: color, transition: '2s' }
    },
    ...Vuex.mapGetters(['getDisablePushGray'])
  },
  watch: {
    activeChat: function () { this.$_ChatElementMessage_GrayCheck() }
  },
  mounted () {
    if (!this.getDisablePushGray) this.$_ChatElementMessage_GrayCheck()
    this.$nextTick(function () {
      this.$refs.p.mouseEnter = this.$_ChatElementMessage_MoueseEnter
      this.$refs.p.mouseLeave = this.$_ChatElementMessage_MoueseLeave
      this.$refs.p.gotoPost = this.$_ChatElementMessage_GotoPost
      if (reportmode) console.log('mounted', this, this.$refs)
    })
  },
  updated () { if (reportmode) console.log('updated, listIndex, chatIndex, msg', this.item.id, this.item.msg) },
  template: `<div class="ptt-chat media px-3" :style="bgc">
  <div class="media-body mw-100">
    <div class="ptt-chat-info d-flex flex-row" :style="infoStyle">
      <p :class="typeclass">{{ this.item.type }}</p>
      <p class="ptt-chat-id mr-2 mb-0 flex-grow-1">{{this.item.pttid }}</p>
      <p class="ptt-chat-time mb-0">{{this.timeH }}:{{this.timem}}</p>
    </div>
    <div>
      <p class="ptt-chat-msg mb-0 mx-2" :style="msgStyle" v-html="item.msg" ref="p"></p>
    </div>
    <div :style="spaceStyle"> </div>
  </div>
</div>`
}

const ChatSetNewPush = {
  inject: ['msg', 'isStream'],
  data () {
    return {
      pushtext: ''
    }
  },
  methods: {
    setPush: function () {
      const result = /.+/.exec(this.pushtext)
      if (!result) this.$store.dispatch('Alert', { type: 0, msg: '請輸入文字。' })
      else if (this.PTTState < 1) this.$store.dispatch('Alert', { type: 0, msg: 'PTT尚未登入，請先登入。' })
      else if (!this.post.gettedpost) this.$store.dispatch('Alert', { type: 0, msg: '尚未獲取文章，請先獲取文章。' })
      else this.msg.PostMessage('setNewPush', this.pushtext)
    },
    removePushedText (text) {
      if (this.pushtext.indexOf(text) === 0) this.pushtext = this.pushtext.substring(text.length, this.pushtext.length)
      console.log(this.pushtext)
      /* const reg = "(" + text + ")(.*)";
      const result = new RegExp(reg).exec(this.pushtext);
      if (reportmode) console.log("removePushedText", text, this.pushtext, result);
      this.pushtext = result[2]; */
    }
  },
  computed: {
    placeholder: function () {
      if (this.getEnableSetNewPush) return '輸入文字以推文...'
      else return '請到連線設定開啟測試版推文功能'
    },
    className: function () {
      const classes = ['form-row', 'my-2']
      if (!this.isStream) { classes.push('d-none') }
      return classes.join(' ')
    },
    ...Vuex.mapGetters([
      'post',
      'PTTState',
      'getEnableSetNewPush'
    ])
  },
  mounted () {
    this.msg.pushedText = data => this.removePushedText(data)
  },
  template: `<div class="container">
  <div :class="className">
    <div class="col">
      <input id="setnewpush" class="form-control" type="text" style="font-size:14px" :placeholder="placeholder"
        autocomplete="off" v-model.lazy="pushtext" v-on:keyup.13="setPush" :disabled="!getEnableSetNewPush">
    </div>
    <div class="col-2 px-0">
      <button id="setnewpushbtn" class="btn ptt-btnoutline w-100 px-2" type="button" @click.self="setPush()">推文</button>
    </div>
  </div>
</div>`
}

Vue.component('DynamicScroller', VueVirtualScroller.DynamicScroller)
Vue.component('DynamicScrollerItem', VueVirtualScroller.DynamicScrollerItem)
// Vue.component('RecycleScroller', VueVirtualScroller.RecycleScroller)
const Chat = {
  inject: ['msg', 'isStream'],
  data () {
    return {
      _allchats: [],
      lastChat: [],
      acChat: 0,
      lastpostaid: '',
      lastactiveChat: -1,
      intervalChat: null,
      intervalScroll: null,
      nextUpdateTime: Date.now() + 365 * 24 * 60 * 60 * 1000,
      isAutoScroll: true,
      lastautoscrolltime: Date.now(),
      ChatElement: ChatElement,
      scrolloffset: 0
    }
  },
  methods: {
    updateGray: function (index, isgray) {
      if (reportmode) {
        console.log('update gray', index, this.allchats[index])
        console.log('update gray', this.allchats[index].gray, '->', isgray, this.allchats[index].msg)
      };
      if (this.allchats[index].gray !== isgray) this.allchats[index].gray = isgray
      else console.log('update gray error', index, this.allchats[index].gray, '->', isgray, this.allchats[index].msg)
    },
    updateChat: function () {
      this.getCurrentChat()
      setTimeout(() => this.autoScrollCheck(), 10)
    },
    autoScrollCheck: function () {
      if (reportmode) console.log('scrollToChat', this.lastactiveChat, this.activeChat, this.lastactiveChat !== this.activeChat, 'this.isAutoScroll', this.isAutoScroll, this.lastautoscrolltime + 50 < Date.now())
      if (this.lastactiveChat !== this.activeChat) { this.lastactiveChat = this.activeChat }
      if (this.isAutoScroll && this.lastautoscrolltime + 50 < Date.now()) {
        this.scrollToChat()
      }
    },
    scrollToChat: function () {
      const list = this.$refs.chatmain
      const scroller = list.$refs.scroller
      const accumulator = this.activeChat > 0 ? scroller.sizes[this.activeChat - 1].accumulator : 0
      const clientHeight = list.$el.clientHeight
      let scroll = accumulator - clientHeight / 2
      if (scroll < 0) scroll = 0
      scroller.$el.scrollTo({
        top: scroll,
        behavior: ((Math.abs(scroller.$el.scrollTop - scroll) > clientHeight * 2) ? 'auto' : 'smooth')
      })
      // scroller.scrollToPosition(scroll);
    },
    getCurrentChat: function () {
      const chats = this.allchats
      if (this.isStream) { this.activeChat = chats.length - 1 } else {
        // console.log("this.activeChat && chats && reportmode", this.activeChat, chats, reportmode);
        if (this.activeChat > -1 && chats && reportmode) {
          console.log('current time: ' + this.videoCurrentTime.toString(), ', activeChat', this.activeChat)
          if (chats[this.activeChat - 1]) { console.log('activeChat-1', chats[this.activeChat - 1].time.toString()) }
          if (chats[this.activeChat]) { console.log('activeChat+0', chats[this.activeChat].time.toString(), ', activeChat > CurrentTime', chats[this.activeChat].time.valueOf() > this.videoCurrentTime.valueOf()) }
          if (chats[this.activeChat + 1]) { console.log('activeChat+1', chats[this.activeChat + 1].time.toString(), ', activeChat < CurrentTime', chats[this.activeChat + 1].time.valueOf() < this.videoCurrentTime.valueOf()) }
        }
        let move = 128
        while (true) {
          while (this.activeChat > 0 && chats[this.activeChat] && chats[this.activeChat].time.valueOf() > this.videoCurrentTime.valueOf()) {
            this.activeChat -= move
          }
          while (chats[this.activeChat + 1] && chats[this.activeChat + 1].time.valueOf() < this.videoCurrentTime.valueOf()) {
            this.activeChat += move
          }
          if (move <= 1) break
          move = move / 2
        }
      }
      if (reportmode && this.lastactiveChat !== this.activeChat && chats[this.activeChat]) console.log('CurrentChat, ', this.lastactiveChat, '->', this.activeChat, 'chats.length-1', chats.length - 1, ' isStream', this.isStream, 'chats[this.activeChat].msg', chats[this.activeChat].msg)
    },
    MouseWheelHandler: function (e) {
      this.isAutoScroll = false
    },
    EnableAutoScroll: function () {
      this.isAutoScroll = true
      this.scrollToChat()
    },
    AddEventHandler: function () {
      const list = this.$refs.chatmain.$el
      // 使用者滾輪事件
      if (list.addEventListener) {
        list.addEventListener('mousewheel', this.MouseWheelHandler, false)// IE9, Chrome, Safari, Opera
        list.addEventListener('DOMMouseScroll', this.MouseWheelHandler, false)// Firefox
      } else { // IE 6/7/8
        list.attachEvent('onmousewheel', this.MouseWheelHandler)
      }
      list.addEventListener('scroll', e => { if (this.isAutoScroll) this.lastautoscrolltime = Date.now() })
    }
  },
  computed: {
    allchats: function () {
      // console.log("allchats");
      if (this.newChatList !== this.lastChat) {
        if (this.lastpostaid !== this.post.AID) { this.lastpostaid = this.post.AID; this._allchats = []; console.log('allchats new post') }
        if (!this._allchats) this._allchats = []
        const newAllChats = this._allchats.concat(this.newChatList)
        // console.log("old _allchats", this._allchats, "newChatList", this.newChatList, "new_allchats", new_allchats);
        this._allchats = newAllChats
        this.lastChat = this.newChatList
      }
      return this._allchats ? this._allchats : []
    },
    activeChat: {
      get () {
        return this.acChat
      },
      set (value) {
        if (value > this.allchats.length - 1) this.acChat = this.allchats.length - 1
        else if (value < 0) this.acChat = 0
        else this.acChat = value
      }
    },
    // chatelement computed
    elMsgLineHeight: function () {
      return this.getFontsize * 1.2
    },
    elMsgStyle: function () {
      return { 'font-size': this.getFontsize + 'px', 'line-height': this.elMsgLineHeight + 'px' }
    },
    elInfoStyle: function () {
      return { 'font-size': this.getFontsize / 1.2 + 'px', 'line-height': this.getFontsize + 'px' }
    },
    elSpace: function () {
      return this.getChatSpace * this.getFontsize
    },
    elSpaceStyle: function () {
      return { 'margin-bottom': this.elSpace + 'px' }
    },
    defaultElClientHeight: function () {
      return +this.elMsgLineHeight + +this.getFontsize + +this.elSpace
    },
    ...Vuex.mapGetters([
      'newChatList',
      'post',
      'videoCurrentTime',
      'PTTState',
      'getDisablePushGray',
      'getPushInterval',
      'getFontsize',
      'getChatSpace'
    ])
  },
  created () {
    if (reportmode) this._allchats = testchat.list// test
    else this._allchats = []
    this.lastChat = []
    this.lastpostaid = this.post.AID

    this.activeChat = 0
    this.nextUpdateTime = Date.now() + 5 * 365 * 24 * 60 * 60 * 1000
  },
  mounted () {
    // 註冊文章事件
    this.msg.newPush = data => {
      this.$store.dispatch('updatePost', data)
      this.nextUpdateTime = Date.now() + Math.max(this.getPushInterval, 2.5) * 1000
    }
    // 定時抓新聊天
    this.intervalChat = window.setInterval(() => {
      if (this.isStream && this.PTTState > 0 && Date.now() > this.nextUpdateTime) {
        this.nextUpdateTime = Date.now() + 10 * 60 * 1000
        this.msg.PostMessage('getPushByLine', { AID: this.post.AID, board: this.post.board, startline: this.post.lastendline })
      }
    }, 340)
    // 定時滾動
    this.intervalScroll = window.setInterval(() => { this.updateChat() }, 500)
  },
  // updated: function () { console.log("updateChat", this.allchats); },
  beforeDestroy () {
    clearInterval(this.intervalChat)
    clearInterval(this.intervalScroll)
  },
  components: {
    'chat-preview-image': ChatPreviewImage,
    'chat-scroll-btn': ChatScrollBtn,
    'chat-set-new-push': ChatSetNewPush,
    'chat-element': ChatElement
  },
  template: `<div id="PTTChat-contents-Chat-main" class="h-100 d-flex flex-column">
  <dynamic-scroller ref="chatmain"
    style="overscroll-behavior: none;overflow-y: scroll;height: 100%;"
    @hook:mounted="AddEventHandler" :items="allchats" :min-item-size="defaultElClientHeight" class="scroller"
    key-field="uid">
    <template v-slot="{ item, index, active }">
      <dynamic-scroller-item :item="item" :active="active" :index="item.id"
        :size-dependencies="[item.msg,defaultElClientHeight]">
        <chat-element :item="item" :index="index" :key="index" :msg-style="elMsgStyle" :info-style="elInfoStyle"
          :space-style="elSpaceStyle" :active-chat="activeChat" @updategray="updateGray"></chat-element>
      </dynamic-scroller-item>
    </template>
  </dynamic-scroller>
  <chat-set-new-push></chat-set-new-push>
  <chat-preview-image></chat-preview-image>
  <chat-scroll-btn :is-auto-scroll="isAutoScroll" @autoscrollclick="EnableAutoScroll()"></chat-scroll-btn>
</div>`
}
const testchat = {
  l: [],
  get list () {
    for (let i = this.l.length; i < 12000; i++) {
      const el = {
        type: '推 ',
        pttid: 'ID_NO.' + i,
        time: new Date()
      }
      let msg = ''
      let m = i + ''
      switch (i % 4) {
        case 0:
          m += filterXSS('太神啦 https://youtu.be/23y5h8kQsv8?t=4510 太神啦 https://www.youtube.com/watch?t=1237&v=Suab3SD1rbI&feature=youtu.be')
          break
        case 1:
          m += filterXSS('太神啦 https://pbs.twimg.com/media/ErtC6XwVoAM_ktN.jpg 太神啦 https://imgur.com/kFOAhnc')
          break
        case 2:
          m += filterXSS('太神啦 https://i.imgur.com/m8VTnyA.png 太神啦 https://m.youtube.com/watch?v=8p-JW2RtLoY&feature=youtu.be')
          break
        case 3:
          m += filterXSS('太神啦 https://hololive.jetri.co/#/watch #1WHqSb2l (C_Chat)')
          break
        default:
          break
      }
      const haveAID = /(.*)(#.{8} \(.+\))(.*)/.exec(m)
      if (haveAID && haveAID.length > 3) {
        m = haveAID[1] + '<u onclick="this.parentNode.gotoPost(`' + haveAID[2] + '`)" style="cursor: pointer;">' + haveAID[2] + '</u>' + haveAID[3]
      }
      let result = /(.*?)(\bhttps?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])(.*)/ig.exec(m)
      let parsetime = 5
      while (result && m !== '' && parsetime > 0) {
        const prestring = result[1]
        const linkstring = result[2]
        if (prestring !== '') msg = msg + prestring
        msg = msg + '<a href="' + linkstring + '" target="_blank" rel="noopener noreferrer" class="ptt-chat-msg" ref="link' + (5 - parsetime) + '" onmouseover="this.parentNode.mouseEnter(this.href)" onmouseleave="this.parentNode.mouseLeave(this.href)">' + linkstring + '</a>'
        m = result[3]
        result = /(.*?)(\bhttps?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])(.*)/ig.exec(m)
        parsetime--
      }
      if (m !== '') msg = msg + m
      el.msg = msg
      el.time.setHours(18)
      el.time.setMinutes(0)
      el.time.setSeconds(i * 3)
      el.id = i
      el.uid = '#test_' + i
      el.gray = true
      this.l.push(el)
    }
    return this.l
  }
}

const ConnectLogin = {
  inject: ['msg'],
  data () {
    return {
      id: GM_getValue('PTTID', ''),
      pw: ''
    }
  },
  methods: {
    login: function () {
      if (this.id === '' || this.pw === '') {
        this.$store.dispatch('Alert', { type: 0, msg: '帳號或密碼不得為空。' })
        return
      } else if (this.PTTState > 0) {
        this.$store.dispatch('Alert', { type: 0, msg: '已經登入，請勿重複登入。' })
        return
      }
      GM_setValue('PTTID', this.id)
      const i = CryptoJS.AES.encrypt(this.id, cryptkey).toString()
      const p = CryptoJS.AES.encrypt(this.pw, cryptkey).toString()
      this.msg.PostMessage('login', { id: i, pw: p, DeleteOtherConnect: this.getDeleteOtherConnect })
    }
  },
  computed: {
    ...Vuex.mapGetters(['getDeleteOtherConnect'])
  },
  template: `<div class="form-row mt-3">
  <div class="col-5">
    <label for="PTTid">PTT ID</label>
    <input id="PTTid" type="text" class="form-control" placeholder="PTT ID" autocomplete="off" v-on:keyup.13="login"
      v-model.lazy="id">
  </div>
  <div class="col-5">
    <label for="PTTpw">PTT密碼</label>
    <input id="PTTpw" type="password" class="form-control" placeholder="PTT密碼" autocomplete="off" v-on:keyup.13="login"
      v-model.lazy="pw">
  </div>
  <div class="col-2 px-0">
    <label for="PTTlogin" class="col-2">&nbsp;</label>
    <button id="PTTlogin" class="btn ptt-btnoutline w-100" type="button" @click.self="login()">登入</button>
  </div>
</div>`
}

const ConnectLoginDeleteOtherConnect = {
  template: `<div class="form-row mb-3">
    <div class="col">
      <plugin-setting-checkbox setting-name="DeleteOtherConnect" description="刪除其他重複連線(無法登入時請開啟)" defaultValue="false">
      </plugin-setting-checkbox>
    </div>
  </div>`
}

const ConnectAID = {
  inject: ['msg', 'isStream'],
  data () {
    return {
      aid: GM_getValue('PostAID', ''),
      lastgotoAID: '',
      forceSubmit: false
    }
  },
  methods: {
    $_ConnectAID_SubmitSearch: function () {
      if (reportmode) console.log('submitAID', this.aid)
      this.$store.dispatch('gotoPost', this.aid)
      this.forceSubmit = true
    },
    $_ConnectAID_SearchPushByPostAID: function (aid) {
      const result = /#(.+) \((.+)\)/.exec(this.aid)
      if (this.post.AID === result[1] && this.post.board === result[2]) { // 相同文章取最新推文
        if (reportmode) console.log('nowAID same post', result[1], result[2], this.post.lastendline)
        this.msg.PostMessage('getPushByLine', { AID: result[1], board: result[2], startline: this.post.lastendline })
      } else if (this.isStream) { // 實況取得最近的推文
        if (reportmode) console.log('nowAID recent', result[1], result[2], 200)
        this.msg.PostMessage('getPushByRecent', { AID: result[1], board: result[2], recent: 200 })
      } else { // 實況紀錄取得所有推文
        if (reportmode) console.log('nowAID total', result[1], result[2], 0)
        this.msg.PostMessage('getPushByLine', { AID: result[1], board: result[2], startline: 0 })
      }
    }
  },
  computed: {
    nowAID: function () {
      if (this.lastgotoAID === this.gotoAID && !this.forceSubmit) return this.lastgotoAID
      this.forceSubmit = false
      this.aid = this.gotoAID
      this.lastgotoAID = this.gotoAID
      this.$_ConnectAID_SearchPushByPostAID(this.gotoAID)
      return this.lastgotoAID
    },
    ...Vuex.mapGetters([
      'post',
      'PTTState',
      'gotoAID'
    ])
  },
  template: `<div class="form-row my-3" :now-aid="nowAID">
  <label for="postAID" class="col-3 col-form-label">代碼搜尋</label>
  <div class="col">
    <input id="postAID" class="form-control" type="text" placeholder="#1VobIvqC (C_Chat)" autocomplete="off" v-model.lazy="aid" v-on:keyup.13="$_ConnectAID_SubmitSearch">
  </div>
  <div class="col-2 px-0">
    <button id="postAIDbtn" class="btn ptt-btnoutline w-100 px-2" type="button" @click.self="$_ConnectAID_SubmitSearch()">讀取</button>
  </div>
</div>`
}

const ConnectReinstancePTTBtn = {
  methods: {
    ...Vuex.mapActions([
      'reInstancePTT' // 将 `this.reInstancePTT()` 映射为 `this.$store.dispatch('reInstancePTT')`
    ])
  },
  template: `<div class="form-row my-3">
  <label class="col-3 col-form-label">重啟PTT</label>
  <div class="col-2 px-0 ml-2">
    <button id="reinstance-ptt-btn" class="btn ptt-btnoutline w-100 px-2" type="button" @click.self="reInstancePTT()">點我</button>
  </div>
  <label class="col col-form-label ml-2">PTT跑到奇怪的畫面壞掉時使用</label>
</div>
`
}

const ConnectAutoFetchPostDropDownElement = {
  inject: ['msg'],
  props: {
    settingName: { type: String, required: true },
    description: { type: String, required: true }
  },
  data () {
    return {
      optionGroup: this.checkOptionGroup(),
      dropdownPreview: null,
      board: null,
      title: null,
      connectAutoFetchPost_manualBoard: null,
      connectAutoFetchPost_manualTitle: null,
      SetingValue_previewTitle: null
    }
  },
  watch: {
    SetingValue_previewTitle: function () {
      $('#previewForm').collapse('show')
      $('#manualinputarea').collapse('hide')
      this.getPost()
    }
  },
  mounted () {
    this.msg.getAutoFetchedPostTitle = data => {
      if (this.SetingValue_previewTitle === data) {
        this.getPost()
      } else {
        this.SetingValue_previewTitle = data
      // if (reportmode) console.log("gettitle" + this.title);
      }
    }
  },
  methods: {
    $_ConnectAutoFetchPost_onClickRemoveOption (_index) {
      this.optionGroup.splice(_index, 1)
      this.$store.dispatch('setSearchTitle', this.optionGroup)
    },
    $_ConnectAutoFetchPost_onClickDropdownItem (_item, _index) {
      $('#manualinputarea').collapse('hide')
      const result = /(.+) \((.+)\)/.exec(_item)
      this.board = result[2]
      this.title = result[1]
      this.dropdownPreview = result[1] + ' (' + result[2] + ')'
      this.optionGroup.splice(0, 0, this.optionGroup.splice(_index, 1)[0])
      this.$store.dispatch('setSearchTitle', this.optionGroup)
      this.msg.PostMessage('getPostTitle', { boardforsearch: this.board, titleforsearch: this.title })
    },
    addAndSearch: function () {
      if (this.connectAutoFetchPost_manualBoard !== null && this.connectAutoFetchPost_manualTitle !== null) {
        console.log(this.optionGroup)
        this.optionGroup.unshift(this.connectAutoFetchPost_manualTitle + ' (' + this.connectAutoFetchPost_manualBoard + ')')
      } else {
        this.$store.dispatch('Alert', { type: 0, msg: '看板名稱及標題不得為空。' })
        return
      }
      if (this.PTTState < 1) {
        this.$store.dispatch('Alert', { type: 0, msg: 'PTT尚未登入，請先登入。' })
        return
      }
      this.$_ConnectAutoFetchPost_onClickDropdownItem(this.optionGroup[0])
    },
    getPost: function () {
      // if (reportmode) console.log("click AutoFetchPostBtn" + this.board + " " + this.title + " " + this.SetingValue_previewTitle);
      if (this.PTTState < 1) {
        this.$store.dispatch('Alert', { type: 0, msg: 'PTT尚未登入，請先登入。' })
        return
      }
      this.msg.PostMessage('getPushByRecent', { boardforsearch: this.board, titleforsearch: this.title, recent: 200 })
      this.$store.dispatch('gotoChat', true)
    },
    checkOptionGroup: function () {
      const option = this.$store.getters.getSearchTitle
      if (option === null || option.length === 0) {
        return [
          '直播單 (C_Chat)',
          '彩虹直播 (Vtuber)'
        ]
      } else { return option }
    }
  },
  computed: {
    DisplayOption () { return this.dropdownPreview === null ? '請選擇....' : this.dropdownPreview },
    ...Vuex.mapGetters(['PTTState'])
  },
  template: `<div class="form-group my-3">
  <div class="form-row mt-3 mb-2">
    <label class="col-3 col-form-label">{{this.description}}</label>
    <div class="col">
      <div class="dropdown">
        <button class="btn ptt-btnoutline dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true"
          aria-expanded="false">
          {{this.DisplayOption}}
        </button>
        <ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu">
          <a href="#" class="dropdown-item" v-for="(item, index) in optionGroup"
            @click.prevent="$_ConnectAutoFetchPost_onClickDropdownItem(item, index)">{{item}}<button type="button"
              @click.stop="$_ConnectAutoFetchPost_onClickRemoveOption(index)" @click.prevent
              class="close">&times;</button></a>
          <li class="dropdown-divider"></li>
          <a href="#" class="dropdown-item" data-toggle="collapse" data-target="#manualinputarea"
            @click.prevent>新增其他選項</a>
        </ul>
      </div>
    </div>
  </div>
  <div class="collapse" id="manualinputarea">
    <div class="form-row">
      <div class="col-3"></div>
      <div class="col" v-on:keyup.13="addAndSearch">
        <input type="text" class="form-control mb-1" v-model="connectAutoFetchPost_manualBoard" placeholder="看板：">
        <input type="text" class="form-control mt-1" v-model="connectAutoFetchPost_manualTitle" placeholder="標題：">
      </div>
      <div class="col-2 px-0">
        <button class="btn ptt-btnoutline w-100 px-2" type="button" @click.self="addAndSearch()">新增</button>
      </div>
    </div>
  </div>
  <div class="my-3 collapse" id="previewForm">
    <div class="form-row">
      <div class="col-3">
        <label class="col-form-label">標題預覽</label>
      </div>
      <div class="col ml-2" style="border:1px solid;">
        <div class="my-2">{{SetingValue_previewTitle}}</div>
      </div>
    </div>
  </div>
</div>`
}

const ConnectConnectSetting = {
  data () {
    return {
      DropDownList: { // empty dict of boards will be automatically hidden and grouped to 施工中
        C_Chat: {
          holo: '間直播單',
          DD串: 'DD串'
        },
        Vtuber: {
          彩虹社: '彩虹直播'
        },
        Baseball: {

        },
        LoL: {

        },
        '直播單 (C_Chat)': '直播單 (C_Chat)',
        '彩虹直播 (Vtuber)': '彩虹直播 (Vtuber)'
      }
    }
  },
  components: {
    'connect-login': ConnectLogin,
    'connect-login-delete-other-connect': ConnectLoginDeleteOtherConnect,
    'connect-aid': ConnectAID,
    'connect-reinstance-ptt-btn': ConnectReinstancePTTBtn,
    'connect-autofetchpostdropdown': ConnectAutoFetchPostDropDownElement
  },
  template: `<div class="mt-4 mb-1">
  <connect-login></connect-login>
  <connect-login-delete-other-connect></connect-login-delete-other-connect>
  <connect-aid></connect-aid>
  <connect-autofetchpostdropdown setting-name="AutoFetchPost" description="標題搜尋"></connect-autofetchpostdropdown>
  <connect-reinstance-ptt-btn></connect-reinstance-ptt-btn>
</div>`
}

Vue.component('PluginSettingInput', {
  inject: ['nowPluginWidth'],

  props: {
    settingName: { type: String, required: true },
    description: { type: String, required: true },
    defaultValue: { type: Number, required: true },
    max: { type: Number, required: true },
    min: { type: Number, required: true },
    confirmBtn: { type: Boolean, required: false },
    column: { type: Number, required: false, default: 12 }
  },
  data () {
    return {
      SettingValue: this.$store.getters['get' + this.settingName],
      ValueMax: +GM_getValue('A-custom-' + this.settingName + 'Max', -1),
      ValueMin: +GM_getValue('A-custom-' + this.settingName + 'Min', -1),
      Btn: this.confirmBtn ? this.confirmBtn : false,
      BtnID: this.settingName + '-btn',
      Col: this.column
    }
  },
  computed: {
    Classes: function () {
      let c = this.Col
      if (this.nowPluginWidth < 399) c = Math.min(this.Col * 2, 12)
      if (reportmode) console.log('Classes', this.Col, c)
      const classes = ['form-row', 'px-0', 'mx-0', 'my-2']
      if (this.nowPluginWidth < 399) classes.push('col-' + Math.min(this.Col * 2, 12))
      else classes.push('col-' + Math.min(this.Col, 12))
      return classes.join(' ')
    },
    LabelClasses: function () {
      const col = parseInt(12 / this.Col) * 3
      const classes = ['col-form-label']
      if (this.nowPluginWidth < 399) classes.push('col-12')
      else classes.push('col-' + col)
      if (reportmode) console.log('LabelClasses', this.description, classes, col)
      return classes.join(' ')
    }
  },
  mounted () {
    this.$_PluginSetting_MaxCheck()
    this.$_PluginSetting_MinCheck()
    this.$_PluginSetting_ValueCheck()
  },

  methods: {
    $_PluginSetting_update: function () {
      if (reportmode) console.log('$_PluginSetting_update', this.SettingValue)
      if (+this.SettingValue > this.ValueMax) { this.SettingValue = this.ValueMax } else if (+this.SettingValue < this.ValueMin) { this.SettingValue = this.ValueMin }

      this.$store.dispatch('set' + this.settingName, this.SettingValue)
    },
    $_PluginSetting_MaxCheck: function () {
      if (this.ValueMax < 0) {
        this.ValueMax = this.max
        GM_setValue('A-custom-' + this.settingName + 'Max', this.max)
      }
    },
    $_PluginSetting_MinCheck: function () {
      if (this.ValueMin < 0) {
        this.ValueMin = this.min
        GM_setValue('A-custom-' + this.settingName + 'Min', this.min)
      }
    },
    $_PluginSetting_ValueCheck: function () {
      if (this.SettingValue < 0) this.SettingValue = this.defaultValue
      this.$_PluginSetting_update()
    }
  },

  template:
    `<div :class="Classes">
    <label :for="settingName" :class="LabelClasses">{{this.description}}</label>
    <div class="col px-0">
      <input :id="settingName" class="form-control" type="text" :placeholder="defaultValue" autocomplete="off"
        v-on:keyup.13="$_PluginSetting_update" v-model.lazy="SettingValue">
    </div>
    <div class="col-2 pr-0" v-if="Btn">
      <button :id="BtnID" class="btn ptt-btnoutline w-100" @click.self="$_PluginSetting_update()"
        type="button">確認</button>
    </div>
  </div>`
})

Vue.component('PluginSettingCheckbox', {
  props: {
    settingName: { type: String, required: true },
    description: { type: String, required: true },
    defaultValue: { type: Boolean, required: false, default: false }
  },
  data () { return { SettingValue: this.$store.getters['get' + this.settingName] } },
  methods: {
    $_PluginSetting_valueChange: function () { this.$store.dispatch('set' + this.settingName, this.SettingValue) }
  },
  template: `<div class="form-check">
  <input type="checkbox" class="form-check-input" :id="settingName" v-model="SettingValue"
    @change="$_PluginSetting_valueChange()">
  <label class="form-check-label ml-2" :for="settingName">{{this.description}}</label>
</div>`
})

const ConnectPluginSettingBlacklist = {
  props: {
    settingName: { type: String, required: true },
    description: { type: String, required: true },
    text: { type: String, required: false }
  },
  data () { return { SettingValue: this.$store.getters['get' + this.settingName] } },
  methods: {
    $_PluginSetting_valueChange: function () { this.$store.dispatch('set' + this.settingName, this.SettingValue) }
  },
  template: `<div class="col">
    <textarea class="form-control" id="blacklist" rows="5" placeholder="一行一個ID，隱藏舊推文需重新整理" v-model="SettingValue" 
    @change="$_PluginSetting_valueChange($event)">
</textarea>
</div>`
}

/* eslint-disable no-unused-vars */

/* eslint-enable no-unused-vars */

const ConnectOtherSetting = {
  components: {
    'plugin-setting-blacklist': ConnectPluginSettingBlacklist
  },
  // mounted() { },
  template: `<div id="PTTConnect-OtherSetting" class="form-row px-0 mx-0 col-12 my-2">
  <legend class="col-form-label col-3 pt-0">其他設定</legend>
  <div class="col px-0">
    <plugin-setting-checkbox setting-name="EnableSetNewPush" description="推文功能(使用此功能後果請自負)" defaultValue="false"></plugin-setting-checkbox>
    <plugin-setting-checkbox setting-name="DisablePushGray" description="關閉灰色漸變以提升效能" defaultValue="false"></plugin-setting-checkbox>
    <div class="form-group">
    <plugin-setting-checkbox setting-name="EnableBlacklist" description="啟用黑名單功能" defaultValue="false"></plugin-setting-checkbox>
      <div class="col px-0 ml-2 mt-2">
        <plugin-setting-blacklist setting-name="Blacklist" discription="黑名單" text=""></plugun-setting-blacklist>
      </div>
    </div>
  </div>
</div>`
}

const ConnectNewVersion = {
  template: `<a id="updatebtn" class="btn ptt-btnoutline m-2 d-none"
  href="https://greasyfork.org/zh-TW/scripts/418469-youtubechatonptt" target="_blank" rel="noopener noreferrer"
  role="button">檢測到新版本</a>`
}

const ConnectDropdownElement = {
  props: {
    settingName: { type: String, required: true },
    description: { type: String, required: true },
    optionGroup: { type: Array, required: true },
    defaultValue: { type: Number, required: false, default: 0 }
  },
  data () {
    return {
      SettingValue: this.$store.getters['get' + this.settingName],
      btnid: this.settingName + 'btn',
      id: 'PTTConnect-' + this.settingName
    }
  },
  methods: {
    $_ConnectDropdownElement_Select (newOption) {
      if (newOption > this.optionGroup.length - 1) {
        // console.log(this.description + " set to length - 1", this.optionGroup.length - 1);
        this.SettingValue = this.optionGroup.length - 1
      } else if (newOption < 0) {
        // console.log(this.description + " set to defaultValue", this.defaultValue);
        this.SettingValue = this.defaultValue
      } else {
        // console.log(this.description + " set to newOption", newOption);
        this.SettingValue = newOption
      }
      this.$store.dispatch('set' + this.settingName, this.SettingValue)
    }
  },
  computed: {
    DisplayOption () { return this.optionGroup[this.SettingValue] }
  },
  mounted () {
    // console.log(this.description + " mounted", this.settingName, this.SettingValue, this.defaultValue);
    this.$_ConnectDropdownElement_Select(this.SettingValue)
  },
  template: `<div :id="id" class="form-row px-0 mx-0 col-12 my-2">
  <legend class="col-form-label col-3 pt-0">{{this.description}}</legend>
  <div class="col px-0">
    <div class="dropdown">
      <button class="btn ptt-btnoutline btn-sm dropdown-toggle" type="button" :id="btnid" data-toggle="dropdown"
        aria-haspopup="true" aria-expanded="false"> {{this.DisplayOption}} </button>
      <div class="dropdown-menu" :aria-labelledby="btnid">
        <a class="dropdown-item" href="#" @click.prevent="$_ConnectDropdownElement_Select(index)" v-for="(option, index) in optionGroup">{{option}}</a>
      </div>
    </div>
  </div>
</div>`
}

/* eslint-disable no-unused-vars */

/* eslint-enable no-unused-vars */

const ConnectPluginSetting = {
  inject: ['dynamicPlugin'],
  data () {
    return {
      ThemeOptions: ['與網站相同', '淺色主題', '深色主題', '使用者自訂']
    }
  },
  computed: {
    ThemeColorBGOptions: function () {
      const array = ['黑色']
      for (let i = 1; i < 20; i++) array.push((i * 5) + '%')
      array.push('白色')
      return array
    },
    ThemeColorBorderOptions: function () {
      const array = ['黑色']
      for (let i = 1; i < 10; i++) array.push((i * 10) + '%')
      array.push('白色')
      return array
    },
    showThemeColorOption: function () {
      // console.log("showThemeColorOption", (+this.getTheme == 3));
      return (+this.getTheme === 3)
    },
    ...Vuex.mapGetters([
      'getTheme'
    ])
  },
  components: {
    // "connect-plugin-height": ConnectPluginHeight,
    'connect-other-setting': ConnectOtherSetting,
    'connect-new-version': ConnectNewVersion,
    'connect-dropdown': ConnectDropdownElement
  },
  template: `<div class="mt-4 mb-1">
  <div class="text-center mb-2">
    <h4 class="mb-1 mt-0">套件設定</h4>
    <p class="mt-1 mb-0">輸入數值之後按Enter確認</p>
  </div>
  <div class="form-row px-2">
    <plugin-setting-input setting-name="PluginHeight" description="套件長度(px)" default-value="850" max="850" min="180"
      column="6"> </plugin-setting-input>
    <plugin-setting-input setting-name="PushInterval" description="推文更新(s)" default-value="2.5" max="360" min="2.5"
      column="6"> </plugin-setting-input>
  </div>
  <div class="form-row px-2">
    <plugin-setting-input setting-name="Fontsize" description="字體尺寸(px)" default-value="16" max="30" min="9" column="6">
    </plugin-setting-input>
    <plugin-setting-input setting-name="ChatSpace" description="推文間隔(行)" default-value="0.5" max="5" min="0"
      column="6"> </plugin-setting-input>
  </div>
  <div class="form-row px-2" v-if="dynamicPlugin">
    <plugin-setting-input setting-name="PluginWidth" description="套件寬度" default-value="400" max="800" min="290"
      column="12"> </plugin-setting-input>
    <p class="my-0 px-2">僅Holotools、niji-mado可用，需重新整理</p>
  </div>
  <div class="form-row px-2" v-if="dynamicPlugin">
    <plugin-setting-input setting-name="PluginPortraitHeight" description="直立顯示時的套件高度" default-value="400" max="800" min="290"
      column="12"> </plugin-setting-input>
    <p class="my-0 px-2">僅舊版Holotools可用，需重新整理</p>
  </div>
  <div class="form-row px-2">
    <connect-dropdown setting-name="Theme" description="主題顏色" :option-group="ThemeOptions" default-value="0">
    </connect-dropdown>
    <connect-dropdown setting-name="ThemeColorBG" description="背景亮度" :option-group="ThemeColorBGOptions"
      default-value="2" v-if="showThemeColorOption">
    </connect-dropdown>
    <connect-dropdown setting-name="ThemeColorBorder" description="字體亮度" :option-group="ThemeColorBorderOptions"
      default-value="2" v-if="showThemeColorOption">
    </connect-dropdown>
  </div>
  <div class="form-row px-2">
    <connect-other-setting></connect-other-setting>
  </div>
  <div class="form-row px-2">
    <connect-new-version></connect-new-version>
  </div>
</div>`
}

const ConnectNewVersionInfo = {
  inject: ['nowPluginWidth'],
  data () {
    return {
      versionInfos: []
    }
  },
  computed: {
    Classes: function () {
      if (this.nowPluginWidth < 399) return 'px-0'
      else return 'px-5'
    }
  },
  mounted () {
    let info
    info = [
      '新增更新日誌。',
      '新增切換顯示佈局。(holotools)',
      '新增PTT聊天室開關。(holotools)'
    ]
    this.versionInfos.push(info)
    info = [
      '支援Holodex。',
      '新增標題搜尋功能。',
      '改善holotools嵌入方式，現在可以點全部暫停上面的P隱藏套件並讓出占用的空間。',
      '修正推文失敗會導致自動更新推文失效的問題。'
    ]
    this.versionInfos.push(info)
    info = [
      '新增贊助訊息，喜歡這個套件歡迎<a id="other-btn-donations" href="https://qr.opay.tw/eZHf2" class="ptt-text" target="_blank" rel="noopener noreferrer" role="button"><u>點我贊助</u></a>。',
      '套件現階段還是不打算加入廣告。',
      '新增黑名單功能。'
    ]
    this.versionInfos.push(info)
    info = [
      '推文的Youtube連結現在也會顯示預覽圖了。',
      '新增按鈕一鍵重啟PTT。',
      '修正換串時不會換新聊天串的問題。',
      '修正連續換串(第三次以上)會壞掉的問題。',
      '推文的AID現在可以直接點擊搜尋該串推文。'
    ]
    this.versionInfos.push(info)
    info = [
      '實況紀錄現在會自動抓到開台時間了。',
      '減少推文造成的卡頓問題。'
    ]
    this.versionInfos.push(info)
  },
  template: `<div class="mt-4 mb-1">
  <div :class="Classes">
    <h4 class="text-center my-1">近期改版</h4>
    <p class="text-center my-1">完整說明請到PTT搜尋YT聊天室顯示PTT推文</p>
    <div v-for="versionInfo in versionInfos">
      <hr class="mt-1 mb-2">
      <p class="mt-1 mb-0 px-1" v-for="info in versionInfo" v-html="info"></p>
    </div>
  </div>
</div>`
}

const Connect = {
  components: {
    'connect-connect-setting': ConnectConnectSetting,
    'connect-plugin-setting': ConnectPluginSetting,
    'connect-new-version-info': ConnectNewVersionInfo
  },
  template: `<div id="PTTChat-contents-Connect-main" class="col overflow-auto h-100 mb-0 p-4" data-spy="scroll" data-offset="0">
  <connect-connect-setting></connect-connect-setting>
  <hr class="my-1">
  <connect-plugin-setting></connect-plugin-setting>
  <hr class="my-1">
  <connect-new-version-info></connect-new-version-info>
</div>`
}

const ConnectAlert = {
  inject: ['msg'],
  data () {
    return {
      al: [],
      lastAlert: null
    }
  },
  methods: {
    removeAlert (item) {
      const index = this.al.indexOf(item)
      // console.log("removeAlert: this.al,item.msg,index", this.al, item.msg, index);
      this.al.splice(index, 1)
    }
  },
  computed: {
    alertlist: function () {
      if (this.lastAlert !== this.newAlert) {
        this.lastAlert = this.newAlert
        this.al.push(this.newAlert)
      }
      return this.al
    },
    ...Vuex.mapGetters([
      'newAlert'
    ])
  },
  mounted () {
    this.msg.alert = data => {
      this.$store.dispatch('Alert', { type: data.type, msg: data.msg })
      if (showalertmsg) console.log('Alert,type: ' + data.type + ', msg: ' + data.msg)
    }
    this.lastAlert = this.newAlert
    this.al = []
  },
  template: `<div id="PTTChat-contents-Connect-alert" class="position-relative container"
  style="top:-100%; z-index:400; pointer-events: none;">
  <transition-group name="list-alert" tag="div">
    <alert-item :alert="item" :key="item" @destroyalert="removeAlert(item)" v-for="(item, index) in alertlist"> </alert-item>
  </transition-group>
</div>`
}

Vue.component('AlertItem', {
  props: { alert: { type: Object, required: true } },
  data () {
    return {
      dismissCount: 2,
      timerInterval: null
    }
  },
  computed: {
    className: function () {
      const classes = ['alert', 'mt-3', 'fade', 'show']
      if (this.alert.type === 0) { classes.push('alert-danger') } else if (this.alert.type === 1) { classes.push('alert-warning') } else if (this.alert.type === 2) { classes.push('alert-success') }
      return classes.join(' ')
    }
  },
  mounted () {
    this.timerInterval = setTimeout(this.destroy, this.dismissCount * 1000)
  },
  beforeDestroy () {
    // clearInterval(this.timerInterval);
  },
  methods: {
    CountDown: function () {
      this.dismissCount--
      if (this.dismissCount <= 0) { this.destroy() }
    },
    destroy: function () {
      this.$emit('destroyalert')
    }
  },
  template: '<div :class="className" role="alert" style="pointer-events: none;" :count="this.dismissCount"> {{this.alert.msg}}</div>'
})

const Other = {
  inject: ['nowPluginWidth'],
  computed: {
    Classes: function () {
      const classes = ['container']
      if (this.nowPluginWidth < 399) { classes.push('px-0') } else { classes.push('px-5') }
      return classes.join(' ')
    }
  },
  template: `<div id="PTTChat-contents-other-main" :class="Classes">
  <h4 class="text-center mt-3 mb-1">使用教學</h4>
  <hr class="mt-1 mb-2">
  <p class="mt-1 mb-0">1.設定紀錄檔開始的時間(實況無須設定)</p>
  <p class="mt-1 mb-0">2.輸入帳號與密碼登入PTT</p>
  <p class="mt-1 mb-0">3.在你自己的PTT找到想要同步的文章</p>
  <p class="mt-1 mb-0">4.鍵入大寫Q複製文章完整AID(例#1W0MaOkF (C_Chat))</p>
  <p class="mt-1 mb-0">5.將複製的AID貼上並讀取文章</p>
  <h4 class="text-center mt-5 mb-1">相關連結</h4>
  <hr class="mt-1 mb-2">
  <div class="text-center">
    <a id="gfbtn" class="btn ptt-btnoutline m-2 "
      href="https://github.com/zoosewu/PTTChatOnYoutube/tree/master/homepage" target="_blank" rel="noopener noreferrer"
      role="button">腳本介紹</a>
    <a id="gfbtn" class="btn ptt-btnoutline m-2" href="https://github.com/zoosewu/PTTChatOnYoutube/tree/master"
      target="_blank" rel="noopener noreferrer" role="button">github</a>
    <a id="gfbtn" class="btn ptt-btnoutline m-2 " href="https://greasyfork.org/zh-TW/scripts/418469-youtubechatonptt"
      target="_blank" rel="noopener noreferrer" role="button">greasyfork</a>
    <a id="other-btn-donations" class="btn ptt-btnoutline m-2 " href="https://qr.opay.tw/eZHf2"
      target="_blank" rel="noopener noreferrer" role="button">贊助</a>
  </div>
  <h4 class="text-center mt-5 mb-1">聲明</h4>
  <hr class="mt-1 mb-2">
  <p class="text-center mt-1 mb-0">本套件僅做PTT與Youtube的連線</p>
  <p class="text-center mt-1 mb-0">除此之外並不會連到任何伺服器</p>
  <p class="text-center mt-1 mb-0">所以不會蒐集任何關於你的資訊</p>
  <p class="text-center mt-1 mb-0">&nbsp;</p>
  <p class="text-center mt-1 mb-0">所有程式碼都沒有做任何的壓縮或混淆</p>
  <p class="text-center mt-1 mb-0">在greasyfork、github以及你的瀏覽器</p>
  <p class="text-center mt-1 mb-0">都有完整的程式碼以供任何人檢視</p>
  <p class="text-center mt-1 mb-0">&nbsp;</p>
  <p class="text-center mt-1 mb-0">請確保瀏覽實況或紀錄檔時</p>
  <p class="text-center mt-1 mb-0">沒有任何其他PTT的腳本同時啟用</p>
  <p class="text-center mt-1 mb-0">如果有的話請參閱完整網站說明並跟著操作</p>
  <p class="text-center mt-1 mb-0">&nbsp;</p>
  <p class="text-center mt-1 mb-0">本套件盡可能保證套件在操作PTT時的安全性</p>
  <p class="text-center mt-1 mb-0">並盡可能避免帳號資訊在傳輸過程中被第三方所竊取</p>
  <p class="text-center mt-1 mb-0">&nbsp;</p>
  <p class="text-center mt-1 mb-0">任何使用套件的人士 須自行承擔一切風險</p>
  <p class="text-center mt-1 mb-0">本人不會負責任何因使用此套件所造成的任何形式的損失</p>
  <p class="text-center mt-1 mb-0">&nbsp;</p>
  <p class="text-center mt-1 mb-0">使用本套件所造成任何形式的帳號損害</p>
  <p class="text-center mt-1 mb-0">包含但不限於帳號遭到竊取、推文而招致水桶或帳號註銷</p>
  <p class="text-center mt-1 mb-0">本人一概不負責</p>
  <p class="text-center mt-1 mb-0">&nbsp;</p>
  <p class="text-center mt-1 mb-0">Zoosewu</p>
</div>`
}

const PTTScreenIframe = {
  inject: ['msg'],
  data () {
    return {
      src: '//term.ptt.cc/?url=' + this.msg.ownerorigin
    }
  },
  methods: {
    removeiframe: function (event) {
      this.$el.parentNode.removeChild(this.$el)
    }
  },
  beforeCreate () {
    /* eslint-disable no-global-assign */
    cryptkey = GenerateCryptKey()
    /* eslint-enable no-global-assign */
  },
  mounted () {
    this.msg.targetWindow = this.$el.contentWindow
    window.addEventListener('beforeunload', this.removeiframe)
  },
  beforeDestroy () {
    window.removeEventListener('beforeunload', this.removeiframe)
  },
  template: `<iframe id="PTTframe" :src="src" class="h-100 flex-grow-1" style="zoom: 1.65; z-index: 351; -moz-transform: scale(1);"
   >你的瀏覽器不支援 iframe</iframe>`
}

const PTTScreen = {
  computed: {
    ...Vuex.mapGetters([
      'getInstancePTTID'
    ])
  },
  components: {
    'ptt-screen-iframe': PTTScreenIframe
  },
  template: `<div id="PTTChat-contents-PTT-main" class="h-100 d-flex justify-content-center px-0">
  <ptt-screen-iframe ref="ifm" :key="getInstancePTTID"></ptt-screen-iframe>
</div>`
}

const LogItem = {
  props: {
    itemTitle: { type: String, required: true },
    itemType: { type: String, required: true },
    itemColSpan: { type: Number, required: false },
    secondItemTitle: { type: String, required: false },
    secondItemType: { type: String, required: false }
  },
  data () {
    return {
      item1Title: this.itemTitle,
      i1Data: '--',
      i2Data: '',
      lastlog1: [],
      lastlog2: []
    }
  },
  computed: {
    item1ColSpan: function () {
      if (this.secondItemTitle) return 1
      else return this.itemColSpan ? Math.min(this.itemColSpan, 3) : 1
    },
    item2Title: function () {
      return this.secondItemTitle ? this.secondItemTitle : ''
    },
    item1Data: function () {
      if (this.lastlog1 !== this.log) {
        this.lastlog1 = this.log
        if (reportmode && showalllog) console.log('item1Data', this.itemType, this.log.type, this.itemType === this.log.type)
        if (this.itemType === this.log.type) this.i1Data = this.log.data
      }
      return this.i1Data
    },
    item2Data: function () {
      if (this.lastlog2 !== this.log) {
        this.lastlog2 = this.log
        if (reportmode && showalllog) console.log('item2Data', this.secondItemTitle, this.secondItemType, this.log.type, this.secondItemType === this.log.type)
        if (this.secondItemTitle && this.secondItemType === this.log.type) this.i2Data = this.log.data
      }
      return this.i2Data
    },
    ...Vuex.mapGetters(['log'])
  },
  mounted () {
    if (reportmode && showalllog) console.log('LogItem', this.itemTitle, this.itemType, this.itemColSpan, this.secondItemTitle, this.secondItemType)
  },
  template: `<tr>
  <th colspan="1" scope="row">{{this.item1Title}}</th>
  <td :colspan="item1ColSpan">{{this.item1Data}}</td>
  <th scope="row" v-if="secondItemTitle">{{this.item2Title}}</th>
  <td v-if="secondItemTitle">{{this.item2Data}}</td>
</tr>`
}

const LogTitle = {
  props: { title: { type: String, required: true } },
  template: '<th class="text-center bg-secondary text-white" colspan="4"> {{ this.title }}</th>'
}

const Log = {

  components: {
    'log-item': LogItem,
    'log-title': LogTitle
  },
  template: `<div class="flex-grow-1 overflow-auto h-100 w-100 mx-0 row" id="PTTChat-contents-log-main" style="overscroll-behavior: contain;">
  <table class="table ptt-bg">
    <tbody class="ptt-text">
      <log-item item-title="PTT狀態" itemType="--pagestate"></log-item>
      
      <log-title title="文章資訊"></log-title>
      <log-item item-title="文章標題" item-type="postTitle" item-col-span="3"></log-item>
      <log-item item-title="文章看板" item-type="postBoard" second-item-title="文章代碼" second-item-type="postAID"></log-item>
      <log-item item-title="推文數" item-type="--postpushcount" second-item-title="結尾行數" second-item-type="postEndline"></log-item>
      <log-item item-title="發文時間" item-type="postDate" item-col-span="3"></log-item>
      <log-item item-title="最後推文時間" item-type="--postlastpushtime" item-col-span="3"></log-item>
      
      <log-title title="詳細資訊"></log-title>
      <log-item item-title="影片類型" item-type="--videotype" second-item-title="自動獲得推文" second-item-type="--isautogetpush"></log-item>
      <log-item item-title="主題顏色" item-type="--themecolor" second-item-title=" " second-item-type=""></log-item>
      <log-item item-title="預估開台時間" item-type="videoStartTime" item-col-span="3"></log-item>
      <log-item item-title="影片播放時間" item-type="videoPlayedTime" item-col-span="3"></log-item>
      <log-item item-title="影片當下時間" item-type="videoCurrentTime" item-col-span="3"></log-item>

      <log-title title="滾動狀態"></log-title>
      <log-item item-title="目標推文樓數" item-type="--pushindex" second-item-title="目標捲動高度" second-item-type="--targetscroll"></log-item>
      <log-item item-title="現在捲動高度" item-type="--nowscroll" second-item-title="上次捲動高度" second-item-type="--lastscroll"></log-item>

      <log-title title="近期訊息"></log-title>
    </tbody>
  </table>
</div>`
}

const PTTAppContent = {
  components: {
    'PTTApp-Chat': Chat,
    'PTTApp-Alert': ConnectAlert,
    'PTTApp-Connect': Connect,
    'PTTApp-Other': Other,
    'PTTApp-PTT': PTTScreen,
    'PTTApp-Log': Log
  },
  computed: {
    updateheight () {
      return {
        height: this.$store.getters.getPluginHeight + 'px'
      }
    }
  },
  template: `<div id="PTTChat-contents" class="tab-content ptt-text" v-bind:style="updateheight">
  <!-------- 聊天室 -------->
  <div class="tab-pane h-100 w-100 mx-0 position-relative fade" id="PTTChat-contents-Chat" role="tabpanel"
    aria-labelledby="nav-item-Chat">
    <PTTApp-Chat></PTTApp-Chat>
  </div>
  <!-------- 連線設定 -------->
  <div class="tab-pane h-100 w-100 mx-0 row fade show active" id="PTTChat-contents-Connect" role="tabpanel"
    aria-labelledby="nav-item-Connect">
    <PTTApp-Connect></PTTApp-Connect>
    <PTTApp-Alert></PTTApp-Alert>
  </div>
  <!-------- 其他 -------->
  <div class="tab-pane h-100 w-100 mx-0 bg-transparent overflow-auto row fade" id="PTTChat-contents-other" role="tabpanel"
    aria-labelledby="nav-item-other">
    <PTTApp-Other></PTTApp-Other>
  </div>
  <!-------- PTT畫面 -------->
  <div class="tab-pane h-100 row fade" id="PTTChat-contents-PTT" role="tabpanel" aria-labelledby="nav-item-PTT">
    <PTTApp-PTT></PTTApp-PTT>
  </div>
  <!-------- Log -------->
  <div class="tab-pane h-100 w-100 mx-0 fade" id="PTTChat-contents-log" role="tabpanel" aria-labelledby="nav-item-log"
    style="overscroll-behavior: contain;">
    <PTTApp-Log></PTTApp-Log>
  </div>
</div>`
}

const PTTAppMain = {
  template: `<div id="PTTChat-app" class="ptt-bg ptt-border rounded w-100 d-flex flex-column">
  <PTTAppNav></PTTAppNav>
  <PTTAppContent></PTTAppContent>
  </div>`,
  components: {
    PTTAppNav: PTTAppNav,
    PTTAppContent: PTTAppContent
  }
}

const PTTApp = {
  template: `<div id="PTTMain" class="pttchat rounded-right position-absolute rounded-bottom w-100 collapse" style="z-index: 301;">
  <PTTAppMain></PTTAppMain>
  </div>`,
  components: {
    PTTAppMain: PTTAppMain
  }
}

const PTTAppBtn = {
  template: '<a id="PTTMainBtn" class="btn btn-lg ptt-btnoutline position-absolute"  style="z-index: 400;" type="button" data-toggle="collapse" data-target="#PTTMain" aria-expanded="false" aria-controls="PTTMain">P</a>'
}

const types = {
  INCREASE: 'INCREASE',
  DECREASE: 'DECREASE',
  PTTID: 'PTTID',
  POSTAID: 'LastPostAID',
  ALERT: 'Alert',
  GOTOPOST: 'GOTOPOST',
  PUSHDATA: 'PushData',
  UPDATEPOST: 'UpdatePost',
  UPDATECHAT: 'Updatechatlist',
  UPDATELOG: 'UpdateLog',
  VIDEOSTARTDATE: 'VIDEOSTARTDATE',
  VIDEOPLAYEDTIME: 'VIDEOPLAYEDTIME',
  VIDEOCURRENTRIME: 'VIDEOCURRENTRIME',
  PAGECHANGE: 'PAGECHANGE',
  GOTOCHAT: 'GOTOCHAT',
  PTTSTATE: 'PTTSTATE',
  ISSTREAM: 'ISSTREAM',
  PREVIEWIMG: 'PREVIEWIMG',
  REINSTANCEPTT: 'REINSTANCEPTT',
  // checkbox
  ENABLESETNEWPUSH: 'EnableSetNewPush',
  DISABLEPUSHGRAY: 'DisablePushGray',
  DELETEOTHERCONNECT: 'DeleteOtherConnect',
  ENABLEBLACKLIST: 'EnableBlacklist',
  // input value
  PLUGINHEIGHT: 'PluginHeight',
  CHATFONTSIZE: 'Fontsize',
  CHATSPACE: 'ChatSpace',
  PUSHINTERVAL: 'PushInterval',
  PLUGINWIDTH: 'PluginWidth',
  PLUGINPORTRAITHEIGHT: 'PluginPortraitHeight',
  BLACKLIST: 'Blacklist',
  // dropdown
  THEME: 'Theme',
  THEMECOLORBG: 'ThemeColorBG',
  THEMECOLORBORDER: 'ThemeColorBorder',
  SEARCHTITLE: 'SearchTitle'
}

// state
const state = {
  count: 0,
  alert: { type: 0, msg: '' },
  aid: '',
  post: { AID: '', board: '', title: '', date: (() => { const t = new Date(); t.setHours(0); t.setMinutes(0); t.setSeconds(0); return t })(), lastendline: 0, lastpushtime: new Date(), pushcount: 0, nowpush: 0, gettedpost: false },
  chatlist: [],
  log: {},
  firstChatTime: {},
  lastChatTime: {},
  VStartDate: (() => { const t = new Date(); t.setHours(0); t.setMinutes(0); t.setSeconds(0); return t })(),
  VPlayedTime: 0,
  VCurrentTime: new Date(),
  pageChange: false,
  gotoChat: false,
  PTTState: 0,
  isStream: true,
  previewImg: '',
  InstancePTTID: 1,
  // checkbox
  enablesetnewpush: GM_getValue(types.ENABLESETNEWPUSH, false),
  disablepushgray: GM_getValue(types.DISABLEPUSHGRAY, false),
  deleteotherconnect: GM_getValue(types.DELETEOTHERCONNECT, false),
  enableblacklist: GM_getValue(types.ENABLEBLACKLIST, false),
  // input value
  pluginHeight: GM_getValue(types.PLUGINHEIGHT, -1),
  pushInterval: GM_getValue(types.PUSHINTERVAL, -1),
  chatFontsize: GM_getValue(types.CHATFONTSIZE, -1),
  chatSpace: GM_getValue(types.CHATSPACE, -1),
  pluginWidth: GM_getValue(types.PLUGINWIDTH, -1),
  pluginPortraitHeight: GM_getValue(types.PLUGINPORTRAITHEIGHT, -1),
  blacklist: GM_getValue(types.BLACKLIST, null),
  // dropdown
  theme: GM_getValue(types.THEME, -1),
  themeColorBG: GM_getValue(types.THEMECOLORBG, -1),
  themeColorBorder: GM_getValue(types.THEMECOLORBORDER, -1),
  searchTitle: GM_getValue(types.SEARCHTITLE, null)
}
// mutations
const mutations = {
  // action 發出 commit 會對應到 mutation 使用的是 Object key 方式
  [types.INCREASE] (state) {
    // 在 mutation 改變 state（只有 mutation 可以改變！）
    state.count += 1
  },
  [types.DECREASE] (state) {
    state.count -= 1
  },
  [types.ALERT] (state, alert) {
    state.alert = alert
  },
  [types.GOTOPOST] (state, aid) {
    state.aid = aid
  },
  [types.UPDATEPOST] (state, post) {
    if (reportmode) console.log('UPDATEPOST', post)
    state.post = post
  },
  [types.UPDATECHAT] (state, chatlist) {
    if (reportmode) console.log('UPDATECHAT', chatlist)
    state.chatlist = chatlist
  },
  [types.UPDATELOG] (state, log) {
    if (reportmode) console.log('UPDATELOG', log)
    state.log = log
  },
  [types.VIDEOSTARTDATE] (state, videostartdate) {
    console.trace('VIDEOSTARTDATE mutations', videostartdate)
    state.VStartDate = videostartdate
  },
  [types.VIDEOPLAYEDTIME] (state, videoplayedtime) {
    state.VPlayedTime = videoplayedtime
  },
  [types.VIDEOCURRENTRIME] (state, vcurrentime) {
    state.VCurrentTime = vcurrentime
  },
  [types.PAGECHANGE] (state, pageChange) {
    state.pageChange = pageChange
  },
  [types.GOTOCHAT] (state, gotoChat) {
    state.gotoChat = gotoChat
  },
  [types.PTTSTATE] (state, pttstate) {
    state.PTTState = pttstate
  },
  [types.ISSTREAM] (state, isStream) {
    state.isStream = isStream
  },
  [types.PREVIEWIMG] (state, src) {
    state.previewImg = src
  },
  [types.REINSTANCEPTT] (state) {
    state.InstancePTTID++
  },

  // checkbox
  [types.DELETEOTHERCONNECT] (state, deleteotherconnect) {
    GM_setValue(types.DELETEOTHERCONNECT, deleteotherconnect)
    state.deleteotherconnect = deleteotherconnect
  },
  [types.ENABLESETNEWPUSH] (state, value) {
    GM_setValue(types.ENABLESETNEWPUSH, value)
    state.enablesetnewpush = value
  },
  [types.DISABLEPUSHGRAY] (state, disable) {
    GM_setValue(types.DISABLEPUSHGRAY, disable)
    state.disablepushgray = disable
  },
  [types.ENABLEBLACKLIST] (state, enable) {
    GM_setValue(types.ENABLEBLACKLIST, enable)
    state.enableblacklist = enable
  },
  // input value
  [types.PLUGINHEIGHT] (state, height) {
    GM_setValue(types.PLUGINHEIGHT, height)
    state.pluginHeight = height
  },
  [types.PUSHINTERVAL] (state, interval) {
    GM_setValue(types.PUSHINTERVAL, interval)
    state.pushInterval = interval
  },
  [types.CHATFONTSIZE] (state, size) {
    GM_setValue(types.CHATFONTSIZE, size)
    state.chatFontsize = size
  },
  [types.CHATSPACE] (state, space) {
    GM_setValue(types.CHATSPACE, space)
    state.chatSpace = space
  },
  [types.PLUGINWIDTH] (state, width) {
    GM_setValue(types.PLUGINWIDTH, width)
    state.pluginWidth = width
  },
  [types.PLUGINPORTRAITHEIGHT] (state, portraitHeight) {
    GM_setValue(types.PLUGINPORTRAITHEIGHT, portraitHeight)
    state.pluginPortraitHeight = portraitHeight
  },
  [types.BLACKLIST] (state, list) {
    const l = list.toLowerCase()
    GM_setValue(types.BLACKLIST, l)
    state.blacklist = l
  },
  // dropdown
  [types.THEME] (state, theme) {
    GM_setValue(types.THEME, theme)
    state.theme = theme
  },
  [types.THEMECOLORBG] (state, themecolorbg) {
    GM_setValue(types.THEMECOLORBG, themecolorbg)
    state.themeColorBG = themecolorbg
  },
  [types.THEMECOLORBORDER] (state, themecolorborder) {
    GM_setValue(types.THEMECOLORBORDER, themecolorborder)
    state.themeColorBorder = themecolorborder
  },
  [types.SEARCHTITLE] (state, list) {
    GM_setValue(types.SEARCHTITLE, list)
    state.searchTitle = list
  }
}

const getters = {
  getCount: state => { return state.count },
  newAlert: state => { return state.alert },
  gotoAID: state => { return state.aid },
  log: state => { return state.log },
  post: state => { return state.post },
  newChatList: state => { return state.chatlist },
  videoCurrentTime: state => { return state.VCurrentTime },
  gotoChat: state => { return state.gotoChat },
  PTTState: state => { return state.PTTState }, // PTT頁面狀態 0未登入畫面 1主畫面 2看板畫面 3文章畫面第一頁 4文章畫面其他頁
  previewImage: state => { return state.previewImg },
  getInstancePTTID: state => { return state.InstancePTTID },

  // checkbox
  getEnableSetNewPush: state => { /* console.log("EnableSetNewPush getter",state.enablesetnewpush); */ return state.enablesetnewpush },
  getDisablePushGray: state => { return state.disablepushgray },
  getDeleteOtherConnect: state => { return state.deleteotherconnect },
  getEnableBlacklist: state => { return state.enableblacklist },
  // input value
  getPluginHeight: state => { return state.pluginHeight },
  getFontsize: state => { return state.chatFontsize },
  getChatSpace: state => { return state.chatSpace },
  getPushInterval: state => { return state.pushInterval },
  getPluginWidth: state => { return state.pluginWidth },
  getPluginPortraitHeight: state => { return state.pluginPortraitHeight },
  getBlacklist: state => { return state.blacklist },
  // dropdown
  getTheme: state => { return state.theme },
  getThemeColorBG: state => { return state.themeColorBG },
  getThemeColorBorder: state => { return state.themeColorBorder },
  getSearchTitle: state => { return state.searchTitle }
}

const actions = {
  actionIncrease: ({ commit }) => { console.log('actionIncrease'); commit(types.INCREASE) },
  actionDecrease: ({ commit }) => { console.log('actionDecrease'); commit(types.DECREASE) },
  Alert: (context, alertobject) => { context.commit(types.ALERT, alertobject) },
  gotoPost: ({ dispatch, commit, state }, aid) => {
    const result = /#(.+) \((.+)\)/.exec(aid)
    if (!result || result.length <= 2) {
      dispatch('Alert', { type: 0, msg: '文章AID格式錯誤，請重新輸入。' })
    } else if (state.PTTState < 1) {
      dispatch('Alert', { type: 0, msg: 'PTT尚未登入，請先登入。' })
    } else {
      GM_setValue('PostAID', aid)
      dispatch('pageChange', true)
      commit(types.GOTOPOST, aid)
    }
  },
  updateLog: (context, log) => {
    if (!Array.isArray(log)) context.commit(types.UPDATELOG, log)
    else for (let i = 0; i < log.length; i++) context.commit(types.UPDATELOG, log[i])
  },
  updatePost: ({ dispatch, commit, state }, postdata) => {
    let newpost
    if (postdata.AID === state.post.AID && postdata.board === state.post.board) {
      newpost = state.post
      newpost.lastendline = postdata.endline
    } else {
      newpost = {
        AID: postdata.AID,
        board: postdata.board,
        title: postdata.title,
        date: postdata.posttime,
        lastendline: postdata.endline,
        lastpushtime: new Date(),
        pushcount: 0,
        nowpush: 0,
        gettedpost: true
      }
      const t = newpost.date
      dispatch('updateLog', { type: 'postAID', data: newpost.AID })
      dispatch('updateLog', [{ type: 'postBoard', data: newpost.board },
        { type: 'postTitle', data: newpost.title },
        { type: 'postDate', data: t.toLocaleDateString() + ' ' + t.toLocaleTimeString() },
        { type: 'postEndline', data: newpost.lastendline }])
    }
    if (postdata.pushes.length > 0) {
      newpost.pushcount += postdata.pushes.length
    }
    commit(types.UPDATEPOST, newpost)
    dispatch('updateChat', postdata.pushes)
    // console.log("state.pageChange", state.pageChange);
    if (state.pageChange) {
      dispatch('gotoChat', true)
      dispatch('pageChange', false)
    }
  },
  updateChat: ({ commit, state }, pushes) => {
    const existpush = state.post.pushcount - pushes.length
    const chatlist = []
    let sametimecount = 0
    let sametimeIndex = 0
    for (let index = 0; index < pushes.length; index++) {
      const currpush = pushes[index]// 抓出來的推文
      const chat = {}
      if (!state.isStream) {
        if (index >= sametimeIndex) { // 獲得同時間點的推文數量
          for (let nextpointer = index + 1; nextpointer < pushes.length; nextpointer++) {
            const element = pushes[nextpointer]
            // console.log("currpush.date.getTime(), element.date.getTime()", currpush.date.getTime(), element.date.getTime());
            if ((currpush.date.getTime() < element.date.getTime()) || (nextpointer >= pushes.length - 1)) {
              sametimeIndex = nextpointer
              sametimecount = nextpointer - index
              // console.log("sametimeIndex, sametimecount", sametimeIndex, sametimecount);
              break
            }
          }
        }
      }
      chat.time = new Date(currpush.date.getTime())
      // console.log("sametimeIndex, index, sametimecount", sametimeIndex, index, sametimecount);
      if (!state.isStream && sametimecount > 0) chat.time.setSeconds((sametimecount + index - sametimeIndex) * 60 / sametimecount)
      chat.pttid = currpush.id
      chat.type = currpush.type
      // chat.msg = currpush.content;
      let msg = ''
      let m = filterXSS(currpush.content)
      const haveAID = /(.*)(#.{8} \(.+\))(.*)/.exec(m)
      if (haveAID && haveAID.length > 3) {
        m = haveAID[1] + '<u onclick="this.parentNode.gotoPost(`' + haveAID[2] + '`)" style="cursor: pointer;">' + haveAID[2] + '</u>' + haveAID[3]
        console.log(haveAID[1] + '<u onclick="this.parentNode.gotoPost(' + haveAID[2] + ')">' + haveAID[2] + '</u>' + haveAID[3])
      }
      let result = /(.*?)(\bhttps?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])(.*)/ig.exec(m)
      let parsetime = 5
      while (result && m !== '' && parsetime > 0) {
        const prestring = result[1]
        const linkstring = result[2]
        if (prestring !== '') msg = msg + prestring
        msg = msg + '<a href="' + linkstring + '" target="_blank" rel="noopener noreferrer" class="ptt-chat-msg" ref="link' + (5 - parsetime) + '" onmouseover="this.parentNode.mouseEnter(this.href)" onmouseleave="this.parentNode.mouseLeave(this.href)">' + linkstring + '</a>'
        m = result[3]
        result = /(.*?)(\bhttps?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])(.*)/ig.exec(m)
        parsetime--
      }
      if (m !== '') msg = msg + m
      chat.msg = msg
      chat.id = existpush + index
      chat.uid = state.post.AID + '_' + chat.id
      chat.gray = !state.disablepushgray
      if (state.enableblacklist) {
        const list = state.blacklist.split('\n')
        const id = chat.pttid.toLowerCase()
        for (let index = 0; index < list.length; index++) {
          if (id === list[index]) {
            chat.pttid = '隱藏的使用者'
            chat.msg = ''
            chat.type = '→ '
          }
        }
      }
      chatlist.push(chat)
      if (reportmode) console.log('new Chat', chat, currpush)
    }
    // console.log("chatlist actions", chatlist);
    commit(types.UPDATECHAT, chatlist)
  },
  updateVideoStartDate: ({ dispatch, commit, state }, d) => {
    console.trace('updateVideoStartDate', d)
    dispatch('updateLog', { type: 'videoStartTime', data: d.toLocaleDateString() + ' ' + d.toLocaleTimeString() })
    commit(types.VIDEOSTARTDATE, d)
    dispatch('updateVideoCurrentTime')
  },
  updateVideoPlayedTime: ({ dispatch, commit, state }, time) => {
    // console.log("updateVideoPlayedTime", time);
    commit(types.VIDEOPLAYEDTIME, time)
    dispatch('updateLog', { type: 'videoPlayedTime', data: time })
    dispatch('updateVideoCurrentTime')
  },
  updateVideoCurrentTime: ({ dispatch, commit, state }) => {
    const vstart = state.VStartDate
    const time = state.VPlayedTime// [H,m,s,isVideoVeforePost]
    const currtime = new Date(vstart.valueOf())
    currtime.setSeconds(vstart.getSeconds() + time)
    if (reportmode) console.log('updateVideoCurrentTime check, currtime.valueOf() < state.post.date.valueOf()', currtime.valueOf() < state.post.date.valueOf(), currtime.valueOf(), state.post.date.valueOf())
    // console.log("updateVideoCurrentTime vstart, time, currtime", vstart, time, currtime);
    dispatch('updateLog', { type: 'videoCurrentTime', data: currtime.toLocaleDateString() + ' ' + currtime.toLocaleTimeString() })
    commit(types.VIDEOCURRENTRIME, currtime)
  },
  pageChange: ({ commit }, Change) => { commit(types.PAGECHANGE, Change) },
  gotoChat: ({ commit }, gtChat) => { commit(types.GOTOCHAT, gtChat) },
  PTTState: ({ commit }, pttstate) => { commit(types.PTTSTATE, pttstate) },
  isStream: ({ commit }, isStream) => { commit(types.ISSTREAM, isStream) },
  previewImage: ({ commit }, src) => { commit(types.PREVIEWIMG, src) },
  reInstancePTT: ({ commit }) => commit(types.REINSTANCEPTT),

  // checkbox
  setEnableSetNewPush: ({ commit }, value) => { /* console.log("EnableSetNewPush action",value); */commit(types.ENABLESETNEWPUSH, value) },
  setDisablePushGray: ({ commit }, value) => { commit(types.DISABLEPUSHGRAY, value) },
  setDeleteOtherConnect: ({ commit }, value) => { commit(types.DELETEOTHERCONNECT, value) },
  setEnableBlacklist: ({ commit }, value) => { commit(types.ENABLEBLACKLIST, value) },
  // input value
  setPluginHeight: (context, value) => { context.commit(types.PLUGINHEIGHT, value) },
  setFontsize: ({ commit }, value) => { commit(types.CHATFONTSIZE, value) },
  setChatSpace: ({ commit }, value) => { commit(types.CHATSPACE, value) },
  setPushInterval: ({ commit }, value) => { commit(types.PUSHINTERVAL, value) },
  setPluginWidth: ({ commit }, value) => { commit(types.PLUGINWIDTH, value) },
  setPluginPortraitHeight: ({ commit }, value) => { commit(types.PLUGINPORTRAITHEIGHT, value) },
  setBlacklist: ({ commit }, value) => { commit(types.BLACKLIST, value) },
  // dropdown
  setTheme: ({ commit }, value) => { commit(types.THEME, value) },
  setThemeColorBG: ({ commit }, value) => { commit(types.THEMECOLORBG, value) },
  setThemeColorBorder: ({ commit }, value) => { commit(types.THEMECOLORBORDER, value) },
  setSearchTitle: ({ commit }, value) => { commit(types.SEARCHTITLE, value) }
}

Vue.use(Vuex)

const store = new Vuex.Store({
  state,
  mutations,
  getters,
  actions,

  // 嚴格模式，禁止直接修改 state
  strict: true
})

function InitApp (chatcon, whitetheme, isstreaming, messageposter, dynamicPlugin = false) {
  // generate crypt key everytime;
  InitChatApp(chatcon)
  function InitChatApp (cn) {
    /* -----------------------------------preInitApp----------------------------------- */
    // init property
    const ele = document.createElement('div')
    ele.id = 'PTTChat'
    ele.setAttribute('style', 'z-index: 301;')
    if (cn) cn[0].appendChild(ele)
    // Vue.prototype.$bus = new Vue();
    const themewhite = 'pttbgc-19 pttc-5'
    const themedark = 'pttbgc-2 pttc-2'
    // const color = whitetheme ? 'pttbgc-19 pttc-5' : 'pttbgc-2 pttc-2'
    console.log('Instance PTTChatOnYT App, index', appinscount)
    const PTT = new Vue({
      el: '#PTTChat',

      store,
      components: {
        PTTAppBtn: PTTAppBtn,
        PTTApp: PTTApp
      },
      provide: function () {
        return {
          msg: this.rootmsg,
          isStream: isstreaming,
          nowPluginWidth: cn[0].offsetWidth,
          dynamicPlugin: dynamicPlugin
        }
      },
      data () {
        return {
          index: appinscount,
          rootmsg: messageposter,
          player: document.getElementsByTagName('video')[0],
          playertime: null,
          exist: null
        }
      },
      computed: {
        classes: function () {
          const classes = ['position-absolute', 'w-100']
          if (reportmode) console.log('Appindex set theme', this.getTheme)
          switch (+this.getTheme) {
            case 0:
              if (whitetheme) classes.push(themewhite)
              else classes.push(themedark)
              break
            case 1:
              classes.push(themewhite)
              break
            case 2:
              classes.push(themedark)
              break
            case 3:
              classes.push('pttbgc-' + this.getThemeColorBG)
              classes.push('pttc-' + (10 - this.getThemeColorBorder))
              break
            default:
              break
          }
          return classes.join(' ')
        },
        ...Vuex.mapGetters([
          'getTheme',
          'getThemeColorBG',
          'getThemeColorBorder'
        ])
      },

      mounted () {
        /* eslint-disable no-global-assign */
        appinscount++
        /* eslint-enable no-global-assign */
        this.playertime = window.setInterval(() => {
          if (this.player) this.$store.dispatch('updateVideoPlayedTime', this.player.currentTime)
          else clearInterval(this.playertime)
        }, 1000)
        this.exist = window.setInterval(() => {
          const self = document.querySelector('#PTTChat[ins="' + this.index + '"')
          if (!self) {
            console.log('Instance ' + this.index + ' destroyed.')
            PTT.$destroy()
          } else { // console.log("Instance " + this.index + " alive.");
          }
        }, 1000)
        this.$store.dispatch('isStream', isstreaming)
        if (!isstreaming) {
          try {
            const videoinfo = JSON.parse(document.getElementById('scriptTag').innerHTML)
            if (reportmode) console.log('videoinfo', videoinfo)
            const startDate = new Date(videoinfo.publication[0].startDate)
            if (reportmode) console.log('startDate', startDate)
            this.$store.dispatch('updateVideoStartDate', startDate)
          } catch (e) {
            console.log(e)
          }
        }

        this.rootmsg.PTTState = data => { this.$store.dispatch('PTTState', data) }
      },
      beforeDestroy () {
        console.log('beforeDestroy', this)
        clearInterval(this.playertime)
        clearInterval(this.exist)
      },
      template: `<div id="PTTChat" :class="classes" :ins="index">
      <PTTAppBtn></PTTAppBtn>
      <PTTApp></PTTApp>
    </div>`
    })
  }
}

function ChangeLog () {
  function GetPTTChangeLogURL () {
    return 'https://www.ptt.cc/bbs/C_Chat/M.1621163470.A.1DD.html'
  }

  function AddChangeLogInfo () {
    const changeLogInfo = {}

    changeLogInfo.v_2_8 = new Info()
    changeLogInfo.v_2_8.HoloTools.push('修復在新版HoloTools中無法使用的問題。')
    changeLogInfo.v_2_8.HoloTools.push('已支援新版HoloTools聊天室開關、佈局切換。')
    changeLogInfo.v_2_8.HoloTools.push('修正開台數多時會擋住增加指定影片按鈕的問題。')
    changeLogInfo.v_2_8.版本.push('修復PTT新式游標在搜尋超過五位數文章數時會發生錯誤的問題。')
    changeLogInfo.v_2_8.版本.push('修復在同看板使用同標題搜尋時不會更新標題預覽及跳轉至聊天室的問題。')
    // changeLogInfo.v_2_8.版本.push('修復在PTT卡住後無法再使用標題搜尋功能的問題。')
    changeLogInfo.v_2_8.版本.push('支援回文、轉文的搜尋。')
    changeLogInfo.v_2_8.版本.push('修正若干css問題。')
    changeLogInfo.v_2_8.版本.push('修正網站原生對話框(如結帳頁面)會錯誤的問題。')

    changeLogInfo.v_2_7 = new Info()
    changeLogInfo.v_2_7.HoloTools.push('(舊版)在右上方控制列中新增<strong>PTT聊天室開關</strong>與<strong>切換顯示佈局按鈕</strong>。<br>')
    changeLogInfo.v_2_7.HoloTools.push('<p><b>PTT聊天室開關</b>：<br>&emsp;&emsp;現在可以在不用時完全隱藏PTT聊天室，回復佔用的空間。</p>')
    changeLogInfo.v_2_7.HoloTools.push('<p><b>切換顯示佈局按鈕</b>：<br>&emsp;&emsp;支援直立式螢幕顯示，將聊天室移到底部。</p>')
    changeLogInfo.v_2_7.版本.push('新增更新日誌，套件更新時會顯示更新資訊，並且可以點擊閱讀更多按鈕查看更新說明文章。')

    changeLogInfo.v_2_6 = new Info()
    changeLogInfo.v_2_6.版本.push('新增黑名單功能。')
    changeLogInfo.v_2_6.版本.push('新增標題搜尋功能。')
    changeLogInfo.v_2_6.HoloDex.push('支援HoloDex。')

    return changeLogInfo
  }

  const previousVersion = GM_getValue('previousVersion', '2.5.0').split('.')
  const nowVerion = GM_info.script.version.split('.')
  if (nowVerion[0] === previousVersion[0] && nowVerion[1] === previousVersion[1]) return
  class Info { constructor () { this.版本 = []; this.HoloDex = []; this.HoloTools = []; this.Twitch = []; this.Nijimado = []; this.Youtube = [] } }
  const allChangeLogInfo = AddChangeLogInfo()
  const changeLogInfo = GetChangeLogInfo(new Info(), +previousVersion[0], +previousVersion[1] + 1)
  const changeLogHTML = EncodeChangeLog(changeLogInfo)
  const PTTChangeLogURL = GetPTTChangeLogURL()

  const modal = $(`
    <div id="PTTChangeLog" class="pttmodal fade" data-backdrop="static" data-keyboard="false" tabindex="-1" aria-hidden="true" style="color: #000">
      <div class="pttmodal-dialog modal-dialog pttmodal-dialog-centered">
        <div class="pttmodal-content">
          <div class="pttmodal-header">
            <h4 class="pttmodal-title">PTTChatOnYoutube更新日誌</h4>
          </div>
          <div class="pttmodal-body">
              ${changeLogHTML}
          </div>
          <div class="pttmodal-footer">
          <a href="${PTTChangeLogURL}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" type="button">閱讀更多</a>
          <button type="button" class="btn btn-primary" data-dismiss="modal">關閉</button>
          </div>
        </div>
      </div>
    </div>`)
  $('body').append(modal)
  $('#PTTChangeLog').modal('show')
  GM_setValue('previousVersion', GM_info.script.version)

  function GetChangeLogInfo (info, major, minor) {
    const newInfo = allChangeLogInfo['v_' + major + '_' + minor]
    if (+minor > nowVerion[1] && +major > nowVerion[0]) return info
    if (newInfo !== undefined) {
      for (const key in newInfo) {
        info[key] = info[key].concat(newInfo[key])
      }
    }
    if ((+minor + 1) <= nowVerion[1]) return GetChangeLogInfo(info, +major, +minor + 1)
    if ((+major + 1) <= nowVerion[0]) return GetChangeLogInfo(info, +major + 1, 0)
    return info
  }

  function EncodeChangeLog (log) {
    let logHTML = ''
    for (const key in log) {
      if (log[key].length !== 0) {
        let tmp = ''
        for (let index = 0; index < log[key].length; index++) {
          tmp = String.prototype.concat(tmp, `<li>${log[key][index]}</li>`)
        }
        logHTML = String.prototype.concat(logHTML, `<div style="margin: 5px 0px"><b>${key}：</b>`)
        if (key === '版本') logHTML = String.prototype.concat(logHTML, `${GM_info.script.version}`)
        logHTML = String.prototype.concat(logHTML, '<ul style="margin: 2px 0px;padding-left: 30px;">', tmp, '</ul></div>')
      }
    }
    return logHTML
  }
}

function InitYT (messageposter) {
  const msg = messageposter
  // Check Theme
  const WhiteTheme = ThemeCheck('html', 'rgb(249, 249, 249)');

  (function CheckChatInstanced () {
    if (/www\.youtube\.com\/watch\?v=/.exec(window.location.href) === null) {
      if (showalllog) console.log('not watch video.')
      setTimeout(CheckChatInstanced, 2000)
      return
    }
    const ChatContainer = $('ytd-live-chat-frame')
    const defaultChat = $('iframe', ChatContainer)
    const PTTApp = $('#PTTChat', ChatContainer)
    if (PTTApp.length > 0) {
      if (showalllog) console.log('PTTApp already instanced.')
      setTimeout(CheckChatInstanced, 5000)
    } else if (defaultChat.length > 0) {
      if (showalllog) console.log('PTTApp frame instance!')
      ChatContainer.css({ position: 'relative' })

      // 生出套件
      const isstream = checkvideotype()
      InitApp(ChatContainer, WhiteTheme, isstream, msg)
      ChangeLog()
      setTimeout(CheckChatInstanced, 5000)
    } else {
      if (showalllog) console.log('watching video without chatroom.')
      setTimeout(CheckChatInstanced, 5000)
    }
  })()
  function checkvideotype () {
    const streambtncss = $('.ytp-live-badge').css('display')
    const logstr = ['$(\'.ytp-live-badge\').css("display")', streambtncss]
    if (!simulateisstreaming) {
      if (streambtncss === 'inline-block') {
        console.log('This video is streaming.', logstr)
        return true
        // $(`#PTTConnect-Time-Setting`).addClass('d-none');
      } else if (streambtncss === 'none') {
        console.log('This video is not streaming.', logstr)
        return false
      }
    }
  }
}

const ytfilter = InsFilter('Youtube', /www\.youtube\.com/, 'https://www.youtube.com', InitYT)

function InitHT (messageposter) {
  // Check Theme
  const WhiteTheme = ThemeCheck('html', '250, 250, 250')

  // run app instance loop
  let waswatch
  let iswatch
  let tryinsholotools = 20;

  (function ChechChatInstanced () {
    setTimeout(ChechChatInstanced, 1000)
    const watchcheck = /https:\/\/hololive\.jetri\.co\/#\/ameliawatchon/.exec(window.location.href) || /https:\/\/hololive\.jetri\.co\/#\/watch/.exec(window.location.href)
    if (watchcheck) iswatch = watchcheck[0]
    else iswatch = false
    if (waswatch !== iswatch && iswatch) {
      tryinsholotools = 20
    }
    if (tryinsholotools >= 0) {
      TryInsChat()
    }
    waswatch = iswatch
  })()
  function TryInsChat () {
    const parent = $('.container-watch')
    const theme = $('html:eq(0)').hasClass('md-theme-hololight') ? 'hololight' : 'holodark'
    const fakeparent = $('<div id="fakeparent" class="d-flex flex-row"></div>')
    const defaultVideoHandler = $('<div id="holotoolsvideohandler" style="flex:1 1 auto;"></div>')
    const defaultVideo = $('.player-container.hasControls')
    const PTTChatHandler = $('<div id="pttchatparent" class="p-0 d-flex" style="flex:0 0 0px;position:relative;"></div>')
    if (reportmode) console.log('parent', parent)
    if (parent.length > 0 && iswatch) {
      const pluginwidth = GM_getValue('PluginWidth', 400)
      const pluginheight = GM_getValue('PluginHeight', 400)
      const pluginportraitheight = GM_getValue('PluginPortraitHeight', 400)
      const pluginwidth0 = '0'
      const liveControls = $('.live-controls')
      liveControls.css('width', 'auto')
      const datahash = Object.keys(liveControls.data())[0]
      const iconParent = $(`<div data-${datahash} class="live-control live-control-double bg-300" type="button"></div>`)
      const iconFlex = $(`<div data-${datahash} class="live-control-button"><i data-${datahash} class="md-icon md-icon-font md-theme-${theme}" title="切換PTT顯示佈局">library_books</i></div>`)
      const iconPTT = $(`<div data-${datahash} class="live-control-button"><i data-${datahash} class="md-icon md-icon-font md-theme-${theme}" title="PTT">local_parking</i></div>`)
      iconParent.append(iconFlex, iconPTT)
      liveControls.prepend(iconParent)
      if (/https:\/\/hololive\.jetri\.co\/#\/watch/.exec(iswatch)) {
        $('.md-layout.live-videos').css({ 'margin-right': '-40px', 'padding-right': '40px' })
      } else if ((/https:\/\/hololive\.jetri\.co\/#\/ameliawatchon/.exec(iswatch))) {
        $('.md-layout.live-videos').css({ 'max-width': 'calc(100% - 385px)' })
      }
      let now = pluginwidth0
      let collapseStart = false
      let collapseEnd = true
      let isChatOnen = false
      let enablePortaitMode = false
      const containerHeight = defaultVideo.height()
      function defaultSetting () {
        if (/https:\/\/hololive\.jetri\.co\/#\/watch/.exec(iswatch)) {
          const defaultHTDisplaySettingBtn = $(`.md-icon.md-icon-font:eq(${$('.md-icon.md-icon-font').length - 6})`)
          defaultHTDisplaySettingBtn.trigger('click')
        } else if ((/https:\/\/hololive\.jetri\.co\/#\/ameliawatchon/.exec(iswatch))) {
          const defaultHTDisplaySettingList = $(`.md-icon.md-icon-font:eq(${$('.md-icon.md-icon-font').length - 6})`)
          defaultHTDisplaySettingList.trigger('click')
          setTimeout(() => {
            const defaultHTDisplaySettingBtn = $('.preset-preview').eq(0)
            defaultHTDisplaySettingBtn.trigger('click')
          }, 100)
        }
      }
      iconPTT.on('click', function () {
        if (collapseEnd || !collapseStart) {
          if (now === '0') $('#PTTMain').collapse('show')
          else {
            parent.css('overflow', 'hidden')
            $('#PTTMain').collapse('hide')
          }
          now = (now === pluginwidth0 ? pluginwidth : pluginwidth0)
          $('#pttchatparent').css('flex', '0 0 ' + now + 'px')
          if (enablePortaitMode && isChatOnen) defaultVideo.height('')
          else if (enablePortaitMode) {
            parent.css('overflow', 'visible')
            defaultVideo.height(containerHeight - pluginportraitheight)
          }
          defaultSetting()
          isChatOnen = !isChatOnen
        }
      })
      iconFlex.on('click', function () {
        if (isChatOnen) {
          if ($('#fakeparent').hasClass('flex-row')) {
            $('#fakeparent').removeClass('flex-row').addClass('flex-column')
            defaultVideo.height(containerHeight - pluginportraitheight)
            parent.css('overflow', 'visible')
            $('#PTTChat-contents').height(pluginportraitheight - 35)
          } else {
            $('#fakeparent').removeClass('flex-column').addClass('flex-row')
            defaultVideo.height('')
            $('#PTTChat-contents').height(pluginheight)
          }
          enablePortaitMode = !enablePortaitMode
          defaultSetting()
        }
      })
      $(document).on('show.bs.collapse hide.bs.collapse', '#PTTMain', function () { collapseStart = true; collapseEnd = false })
      $(document).on('shown.bs.collapse hidden.bs.collapse', '#PTTMain', function () { collapseStart = false; collapseEnd = true })
      parent.append(fakeparent)
      fakeparent.append(defaultVideoHandler)
      defaultVideoHandler.append(defaultVideo)
      fakeparent.append(PTTChatHandler)
      $('.reopen-toolbar').css({ 'z-index': '302' })
      InitApp(PTTChatHandler, WhiteTheme, true, messageposter, true)
      ChangeLog()
      tryinsholotools = -10
    } else {
      tryinsholotools--
    }
  }
}

const htfilter = InsFilter('Holotools', /hololive\.jetri\.co/, 'https://hololive.jetri.co', InitHT)

function Initblank (messageposter) {
  const WhiteTheme = true
  // Check Theme

  const pluginwidth = GM_getValue('PluginWidth', 400)
  const Body = document.getElementsByTagName('BODY')[0]
  const container = document.createElement('div')
  container.id = 'container'
  container.classList.add('position-relative')
  container.setAttribute('style', 'width:' + pluginwidth + 'px;height:800px;')
  Body.prepend(container)
  // const blankcontainer = document.getElementById(`container`);
  InitApp([container], WhiteTheme, true, messageposter, true)
  ChangeLog()
}

const blankfilter = InsFilter('Blank', /blank\.org/, 'http://blank.org/', Initblank)

function InitTwitch (messageposter) {
  // Check Theme
  const WhiteTheme = ThemeCheck('body', 'rgb(247, 247, 248)');

  // run app instance loop
  (function ChechChatInstanced () {
    setTimeout(ChechChatInstanced, 1000)
    TryInsChat()
  })()
  function TryInsChat () {
    const parent = $('section.chat-room')
    if (reportmode) console.log('parent', parent)
    if (parent.length > 0) {
      const PTTApp = $('#PTTChat', parent)
      if (PTTApp.length < 1) {
        if (reportmode) console.log('InitApp')
        InitApp(parent, WhiteTheme, true, messageposter)
        ChangeLog()
      }
    }
  }
}

const twitchfilter = InsFilter('Twitch', /www\.twitch\.tv/, 'https://www.twitch.tv/', InitTwitch)

function InitNijimado (messageposter) {
  // Check Theme
  const WhiteTheme = ThemeCheck('mat-drawer-container', 'rgb(250, 250, 250)')

  let tryinsholotools = 20;
  (function ChechChatInstanced () {
    if (tryinsholotools >= 0) {
      TryInsChat()
      setTimeout(ChechChatInstanced, 1000)
    }
  })()
  function TryInsChat () {
    const parent = $('app-home.ng-star-inserted')
    if (reportmode) console.log('parent', parent)
    if (parent.length > 0) {
      const pluginwidth = GM_getValue('PluginWidth', 400)
      const fakeparent = $('<div id="fakeparent" class="d-flex flex-row"></div>')
      const defaultVideoHandler = $('<div id="videohandler" style="flex:1 1 auto;"></div>')
      const defaultVideo = $('[role="main"].content')
      const PTTChatHandler = $('<div id="pttchatparent" class="p-0 d-flex" style="flex:0 0 ' + pluginwidth + 'px;position:relative;"></div>')
      parent.append(fakeparent)
      fakeparent.append(defaultVideoHandler)
      defaultVideoHandler.append(defaultVideo)
      fakeparent.append(PTTChatHandler)
      $('.reopen-toolbar').css({ 'z-index': '302' })
      InitApp(PTTChatHandler, WhiteTheme, true, messageposter, true)
      ChangeLog()
      tryinsholotools = -10
    } else {
      tryinsholotools--
    }
  }
}

const nijimadofilter = InsFilter('niji-mado', /niji-mado\.web\.app/, 'https://niji-mado.web.app/', InitNijimado)

function InitHD (messageposter) {
  // Check Theme
  const WhiteTheme = ThemeCheck('html', '250, 250, 250')

  // run app instance loop
  let waswatch
  let iswatch
  let tryinsholotools = 20;

  (function ChechChatInstanced () {
    setTimeout(ChechChatInstanced, 1000)
    const watchcheck = /https:\/\/.+holodex\.net\/multiview/.exec(window.location.href)
    if (watchcheck) iswatch = watchcheck[0]
    else iswatch = false
    if (waswatch !== iswatch && iswatch) {
      tryinsholotools = 20
    }
    if (tryinsholotools >= 0) {
      TryInsChat()
    }
    waswatch = iswatch
  })()
  function TryInsChat () {
    // const parent = $(`.v-main__wrap`);
    const parent = $('.vue-grid-layout').parent()
    if (reportmode) console.log('parent', parent)
    if (parent.length > 0 && iswatch) {
      const pluginwidth = GM_getValue('PluginWidth', 400)
      const fakeparent = $('<div id="fakeparent" class="d-flex flex-row"></div>')
      const defaultVideoHandler = $('<div id="holotoolsvideohandler" style="flex:1 1 auto;"></div>')
      // const defaultVideo = $(`.vue-grid-layout`).parent();
      const defaultVideo = $('.vue-grid-layout')

      const PTTChatHandler = $('<div id="pttchatparent" class="p-0 d-flex" style="flex:0 0 ' + pluginwidth + 'px;position:relative;"></div>')
      parent.append(fakeparent)
      fakeparent.append(defaultVideoHandler)
      defaultVideoHandler.append(defaultVideo)
      fakeparent.append(PTTChatHandler)
      $('.reopen-toolbar').css({ 'z-index': '302' })
      InitApp(PTTChatHandler, WhiteTheme, true, messageposter, true)
      ChangeLog()
      tryinsholotools = -10
    } else {
      tryinsholotools--
    }
  }
}

const hdfilter = InsFilter('Holodex', /holodex\.net/, 'https://holodex.net', InitHD)

/* eslint-disable no-unused-vars */

/* eslint-enable no-unused-vars */

// import { lineTVfilter } from './SupportWebsite/lineTV/lineTVfilter.js'

/* eslint-disable no-unused-vars */
// dev use
const defaultopen = false
const disablepttframe = false
const simulateisstreaming = false
// add listener to get msg
let cryptkey
/* eslint-disable prefer-const */
let appinscount = 0
/* eslint-enable prefer-const */
/* eslint-enable no-unused-vars */
/* 關閉vue-devtools */
Vue.config.devtools = reportmode
/* 關閉錯誤警告 */
Vue.config.debug = reportmode;
(function () {
  const msg = new MessagePoster()
  const filters = []
  filters.push(ytfilter)
  filters.push(htfilter)
  filters.push(blankfilter)
  filters.push(twitchfilter)
  filters.push(nijimadofilter)
  // filters.push(lineTVfilter);
  filters.push(hdfilter)
  HerfFilter(msg, filters)
  /* eslint-disable semi */
})();
/* eslint-enable semi */

(function () {
  const $style = document.createElement('style')

  $style.innerHTML = `/*$grid-breakpoints: (
  // Extra small screen / phone
  xs: 0,
  // Small screen / phone
  sm: 500px,
  // Medium screen / tablet
  md: 768px,
  // Large screen / desktop
  lg: 992px,
  // Extra large screen / wide desktop
  xl: 1920px
);*/
/*$container-max-widths: (
  sm: 500px,
  md: 720px,
  lg: 960px,
  xl: 1900px,
);*/
#PTTChat {
  all: revert; }

#PTTChat :root {
  --blue: #007bff;
  --indigo: #6610f2;
  --purple: #6f42c1;
  --pink: #e83e8c;
  --red: #dc3545;
  --orange: #fd7e14;
  --yellow: #ffc107;
  --green: #28a745;
  --teal: #20c997;
  --cyan: #17a2b8;
  --white: #fff;
  --gray: #6c757d;
  --gray-dark: #343a40;
  --primary: #007bff;
  --secondary: #6c757d;
  --success: #28a745;
  --info: #17a2b8;
  --warning: #ffc107;
  --danger: #dc3545;
  --light: #f8f9fa;
  --dark: #343a40;
  --breakpoint-xs: 0;
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
  --font-family-sans-serif: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-family-monospace: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

#PTTChat *,
#PTTChat *::before,
#PTTChat *::after {
  box-sizing: border-box; }

#PTTChat html {
  font-family: sans-serif;
  line-height: 1.15;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0); }

#PTTChat article, #PTTChat aside, #PTTChat figcaption, #PTTChat figure, #PTTChat footer, #PTTChat header, #PTTChat hgroup, #PTTChat main, #PTTChat nav, #PTTChat section {
  display: block; }

#PTTChat body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
  color: #212529;
  text-align: left;
  background-color: #fff; }

#PTTChat [tabindex="-1"]:focus:not(:focus-visible) {
  outline: 0 !important; }

#PTTChat hr {
  box-sizing: content-box;
  height: 0;
  overflow: visible; }

#PTTChat h1, #PTTChat h2, #PTTChat h3, #PTTChat h4, #PTTChat h5, #PTTChat h6 {
  margin-top: 0;
  margin-bottom: 5px; }

#PTTChat p {
  margin-top: 0;
  margin-bottom: 1rem; }

#PTTChat abbr[title],
#PTTChat abbr[data-original-title] {
  text-decoration: underline;
  text-decoration: underline dotted;
  cursor: help;
  border-bottom: 0;
  text-decoration-skip-ink: none; }

#PTTChat address {
  margin-bottom: 1rem;
  font-style: normal;
  line-height: inherit; }

#PTTChat ol,
#PTTChat ul,
#PTTChat dl {
  margin-top: 0;
  margin-bottom: 1rem; }

#PTTChat ol ol,
#PTTChat ul ul,
#PTTChat ol ul,
#PTTChat ul ol {
  margin-bottom: 0; }

#PTTChat dt {
  font-weight: 700; }

#PTTChat dd {
  margin-bottom: .5rem;
  margin-left: 0; }

#PTTChat blockquote {
  margin: 0 0 1rem; }

#PTTChat b,
#PTTChat strong {
  font-weight: bolder; }

#PTTChat small {
  font-size: 80%; }

#PTTChat sub,
#PTTChat sup {
  position: relative;
  font-size: 75%;
  line-height: 0;
  vertical-align: baseline; }

#PTTChat sub {
  bottom: -.25em; }

#PTTChat sup {
  top: -.5em; }

#PTTChat a {
  color: #007bff;
  text-decoration: none;
  background-color: transparent; }
  #PTTChat a:hover {
    color: #0056b3;
    text-decoration: underline; }

#PTTChat a:not([href]):not([class]) {
  color: inherit;
  text-decoration: none; }
  #PTTChat a:not([href]):not([class]):hover {
    color: inherit;
    text-decoration: none; }

#PTTChat pre,
#PTTChat code,
#PTTChat kbd,
#PTTChat samp {
  font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 1em; }

#PTTChat pre {
  margin-top: 0;
  margin-bottom: 1rem;
  overflow: auto;
  -ms-overflow-style: scrollbar; }

#PTTChat figure {
  margin: 0 0 1rem; }

#PTTChat img {
  vertical-align: middle;
  border-style: none; }

#PTTChat svg {
  overflow: hidden;
  vertical-align: middle; }

#PTTChat table {
  border-collapse: collapse; }

#PTTChat caption {
  padding-top: 7.5px;
  padding-bottom: 7.5px;
  color: #6c757d;
  text-align: left;
  caption-side: bottom; }

#PTTChat th {
  text-align: inherit;
  text-align: -webkit-match-parent; }

#PTTChat label {
  display: inline-block;
  margin-bottom: 0.5rem; }

#PTTChat button {
  border-radius: 0; }

#PTTChat button:focus:not(:focus-visible) {
  outline: 0; }

#PTTChat input,
#PTTChat button,
#PTTChat select,
#PTTChat optgroup,
#PTTChat textarea {
  margin: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit; }

#PTTChat button,
#PTTChat input {
  overflow: visible; }

#PTTChat button,
#PTTChat select {
  text-transform: none; }

#PTTChat [role="button"] {
  cursor: pointer; }

#PTTChat select {
  word-wrap: normal; }

#PTTChat button,
#PTTChat [type="button"],
#PTTChat [type="reset"],
#PTTChat [type="submit"] {
  -webkit-appearance: button; }

#PTTChat button:not(:disabled),
#PTTChat [type="button"]:not(:disabled),
#PTTChat [type="reset"]:not(:disabled),
#PTTChat [type="submit"]:not(:disabled) {
  cursor: pointer; }

#PTTChat button::-moz-focus-inner,
#PTTChat [type="button"]::-moz-focus-inner,
#PTTChat [type="reset"]::-moz-focus-inner,
#PTTChat [type="submit"]::-moz-focus-inner {
  padding: 0;
  border-style: none; }

#PTTChat input[type="radio"],
#PTTChat input[type="checkbox"] {
  box-sizing: border-box;
  padding: 0; }

#PTTChat textarea {
  overflow: auto;
  resize: vertical; }

#PTTChat fieldset {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0; }

#PTTChat legend {
  display: block;
  width: 100%;
  max-width: 100%;
  padding: 0;
  margin-bottom: .5rem;
  font-size: 1.5rem;
  line-height: inherit;
  color: inherit;
  white-space: normal; }

#PTTChat progress {
  vertical-align: baseline; }

#PTTChat [type="number"]::-webkit-inner-spin-button,
#PTTChat [type="number"]::-webkit-outer-spin-button {
  height: auto; }

#PTTChat [type="search"] {
  outline-offset: -2px;
  -webkit-appearance: none; }

#PTTChat [type="search"]::-webkit-search-decoration {
  -webkit-appearance: none; }

#PTTChat ::-webkit-file-upload-button {
  font: inherit;
  -webkit-appearance: button; }

#PTTChat output {
  display: inline-block; }

#PTTChat summary {
  display: list-item;
  cursor: pointer; }

#PTTChat template {
  display: none; }

#PTTChat [hidden] {
  display: none !important; }

#PTTChat h1, #PTTChat h2, #PTTChat h3, #PTTChat h4, #PTTChat h5, #PTTChat h6,
#PTTChat .h1, #PTTChat .h2, #PTTChat .h3, #PTTChat .h4, #PTTChat .h5, #PTTChat .h6 {
  margin-bottom: 5px;
  font-weight: 500;
  line-height: 1.2; }

#PTTChat h1, #PTTChat .h1 {
  font-size: 30px; }

#PTTChat h2, #PTTChat .h2 {
  font-size: 24px; }

#PTTChat h3, #PTTChat .h3 {
  font-size: 21px; }

#PTTChat h4, #PTTChat .h4 {
  font-size: 18px; }

#PTTChat h5, #PTTChat .h5 {
  font-size: 15px; }

#PTTChat h6, #PTTChat .h6 {
  font-size: 12px; }

#PTTChat .lead {
  font-size: 15px;
  font-weight: 300; }

#PTTChat .display-1 {
  font-size: 6rem;
  font-weight: 300;
  line-height: 1.2; }

#PTTChat .display-2 {
  font-size: 5.5rem;
  font-weight: 300;
  line-height: 1.2; }

#PTTChat .display-3 {
  font-size: 4.5rem;
  font-weight: 300;
  line-height: 1.2; }

#PTTChat .display-4 {
  font-size: 3.5rem;
  font-weight: 300;
  line-height: 1.2; }

#PTTChat hr {
  margin-top: 10px;
  margin-bottom: 10px;
  border: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.1); }

#PTTChat small,
#PTTChat .small {
  font-size: 80%;
  font-weight: 400; }

#PTTChat mark,
#PTTChat .mark {
  padding: 0.2em;
  background-color: #fcf8e3; }

#PTTChat .list-unstyled {
  padding-left: 0;
  list-style: none; }

#PTTChat .list-inline {
  padding-left: 0;
  list-style: none; }

#PTTChat .list-inline-item {
  display: inline-block; }
  #PTTChat .list-inline-item:not(:last-child) {
    margin-right: 0.5rem; }

#PTTChat .initialism {
  font-size: 90%;
  text-transform: uppercase; }

#PTTChat .blockquote {
  margin-bottom: 10px;
  font-size: 15px; }

#PTTChat .blockquote-footer {
  display: block;
  font-size: 80%;
  color: #6c757d; }
  #PTTChat .blockquote-footer::before {
    content: "\\2014\\00A0"; }

#PTTChat .container,
#PTTChat .container-fluid,
#PTTChat .container-sm,
#PTTChat .container-md,
#PTTChat .container-lg,
#PTTChat .container-xl {
  width: 100%;
  padding-right: 15px;
  padding-left: 15px;
  margin-right: auto;
  margin-left: auto; }

@media (min-width: 576px) {
  #PTTChat .container, #PTTChat .container-sm {
    max-width: 540px; } }

@media (min-width: 768px) {
  #PTTChat .container, #PTTChat .container-sm, #PTTChat .container-md {
    max-width: 720px; } }

@media (min-width: 992px) {
  #PTTChat .container, #PTTChat .container-sm, #PTTChat .container-md, #PTTChat .container-lg {
    max-width: 960px; } }

@media (min-width: 1200px) {
  #PTTChat .container, #PTTChat .container-sm, #PTTChat .container-md, #PTTChat .container-lg, #PTTChat .container-xl {
    max-width: 1140px; } }

#PTTChat .row {
  display: flex;
  flex-wrap: wrap;
  margin-right: -15px;
  margin-left: -15px; }

#PTTChat .no-gutters {
  margin-right: 0;
  margin-left: 0; }
  #PTTChat .no-gutters > .col,
  #PTTChat .no-gutters > [class*="col-"] {
    padding-right: 0;
    padding-left: 0; }

#PTTChat .col-1, #PTTChat .col-2, #PTTChat .col-3, #PTTChat .col-4, #PTTChat .col-5, #PTTChat .col-6, #PTTChat .col-7, #PTTChat .col-8, #PTTChat .col-9, #PTTChat .col-10, #PTTChat .col-11, #PTTChat .col-12, #PTTChat .col,
#PTTChat .col-auto, #PTTChat .col-sm-1, #PTTChat .col-sm-2, #PTTChat .col-sm-3, #PTTChat .col-sm-4, #PTTChat .col-sm-5, #PTTChat .col-sm-6, #PTTChat .col-sm-7, #PTTChat .col-sm-8, #PTTChat .col-sm-9, #PTTChat .col-sm-10, #PTTChat .col-sm-11, #PTTChat .col-sm-12, #PTTChat .col-sm,
#PTTChat .col-sm-auto, #PTTChat .col-md-1, #PTTChat .col-md-2, #PTTChat .col-md-3, #PTTChat .col-md-4, #PTTChat .col-md-5, #PTTChat .col-md-6, #PTTChat .col-md-7, #PTTChat .col-md-8, #PTTChat .col-md-9, #PTTChat .col-md-10, #PTTChat .col-md-11, #PTTChat .col-md-12, #PTTChat .col-md,
#PTTChat .col-md-auto, #PTTChat .col-lg-1, #PTTChat .col-lg-2, #PTTChat .col-lg-3, #PTTChat .col-lg-4, #PTTChat .col-lg-5, #PTTChat .col-lg-6, #PTTChat .col-lg-7, #PTTChat .col-lg-8, #PTTChat .col-lg-9, #PTTChat .col-lg-10, #PTTChat .col-lg-11, #PTTChat .col-lg-12, #PTTChat .col-lg,
#PTTChat .col-lg-auto, #PTTChat .col-xl-1, #PTTChat .col-xl-2, #PTTChat .col-xl-3, #PTTChat .col-xl-4, #PTTChat .col-xl-5, #PTTChat .col-xl-6, #PTTChat .col-xl-7, #PTTChat .col-xl-8, #PTTChat .col-xl-9, #PTTChat .col-xl-10, #PTTChat .col-xl-11, #PTTChat .col-xl-12, #PTTChat .col-xl,
#PTTChat .col-xl-auto {
  position: relative;
  width: 100%;
  padding-right: 15px;
  padding-left: 15px; }

#PTTChat .col {
  flex-basis: 0;
  flex-grow: 1;
  max-width: 100%; }

#PTTChat .row-cols-1 > * {
  flex: 0 0 100%;
  max-width: 100%; }

#PTTChat .row-cols-2 > * {
  flex: 0 0 50%;
  max-width: 50%; }

#PTTChat .row-cols-3 > * {
  flex: 0 0 33.33333%;
  max-width: 33.33333%; }

#PTTChat .row-cols-4 > * {
  flex: 0 0 25%;
  max-width: 25%; }

#PTTChat .row-cols-5 > * {
  flex: 0 0 20%;
  max-width: 20%; }

#PTTChat .row-cols-6 > * {
  flex: 0 0 16.66667%;
  max-width: 16.66667%; }

#PTTChat .col-auto {
  flex: 0 0 auto;
  width: auto;
  max-width: 100%; }

#PTTChat .col-1 {
  flex: 0 0 8.33333%;
  max-width: 8.33333%; }

#PTTChat .col-2 {
  flex: 0 0 16.66667%;
  max-width: 16.66667%; }

#PTTChat .col-3 {
  flex: 0 0 25%;
  max-width: 25%; }

#PTTChat .col-4 {
  flex: 0 0 33.33333%;
  max-width: 33.33333%; }

#PTTChat .col-5 {
  flex: 0 0 41.66667%;
  max-width: 41.66667%; }

#PTTChat .col-6 {
  flex: 0 0 50%;
  max-width: 50%; }

#PTTChat .col-7 {
  flex: 0 0 58.33333%;
  max-width: 58.33333%; }

#PTTChat .col-8 {
  flex: 0 0 66.66667%;
  max-width: 66.66667%; }

#PTTChat .col-9 {
  flex: 0 0 75%;
  max-width: 75%; }

#PTTChat .col-10 {
  flex: 0 0 83.33333%;
  max-width: 83.33333%; }

#PTTChat .col-11 {
  flex: 0 0 91.66667%;
  max-width: 91.66667%; }

#PTTChat .col-12 {
  flex: 0 0 100%;
  max-width: 100%; }

#PTTChat .order-first {
  order: -1; }

#PTTChat .order-last {
  order: 13; }

#PTTChat .order-0 {
  order: 0; }

#PTTChat .order-1 {
  order: 1; }

#PTTChat .order-2 {
  order: 2; }

#PTTChat .order-3 {
  order: 3; }

#PTTChat .order-4 {
  order: 4; }

#PTTChat .order-5 {
  order: 5; }

#PTTChat .order-6 {
  order: 6; }

#PTTChat .order-7 {
  order: 7; }

#PTTChat .order-8 {
  order: 8; }

#PTTChat .order-9 {
  order: 9; }

#PTTChat .order-10 {
  order: 10; }

#PTTChat .order-11 {
  order: 11; }

#PTTChat .order-12 {
  order: 12; }

#PTTChat .offset-1 {
  margin-left: 8.33333%; }

#PTTChat .offset-2 {
  margin-left: 16.66667%; }

#PTTChat .offset-3 {
  margin-left: 25%; }

#PTTChat .offset-4 {
  margin-left: 33.33333%; }

#PTTChat .offset-5 {
  margin-left: 41.66667%; }

#PTTChat .offset-6 {
  margin-left: 50%; }

#PTTChat .offset-7 {
  margin-left: 58.33333%; }

#PTTChat .offset-8 {
  margin-left: 66.66667%; }

#PTTChat .offset-9 {
  margin-left: 75%; }

#PTTChat .offset-10 {
  margin-left: 83.33333%; }

#PTTChat .offset-11 {
  margin-left: 91.66667%; }

@media (min-width: 576px) {
  #PTTChat .col-sm {
    flex-basis: 0;
    flex-grow: 1;
    max-width: 100%; }
  #PTTChat .row-cols-sm-1 > * {
    flex: 0 0 100%;
    max-width: 100%; }
  #PTTChat .row-cols-sm-2 > * {
    flex: 0 0 50%;
    max-width: 50%; }
  #PTTChat .row-cols-sm-3 > * {
    flex: 0 0 33.33333%;
    max-width: 33.33333%; }
  #PTTChat .row-cols-sm-4 > * {
    flex: 0 0 25%;
    max-width: 25%; }
  #PTTChat .row-cols-sm-5 > * {
    flex: 0 0 20%;
    max-width: 20%; }
  #PTTChat .row-cols-sm-6 > * {
    flex: 0 0 16.66667%;
    max-width: 16.66667%; }
  #PTTChat .col-sm-auto {
    flex: 0 0 auto;
    width: auto;
    max-width: 100%; }
  #PTTChat .col-sm-1 {
    flex: 0 0 8.33333%;
    max-width: 8.33333%; }
  #PTTChat .col-sm-2 {
    flex: 0 0 16.66667%;
    max-width: 16.66667%; }
  #PTTChat .col-sm-3 {
    flex: 0 0 25%;
    max-width: 25%; }
  #PTTChat .col-sm-4 {
    flex: 0 0 33.33333%;
    max-width: 33.33333%; }
  #PTTChat .col-sm-5 {
    flex: 0 0 41.66667%;
    max-width: 41.66667%; }
  #PTTChat .col-sm-6 {
    flex: 0 0 50%;
    max-width: 50%; }
  #PTTChat .col-sm-7 {
    flex: 0 0 58.33333%;
    max-width: 58.33333%; }
  #PTTChat .col-sm-8 {
    flex: 0 0 66.66667%;
    max-width: 66.66667%; }
  #PTTChat .col-sm-9 {
    flex: 0 0 75%;
    max-width: 75%; }
  #PTTChat .col-sm-10 {
    flex: 0 0 83.33333%;
    max-width: 83.33333%; }
  #PTTChat .col-sm-11 {
    flex: 0 0 91.66667%;
    max-width: 91.66667%; }
  #PTTChat .col-sm-12 {
    flex: 0 0 100%;
    max-width: 100%; }
  #PTTChat .order-sm-first {
    order: -1; }
  #PTTChat .order-sm-last {
    order: 13; }
  #PTTChat .order-sm-0 {
    order: 0; }
  #PTTChat .order-sm-1 {
    order: 1; }
  #PTTChat .order-sm-2 {
    order: 2; }
  #PTTChat .order-sm-3 {
    order: 3; }
  #PTTChat .order-sm-4 {
    order: 4; }
  #PTTChat .order-sm-5 {
    order: 5; }
  #PTTChat .order-sm-6 {
    order: 6; }
  #PTTChat .order-sm-7 {
    order: 7; }
  #PTTChat .order-sm-8 {
    order: 8; }
  #PTTChat .order-sm-9 {
    order: 9; }
  #PTTChat .order-sm-10 {
    order: 10; }
  #PTTChat .order-sm-11 {
    order: 11; }
  #PTTChat .order-sm-12 {
    order: 12; }
  #PTTChat .offset-sm-0 {
    margin-left: 0; }
  #PTTChat .offset-sm-1 {
    margin-left: 8.33333%; }
  #PTTChat .offset-sm-2 {
    margin-left: 16.66667%; }
  #PTTChat .offset-sm-3 {
    margin-left: 25%; }
  #PTTChat .offset-sm-4 {
    margin-left: 33.33333%; }
  #PTTChat .offset-sm-5 {
    margin-left: 41.66667%; }
  #PTTChat .offset-sm-6 {
    margin-left: 50%; }
  #PTTChat .offset-sm-7 {
    margin-left: 58.33333%; }
  #PTTChat .offset-sm-8 {
    margin-left: 66.66667%; }
  #PTTChat .offset-sm-9 {
    margin-left: 75%; }
  #PTTChat .offset-sm-10 {
    margin-left: 83.33333%; }
  #PTTChat .offset-sm-11 {
    margin-left: 91.66667%; } }

@media (min-width: 768px) {
  #PTTChat .col-md {
    flex-basis: 0;
    flex-grow: 1;
    max-width: 100%; }
  #PTTChat .row-cols-md-1 > * {
    flex: 0 0 100%;
    max-width: 100%; }
  #PTTChat .row-cols-md-2 > * {
    flex: 0 0 50%;
    max-width: 50%; }
  #PTTChat .row-cols-md-3 > * {
    flex: 0 0 33.33333%;
    max-width: 33.33333%; }
  #PTTChat .row-cols-md-4 > * {
    flex: 0 0 25%;
    max-width: 25%; }
  #PTTChat .row-cols-md-5 > * {
    flex: 0 0 20%;
    max-width: 20%; }
  #PTTChat .row-cols-md-6 > * {
    flex: 0 0 16.66667%;
    max-width: 16.66667%; }
  #PTTChat .col-md-auto {
    flex: 0 0 auto;
    width: auto;
    max-width: 100%; }
  #PTTChat .col-md-1 {
    flex: 0 0 8.33333%;
    max-width: 8.33333%; }
  #PTTChat .col-md-2 {
    flex: 0 0 16.66667%;
    max-width: 16.66667%; }
  #PTTChat .col-md-3 {
    flex: 0 0 25%;
    max-width: 25%; }
  #PTTChat .col-md-4 {
    flex: 0 0 33.33333%;
    max-width: 33.33333%; }
  #PTTChat .col-md-5 {
    flex: 0 0 41.66667%;
    max-width: 41.66667%; }
  #PTTChat .col-md-6 {
    flex: 0 0 50%;
    max-width: 50%; }
  #PTTChat .col-md-7 {
    flex: 0 0 58.33333%;
    max-width: 58.33333%; }
  #PTTChat .col-md-8 {
    flex: 0 0 66.66667%;
    max-width: 66.66667%; }
  #PTTChat .col-md-9 {
    flex: 0 0 75%;
    max-width: 75%; }
  #PTTChat .col-md-10 {
    flex: 0 0 83.33333%;
    max-width: 83.33333%; }
  #PTTChat .col-md-11 {
    flex: 0 0 91.66667%;
    max-width: 91.66667%; }
  #PTTChat .col-md-12 {
    flex: 0 0 100%;
    max-width: 100%; }
  #PTTChat .order-md-first {
    order: -1; }
  #PTTChat .order-md-last {
    order: 13; }
  #PTTChat .order-md-0 {
    order: 0; }
  #PTTChat .order-md-1 {
    order: 1; }
  #PTTChat .order-md-2 {
    order: 2; }
  #PTTChat .order-md-3 {
    order: 3; }
  #PTTChat .order-md-4 {
    order: 4; }
  #PTTChat .order-md-5 {
    order: 5; }
  #PTTChat .order-md-6 {
    order: 6; }
  #PTTChat .order-md-7 {
    order: 7; }
  #PTTChat .order-md-8 {
    order: 8; }
  #PTTChat .order-md-9 {
    order: 9; }
  #PTTChat .order-md-10 {
    order: 10; }
  #PTTChat .order-md-11 {
    order: 11; }
  #PTTChat .order-md-12 {
    order: 12; }
  #PTTChat .offset-md-0 {
    margin-left: 0; }
  #PTTChat .offset-md-1 {
    margin-left: 8.33333%; }
  #PTTChat .offset-md-2 {
    margin-left: 16.66667%; }
  #PTTChat .offset-md-3 {
    margin-left: 25%; }
  #PTTChat .offset-md-4 {
    margin-left: 33.33333%; }
  #PTTChat .offset-md-5 {
    margin-left: 41.66667%; }
  #PTTChat .offset-md-6 {
    margin-left: 50%; }
  #PTTChat .offset-md-7 {
    margin-left: 58.33333%; }
  #PTTChat .offset-md-8 {
    margin-left: 66.66667%; }
  #PTTChat .offset-md-9 {
    margin-left: 75%; }
  #PTTChat .offset-md-10 {
    margin-left: 83.33333%; }
  #PTTChat .offset-md-11 {
    margin-left: 91.66667%; } }

@media (min-width: 992px) {
  #PTTChat .col-lg {
    flex-basis: 0;
    flex-grow: 1;
    max-width: 100%; }
  #PTTChat .row-cols-lg-1 > * {
    flex: 0 0 100%;
    max-width: 100%; }
  #PTTChat .row-cols-lg-2 > * {
    flex: 0 0 50%;
    max-width: 50%; }
  #PTTChat .row-cols-lg-3 > * {
    flex: 0 0 33.33333%;
    max-width: 33.33333%; }
  #PTTChat .row-cols-lg-4 > * {
    flex: 0 0 25%;
    max-width: 25%; }
  #PTTChat .row-cols-lg-5 > * {
    flex: 0 0 20%;
    max-width: 20%; }
  #PTTChat .row-cols-lg-6 > * {
    flex: 0 0 16.66667%;
    max-width: 16.66667%; }
  #PTTChat .col-lg-auto {
    flex: 0 0 auto;
    width: auto;
    max-width: 100%; }
  #PTTChat .col-lg-1 {
    flex: 0 0 8.33333%;
    max-width: 8.33333%; }
  #PTTChat .col-lg-2 {
    flex: 0 0 16.66667%;
    max-width: 16.66667%; }
  #PTTChat .col-lg-3 {
    flex: 0 0 25%;
    max-width: 25%; }
  #PTTChat .col-lg-4 {
    flex: 0 0 33.33333%;
    max-width: 33.33333%; }
  #PTTChat .col-lg-5 {
    flex: 0 0 41.66667%;
    max-width: 41.66667%; }
  #PTTChat .col-lg-6 {
    flex: 0 0 50%;
    max-width: 50%; }
  #PTTChat .col-lg-7 {
    flex: 0 0 58.33333%;
    max-width: 58.33333%; }
  #PTTChat .col-lg-8 {
    flex: 0 0 66.66667%;
    max-width: 66.66667%; }
  #PTTChat .col-lg-9 {
    flex: 0 0 75%;
    max-width: 75%; }
  #PTTChat .col-lg-10 {
    flex: 0 0 83.33333%;
    max-width: 83.33333%; }
  #PTTChat .col-lg-11 {
    flex: 0 0 91.66667%;
    max-width: 91.66667%; }
  #PTTChat .col-lg-12 {
    flex: 0 0 100%;
    max-width: 100%; }
  #PTTChat .order-lg-first {
    order: -1; }
  #PTTChat .order-lg-last {
    order: 13; }
  #PTTChat .order-lg-0 {
    order: 0; }
  #PTTChat .order-lg-1 {
    order: 1; }
  #PTTChat .order-lg-2 {
    order: 2; }
  #PTTChat .order-lg-3 {
    order: 3; }
  #PTTChat .order-lg-4 {
    order: 4; }
  #PTTChat .order-lg-5 {
    order: 5; }
  #PTTChat .order-lg-6 {
    order: 6; }
  #PTTChat .order-lg-7 {
    order: 7; }
  #PTTChat .order-lg-8 {
    order: 8; }
  #PTTChat .order-lg-9 {
    order: 9; }
  #PTTChat .order-lg-10 {
    order: 10; }
  #PTTChat .order-lg-11 {
    order: 11; }
  #PTTChat .order-lg-12 {
    order: 12; }
  #PTTChat .offset-lg-0 {
    margin-left: 0; }
  #PTTChat .offset-lg-1 {
    margin-left: 8.33333%; }
  #PTTChat .offset-lg-2 {
    margin-left: 16.66667%; }
  #PTTChat .offset-lg-3 {
    margin-left: 25%; }
  #PTTChat .offset-lg-4 {
    margin-left: 33.33333%; }
  #PTTChat .offset-lg-5 {
    margin-left: 41.66667%; }
  #PTTChat .offset-lg-6 {
    margin-left: 50%; }
  #PTTChat .offset-lg-7 {
    margin-left: 58.33333%; }
  #PTTChat .offset-lg-8 {
    margin-left: 66.66667%; }
  #PTTChat .offset-lg-9 {
    margin-left: 75%; }
  #PTTChat .offset-lg-10 {
    margin-left: 83.33333%; }
  #PTTChat .offset-lg-11 {
    margin-left: 91.66667%; } }

@media (min-width: 1200px) {
  #PTTChat .col-xl {
    flex-basis: 0;
    flex-grow: 1;
    max-width: 100%; }
  #PTTChat .row-cols-xl-1 > * {
    flex: 0 0 100%;
    max-width: 100%; }
  #PTTChat .row-cols-xl-2 > * {
    flex: 0 0 50%;
    max-width: 50%; }
  #PTTChat .row-cols-xl-3 > * {
    flex: 0 0 33.33333%;
    max-width: 33.33333%; }
  #PTTChat .row-cols-xl-4 > * {
    flex: 0 0 25%;
    max-width: 25%; }
  #PTTChat .row-cols-xl-5 > * {
    flex: 0 0 20%;
    max-width: 20%; }
  #PTTChat .row-cols-xl-6 > * {
    flex: 0 0 16.66667%;
    max-width: 16.66667%; }
  #PTTChat .col-xl-auto {
    flex: 0 0 auto;
    width: auto;
    max-width: 100%; }
  #PTTChat .col-xl-1 {
    flex: 0 0 8.33333%;
    max-width: 8.33333%; }
  #PTTChat .col-xl-2 {
    flex: 0 0 16.66667%;
    max-width: 16.66667%; }
  #PTTChat .col-xl-3 {
    flex: 0 0 25%;
    max-width: 25%; }
  #PTTChat .col-xl-4 {
    flex: 0 0 33.33333%;
    max-width: 33.33333%; }
  #PTTChat .col-xl-5 {
    flex: 0 0 41.66667%;
    max-width: 41.66667%; }
  #PTTChat .col-xl-6 {
    flex: 0 0 50%;
    max-width: 50%; }
  #PTTChat .col-xl-7 {
    flex: 0 0 58.33333%;
    max-width: 58.33333%; }
  #PTTChat .col-xl-8 {
    flex: 0 0 66.66667%;
    max-width: 66.66667%; }
  #PTTChat .col-xl-9 {
    flex: 0 0 75%;
    max-width: 75%; }
  #PTTChat .col-xl-10 {
    flex: 0 0 83.33333%;
    max-width: 83.33333%; }
  #PTTChat .col-xl-11 {
    flex: 0 0 91.66667%;
    max-width: 91.66667%; }
  #PTTChat .col-xl-12 {
    flex: 0 0 100%;
    max-width: 100%; }
  #PTTChat .order-xl-first {
    order: -1; }
  #PTTChat .order-xl-last {
    order: 13; }
  #PTTChat .order-xl-0 {
    order: 0; }
  #PTTChat .order-xl-1 {
    order: 1; }
  #PTTChat .order-xl-2 {
    order: 2; }
  #PTTChat .order-xl-3 {
    order: 3; }
  #PTTChat .order-xl-4 {
    order: 4; }
  #PTTChat .order-xl-5 {
    order: 5; }
  #PTTChat .order-xl-6 {
    order: 6; }
  #PTTChat .order-xl-7 {
    order: 7; }
  #PTTChat .order-xl-8 {
    order: 8; }
  #PTTChat .order-xl-9 {
    order: 9; }
  #PTTChat .order-xl-10 {
    order: 10; }
  #PTTChat .order-xl-11 {
    order: 11; }
  #PTTChat .order-xl-12 {
    order: 12; }
  #PTTChat .offset-xl-0 {
    margin-left: 0; }
  #PTTChat .offset-xl-1 {
    margin-left: 8.33333%; }
  #PTTChat .offset-xl-2 {
    margin-left: 16.66667%; }
  #PTTChat .offset-xl-3 {
    margin-left: 25%; }
  #PTTChat .offset-xl-4 {
    margin-left: 33.33333%; }
  #PTTChat .offset-xl-5 {
    margin-left: 41.66667%; }
  #PTTChat .offset-xl-6 {
    margin-left: 50%; }
  #PTTChat .offset-xl-7 {
    margin-left: 58.33333%; }
  #PTTChat .offset-xl-8 {
    margin-left: 66.66667%; }
  #PTTChat .offset-xl-9 {
    margin-left: 75%; }
  #PTTChat .offset-xl-10 {
    margin-left: 83.33333%; }
  #PTTChat .offset-xl-11 {
    margin-left: 91.66667%; } }

#PTTChat .table {
  width: 100%;
  margin-bottom: 10px;
  color: #212529; }
  #PTTChat .table th,
  #PTTChat .table td {
    padding: 7.5px;
    vertical-align: top;
    border-top: 1px solid #dee2e6; }
  #PTTChat .table thead th {
    vertical-align: bottom;
    border-bottom: 2px solid #dee2e6; }
  #PTTChat .table tbody + tbody {
    border-top: 2px solid #dee2e6; }

#PTTChat .table-sm th,
#PTTChat .table-sm td {
  padding: 3px; }

#PTTChat .table-bordered {
  border: 1px solid #dee2e6; }
  #PTTChat .table-bordered th,
  #PTTChat .table-bordered td {
    border: 1px solid #dee2e6; }
  #PTTChat .table-bordered thead th,
  #PTTChat .table-bordered thead td {
    border-bottom-width: 2px; }

#PTTChat .table-borderless th,
#PTTChat .table-borderless td,
#PTTChat .table-borderless thead th,
#PTTChat .table-borderless tbody + tbody {
  border: 0; }

#PTTChat .table-striped tbody tr:nth-of-type(odd) {
  background-color: rgba(0, 0, 0, 0.05); }

#PTTChat .table-hover tbody tr:hover {
  color: #212529;
  background-color: rgba(0, 0, 0, 0.075); }

#PTTChat .table-primary,
#PTTChat .table-primary > th,
#PTTChat .table-primary > td {
  background-color: #b8daff; }

#PTTChat .table-primary th,
#PTTChat .table-primary td,
#PTTChat .table-primary thead th,
#PTTChat .table-primary tbody + tbody {
  border-color: #7abaff; }

#PTTChat .table-hover .table-primary:hover {
  background-color: #9fcdff; }
  #PTTChat .table-hover .table-primary:hover > td,
  #PTTChat .table-hover .table-primary:hover > th {
    background-color: #9fcdff; }

#PTTChat .table-secondary,
#PTTChat .table-secondary > th,
#PTTChat .table-secondary > td {
  background-color: #d6d8db; }

#PTTChat .table-secondary th,
#PTTChat .table-secondary td,
#PTTChat .table-secondary thead th,
#PTTChat .table-secondary tbody + tbody {
  border-color: #b3b7bb; }

#PTTChat .table-hover .table-secondary:hover {
  background-color: #c8cbcf; }
  #PTTChat .table-hover .table-secondary:hover > td,
  #PTTChat .table-hover .table-secondary:hover > th {
    background-color: #c8cbcf; }

#PTTChat .table-success,
#PTTChat .table-success > th,
#PTTChat .table-success > td {
  background-color: #c3e6cb; }

#PTTChat .table-success th,
#PTTChat .table-success td,
#PTTChat .table-success thead th,
#PTTChat .table-success tbody + tbody {
  border-color: #8fd19e; }

#PTTChat .table-hover .table-success:hover {
  background-color: #b1dfbb; }
  #PTTChat .table-hover .table-success:hover > td,
  #PTTChat .table-hover .table-success:hover > th {
    background-color: #b1dfbb; }

#PTTChat .table-info,
#PTTChat .table-info > th,
#PTTChat .table-info > td {
  background-color: #bee5eb; }

#PTTChat .table-info th,
#PTTChat .table-info td,
#PTTChat .table-info thead th,
#PTTChat .table-info tbody + tbody {
  border-color: #86cfda; }

#PTTChat .table-hover .table-info:hover {
  background-color: #abdde5; }
  #PTTChat .table-hover .table-info:hover > td,
  #PTTChat .table-hover .table-info:hover > th {
    background-color: #abdde5; }

#PTTChat .table-warning,
#PTTChat .table-warning > th,
#PTTChat .table-warning > td {
  background-color: #ffeeba; }

#PTTChat .table-warning th,
#PTTChat .table-warning td,
#PTTChat .table-warning thead th,
#PTTChat .table-warning tbody + tbody {
  border-color: #ffdf7e; }

#PTTChat .table-hover .table-warning:hover {
  background-color: #ffe8a1; }
  #PTTChat .table-hover .table-warning:hover > td,
  #PTTChat .table-hover .table-warning:hover > th {
    background-color: #ffe8a1; }

#PTTChat .table-danger,
#PTTChat .table-danger > th,
#PTTChat .table-danger > td {
  background-color: #f5c6cb; }

#PTTChat .table-danger th,
#PTTChat .table-danger td,
#PTTChat .table-danger thead th,
#PTTChat .table-danger tbody + tbody {
  border-color: #ed969e; }

#PTTChat .table-hover .table-danger:hover {
  background-color: #f1b0b7; }
  #PTTChat .table-hover .table-danger:hover > td,
  #PTTChat .table-hover .table-danger:hover > th {
    background-color: #f1b0b7; }

#PTTChat .table-light,
#PTTChat .table-light > th,
#PTTChat .table-light > td {
  background-color: #fdfdfe; }

#PTTChat .table-light th,
#PTTChat .table-light td,
#PTTChat .table-light thead th,
#PTTChat .table-light tbody + tbody {
  border-color: #fbfcfc; }

#PTTChat .table-hover .table-light:hover {
  background-color: #ececf6; }
  #PTTChat .table-hover .table-light:hover > td,
  #PTTChat .table-hover .table-light:hover > th {
    background-color: #ececf6; }

#PTTChat .table-dark,
#PTTChat .table-dark > th,
#PTTChat .table-dark > td {
  background-color: #c6c8ca; }

#PTTChat .table-dark th,
#PTTChat .table-dark td,
#PTTChat .table-dark thead th,
#PTTChat .table-dark tbody + tbody {
  border-color: #95999c; }

#PTTChat .table-hover .table-dark:hover {
  background-color: #b9bbbe; }
  #PTTChat .table-hover .table-dark:hover > td,
  #PTTChat .table-hover .table-dark:hover > th {
    background-color: #b9bbbe; }

#PTTChat .table-active,
#PTTChat .table-active > th,
#PTTChat .table-active > td {
  background-color: rgba(0, 0, 0, 0.075); }

#PTTChat .table-hover .table-active:hover {
  background-color: rgba(0, 0, 0, 0.075); }
  #PTTChat .table-hover .table-active:hover > td,
  #PTTChat .table-hover .table-active:hover > th {
    background-color: rgba(0, 0, 0, 0.075); }

#PTTChat .table .thead-dark th {
  color: #fff;
  background-color: #343a40;
  border-color: #454d55; }

#PTTChat .table .thead-light th {
  color: #495057;
  background-color: #e9ecef;
  border-color: #dee2e6; }

#PTTChat .table-dark {
  color: #fff;
  background-color: #343a40; }
  #PTTChat .table-dark th,
  #PTTChat .table-dark td,
  #PTTChat .table-dark thead th {
    border-color: #454d55; }
  #PTTChat .table-dark.table-bordered {
    border: 0; }
  #PTTChat .table-dark.table-striped tbody tr:nth-of-type(odd) {
    background-color: rgba(255, 255, 255, 0.05); }
  #PTTChat .table-dark.table-hover tbody tr:hover {
    color: #fff;
    background-color: rgba(255, 255, 255, 0.075); }

@media (max-width: 575.98px) {
  #PTTChat .table-responsive-sm {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; }
    #PTTChat .table-responsive-sm > .table-bordered {
      border: 0; } }

@media (max-width: 767.98px) {
  #PTTChat .table-responsive-md {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; }
    #PTTChat .table-responsive-md > .table-bordered {
      border: 0; } }

@media (max-width: 991.98px) {
  #PTTChat .table-responsive-lg {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; }
    #PTTChat .table-responsive-lg > .table-bordered {
      border: 0; } }

@media (max-width: 1199.98px) {
  #PTTChat .table-responsive-xl {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; }
    #PTTChat .table-responsive-xl > .table-bordered {
      border: 0; } }

#PTTChat .table-responsive {
  display: block;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; }
  #PTTChat .table-responsive > .table-bordered {
    border: 0; }

#PTTChat .form-control {
  display: block;
  width: 100%;
  height: add(1.5, add(7.5px, 2px, false));
  padding: 3.75px 7.5px;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
  color: #495057;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid #ced4da;
  border-radius: 2.5px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; }
  @media (prefers-reduced-motion: reduce) {
    #PTTChat .form-control {
      transition: none; } }
  #PTTChat .form-control::-ms-expand {
    background-color: transparent;
    border: 0; }
  #PTTChat .form-control:-moz-focusring {
    color: transparent;
    text-shadow: 0 0 0 #495057; }
  #PTTChat .form-control:focus {
    color: #495057;
    background-color: #fff;
    border-color: #80bdff;
    outline: 0;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25); }
  #PTTChat .form-control::placeholder {
    color: #6c757d;
    opacity: 1; }
  #PTTChat .form-control:disabled, #PTTChat .form-control[readonly] {
    background-color: #e9ecef;
    opacity: 1; }

#PTTChat input[type="date"].form-control,
#PTTChat input[type="time"].form-control,
#PTTChat input[type="datetime-local"].form-control,
#PTTChat input[type="month"].form-control {
  appearance: none; }

#PTTChat select.form-control:focus::-ms-value {
  color: #495057;
  background-color: #fff; }

#PTTChat .form-control-file,
#PTTChat .form-control-range {
  display: block;
  width: 100%; }

#PTTChat .col-form-label {
  padding-top: 4.75px;
  padding-bottom: 4.75px;
  margin-bottom: 0;
  font-size: inherit;
  line-height: 1.5; }

#PTTChat .col-form-label-lg {
  padding-top: 4px;
  padding-bottom: 4px;
  font-size: 15px;
  line-height: 1.5; }

#PTTChat .col-form-label-sm {
  padding-top: 3.5px;
  padding-bottom: 3.5px;
  font-size: 10.5px;
  line-height: 18px; }

#PTTChat .form-control-plaintext {
  display: block;
  width: 100%;
  padding: 3.75px 0;
  margin-bottom: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #212529;
  background-color: transparent;
  border: solid transparent;
  border-width: 1px 0; }
  #PTTChat .form-control-plaintext.form-control-sm, #PTTChat .form-control-plaintext.form-control-lg {
    padding-right: 0;
    padding-left: 0; }

#PTTChat .form-control-sm {
  height: add(18px, add(5px, 2px, false));
  padding: 2.5px 0.5rem;
  font-size: 10.5px;
  line-height: 18px;
  border-radius: 2.5px; }

#PTTChat .form-control-lg {
  height: add(1.5, add(6px, 2px, false));
  padding: 3px 10px;
  font-size: 15px;
  line-height: 1.5;
  border-radius: 2.5px; }

#PTTChat select.form-control[size], #PTTChat select.form-control[multiple] {
  height: auto; }

#PTTChat textarea.form-control {
  height: auto; }

#PTTChat .form-group {
  margin-bottom: 1rem; }

#PTTChat .form-text {
  display: block;
  margin-top: 0.25rem; }

#PTTChat .form-row {
  display: flex;
  flex-wrap: wrap;
  margin-right: -5px;
  margin-left: -5px; }
  #PTTChat .form-row > .col,
  #PTTChat .form-row > [class*="col-"] {
    padding-right: 5px;
    padding-left: 5px; }

#PTTChat .form-check {
  position: relative;
  display: block;
  padding-left: 1.25rem; }

#PTTChat .form-check-input {
  position: absolute;
  margin-top: 0.3rem;
  margin-left: -1.25rem; }
  #PTTChat .form-check-input[disabled] ~ .form-check-label,
  #PTTChat .form-check-input:disabled ~ .form-check-label {
    color: #6c757d; }

#PTTChat .form-check-label {
  margin-bottom: 0; }

#PTTChat .form-check-inline {
  display: inline-flex;
  align-items: center;
  padding-left: 0;
  margin-right: 0.75rem; }
  #PTTChat .form-check-inline .form-check-input {
    position: static;
    margin-top: 0;
    margin-right: 0.3125rem;
    margin-left: 0; }

#PTTChat .valid-feedback {
  display: none;
  width: 100%;
  margin-top: 0.25rem;
  font-size: 80%;
  color: #28a745; }

#PTTChat .valid-tooltip {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 5;
  display: none;
  max-width: 100%;
  padding: 0.25rem 0.5rem;
  margin-top: .1rem;
  font-size: 10.5px;
  line-height: 1.5;
  color: #fff;
  background-color: rgba(40, 167, 69, 0.9);
  border-radius: 2.5px; }
  .form-row > .col > #PTTChat .valid-tooltip,
  .form-row > [class*="col-"] > #PTTChat .valid-tooltip {
    left: 5px; }

.was-validated #PTTChat:valid ~ .valid-feedback,
.was-validated #PTTChat:valid ~ .valid-tooltip, #PTTChat.is-valid ~ .valid-feedback,
#PTTChat.is-valid ~ .valid-tooltip {
  display: block; }

.was-validated #PTTChat .form-control:valid, #PTTChat .form-control.is-valid {
  border-color: #28a745;
  padding-right: add(1.5, 7.5px);
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath fill='%2328a745' d='M2.3 6.73L.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right add(0.375, 1.875px) center;
  background-size: add(0.75, 3.75px) add(0.75, 3.75px); }
  .was-validated #PTTChat .form-control:valid:focus, #PTTChat .form-control.is-valid:focus {
    border-color: #28a745;
    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25); }

.was-validated #PTTChat textarea.form-control:valid, #PTTChat textarea.form-control.is-valid {
  padding-right: add(1.5, 7.5px);
  background-position: top add(0.375, 1.875px) right add(0.375, 1.875px); }

.was-validated #PTTChat .custom-select:valid, #PTTChat .custom-select.is-valid {
  border-color: #28a745;
  padding-right: add(7.5px, 23.125px);
  background: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e") right 7.5px center/8px 10px no-repeat, #fff url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3e%3cpath fill='%2328a745' d='M2.3 6.73L.6 4.53c-.4-1.04.46-1.4 1.1-.8l1.1 1.4 3.4-3.8c.6-.63 1.6-.27 1.2.7l-4 4.6c-.43.5-.8.4-1.1.1z'/%3e%3c/svg%3e") center right 17.5px/add(0.75, 3.75px) add(0.75, 3.75px) no-repeat; }
  .was-validated #PTTChat .custom-select:valid:focus, #PTTChat .custom-select.is-valid:focus {
    border-color: #28a745;
    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25); }

.was-validated #PTTChat .form-check-input:valid ~ .form-check-label, #PTTChat .form-check-input.is-valid ~ .form-check-label {
  color: #28a745; }

.was-validated #PTTChat .form-check-input:valid ~ .valid-feedback,
.was-validated #PTTChat .form-check-input:valid ~ .valid-tooltip, #PTTChat .form-check-input.is-valid ~ .valid-feedback,
#PTTChat .form-check-input.is-valid ~ .valid-tooltip {
  display: block; }

.was-validated #PTTChat .custom-control-input:valid ~ .custom-control-label, #PTTChat .custom-control-input.is-valid ~ .custom-control-label {
  color: #28a745; }
  .was-validated #PTTChat .custom-control-input:valid ~ .custom-control-label::before, #PTTChat .custom-control-input.is-valid ~ .custom-control-label::before {
    border-color: #28a745; }

.was-validated #PTTChat .custom-control-input:valid:checked ~ .custom-control-label::before, #PTTChat .custom-control-input.is-valid:checked ~ .custom-control-label::before {
  border-color: #34ce57;
  background-color: #34ce57; }

.was-validated #PTTChat .custom-control-input:valid:focus ~ .custom-control-label::before, #PTTChat .custom-control-input.is-valid:focus ~ .custom-control-label::before {
  box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25); }

.was-validated #PTTChat .custom-control-input:valid:focus:not(:checked) ~ .custom-control-label::before, #PTTChat .custom-control-input.is-valid:focus:not(:checked) ~ .custom-control-label::before {
  border-color: #28a745; }

.was-validated #PTTChat .custom-file-input:valid ~ .custom-file-label, #PTTChat .custom-file-input.is-valid ~ .custom-file-label {
  border-color: #28a745; }

.was-validated #PTTChat .custom-file-input:valid:focus ~ .custom-file-label, #PTTChat .custom-file-input.is-valid:focus ~ .custom-file-label {
  border-color: #28a745;
  box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25); }

#PTTChat .invalid-feedback {
  display: none;
  width: 100%;
  margin-top: 0.25rem;
  font-size: 80%;
  color: #dc3545; }

#PTTChat .invalid-tooltip {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 5;
  display: none;
  max-width: 100%;
  padding: 0.25rem 0.5rem;
  margin-top: .1rem;
  font-size: 10.5px;
  line-height: 1.5;
  color: #fff;
  background-color: rgba(220, 53, 69, 0.9);
  border-radius: 2.5px; }
  .form-row > .col > #PTTChat .invalid-tooltip,
  .form-row > [class*="col-"] > #PTTChat .invalid-tooltip {
    left: 5px; }

.was-validated #PTTChat:invalid ~ .invalid-feedback,
.was-validated #PTTChat:invalid ~ .invalid-tooltip, #PTTChat.is-invalid ~ .invalid-feedback,
#PTTChat.is-invalid ~ .invalid-tooltip {
  display: block; }

.was-validated #PTTChat .form-control:invalid, #PTTChat .form-control.is-invalid {
  border-color: #dc3545;
  padding-right: add(1.5, 7.5px);
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23dc3545' viewBox='0 0 12 12'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right add(0.375, 1.875px) center;
  background-size: add(0.75, 3.75px) add(0.75, 3.75px); }
  .was-validated #PTTChat .form-control:invalid:focus, #PTTChat .form-control.is-invalid:focus {
    border-color: #dc3545;
    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25); }

.was-validated #PTTChat textarea.form-control:invalid, #PTTChat textarea.form-control.is-invalid {
  padding-right: add(1.5, 7.5px);
  background-position: top add(0.375, 1.875px) right add(0.375, 1.875px); }

.was-validated #PTTChat .custom-select:invalid, #PTTChat .custom-select.is-invalid {
  border-color: #dc3545;
  padding-right: add(7.5px, 23.125px);
  background: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e") right 7.5px center/8px 10px no-repeat, #fff url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23dc3545' viewBox='0 0 12 12'%3e%3ccircle cx='6' cy='6' r='4.5'/%3e%3cpath stroke-linejoin='round' d='M5.8 3.6h.4L6 6.5z'/%3e%3ccircle cx='6' cy='8.2' r='.6' fill='%23dc3545' stroke='none'/%3e%3c/svg%3e") center right 17.5px/add(0.75, 3.75px) add(0.75, 3.75px) no-repeat; }
  .was-validated #PTTChat .custom-select:invalid:focus, #PTTChat .custom-select.is-invalid:focus {
    border-color: #dc3545;
    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25); }

.was-validated #PTTChat .form-check-input:invalid ~ .form-check-label, #PTTChat .form-check-input.is-invalid ~ .form-check-label {
  color: #dc3545; }

.was-validated #PTTChat .form-check-input:invalid ~ .invalid-feedback,
.was-validated #PTTChat .form-check-input:invalid ~ .invalid-tooltip, #PTTChat .form-check-input.is-invalid ~ .invalid-feedback,
#PTTChat .form-check-input.is-invalid ~ .invalid-tooltip {
  display: block; }

.was-validated #PTTChat .custom-control-input:invalid ~ .custom-control-label, #PTTChat .custom-control-input.is-invalid ~ .custom-control-label {
  color: #dc3545; }
  .was-validated #PTTChat .custom-control-input:invalid ~ .custom-control-label::before, #PTTChat .custom-control-input.is-invalid ~ .custom-control-label::before {
    border-color: #dc3545; }

.was-validated #PTTChat .custom-control-input:invalid:checked ~ .custom-control-label::before, #PTTChat .custom-control-input.is-invalid:checked ~ .custom-control-label::before {
  border-color: #e4606d;
  background-color: #e4606d; }

.was-validated #PTTChat .custom-control-input:invalid:focus ~ .custom-control-label::before, #PTTChat .custom-control-input.is-invalid:focus ~ .custom-control-label::before {
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25); }

.was-validated #PTTChat .custom-control-input:invalid:focus:not(:checked) ~ .custom-control-label::before, #PTTChat .custom-control-input.is-invalid:focus:not(:checked) ~ .custom-control-label::before {
  border-color: #dc3545; }

.was-validated #PTTChat .custom-file-input:invalid ~ .custom-file-label, #PTTChat .custom-file-input.is-invalid ~ .custom-file-label {
  border-color: #dc3545; }

.was-validated #PTTChat .custom-file-input:invalid:focus ~ .custom-file-label, #PTTChat .custom-file-input.is-invalid:focus ~ .custom-file-label {
  border-color: #dc3545;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25); }

#PTTChat .form-inline {
  display: flex;
  flex-flow: row wrap;
  align-items: center; }
  #PTTChat .form-inline .form-check {
    width: 100%; }
  @media (min-width: 576px) {
    #PTTChat .form-inline label {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0; }
    #PTTChat .form-inline .form-group {
      display: flex;
      flex: 0 0 auto;
      flex-flow: row wrap;
      align-items: center;
      margin-bottom: 0; }
    #PTTChat .form-inline .form-control {
      display: inline-block;
      width: auto;
      vertical-align: middle; }
    #PTTChat .form-inline .form-control-plaintext {
      display: inline-block; }
    #PTTChat .form-inline .input-group,
    #PTTChat .form-inline .custom-select {
      width: auto; }
    #PTTChat .form-inline .form-check {
      display: flex;
      align-items: center;
      justify-content: center;
      width: auto;
      padding-left: 0; }
    #PTTChat .form-inline .form-check-input {
      position: relative;
      flex-shrink: 0;
      margin-top: 0;
      margin-right: 0.25rem;
      margin-left: 0; }
    #PTTChat .form-inline .custom-control {
      align-items: center;
      justify-content: center; }
    #PTTChat .form-inline .custom-control-label {
      margin-bottom: 0; } }

#PTTChat .btn {
  display: inline-block;
  font-weight: 400;
  color: #212529;
  text-align: center;
  vertical-align: middle;
  user-select: none;
  background-color: transparent;
  border: 1px solid transparent;
  padding: 3.75px 7.5px;
  font-size: 12px;
  line-height: 1.5;
  border-radius: 2.5px;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out; }
  @media (prefers-reduced-motion: reduce) {
    #PTTChat .btn {
      transition: none; } }
  #PTTChat .btn:hover {
    color: #212529;
    text-decoration: none; }
  #PTTChat .btn:focus, #PTTChat .btn.focus {
    outline: 0;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25); }
  #PTTChat .btn.disabled, #PTTChat .btn:disabled {
    opacity: 0.65; }
  #PTTChat .btn:not(:disabled):not(.disabled) {
    cursor: pointer; }

#PTTChat a.btn.disabled,
#PTTChat fieldset:disabled a.btn {
  pointer-events: none; }

#PTTChat .btn-primary {
  color: #fff;
  background-color: #007bff;
  border-color: #007bff; }
  #PTTChat .btn-primary:hover {
    color: #fff;
    background-color: #0069d9;
    border-color: #0062cc; }
  #PTTChat .btn-primary:focus, #PTTChat .btn-primary.focus {
    color: #fff;
    background-color: #0069d9;
    border-color: #0062cc;
    box-shadow: 0 0 0 2px rgba(38, 143, 255, 0.5); }
  #PTTChat .btn-primary.disabled, #PTTChat .btn-primary:disabled {
    color: #fff;
    background-color: #007bff;
    border-color: #007bff; }
  #PTTChat .btn-primary:not(:disabled):not(.disabled):active, #PTTChat .btn-primary:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-primary.dropdown-toggle {
    color: #fff;
    background-color: #0062cc;
    border-color: #005cbf; }
    #PTTChat .btn-primary:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-primary:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-primary.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(38, 143, 255, 0.5); }

#PTTChat .btn-secondary {
  color: #fff;
  background-color: #6c757d;
  border-color: #6c757d; }
  #PTTChat .btn-secondary:hover {
    color: #fff;
    background-color: #5a6268;
    border-color: #545b62; }
  #PTTChat .btn-secondary:focus, #PTTChat .btn-secondary.focus {
    color: #fff;
    background-color: #5a6268;
    border-color: #545b62;
    box-shadow: 0 0 0 2px rgba(130, 138, 145, 0.5); }
  #PTTChat .btn-secondary.disabled, #PTTChat .btn-secondary:disabled {
    color: #fff;
    background-color: #6c757d;
    border-color: #6c757d; }
  #PTTChat .btn-secondary:not(:disabled):not(.disabled):active, #PTTChat .btn-secondary:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-secondary.dropdown-toggle {
    color: #fff;
    background-color: #545b62;
    border-color: #4e555b; }
    #PTTChat .btn-secondary:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-secondary:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-secondary.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(130, 138, 145, 0.5); }

#PTTChat .btn-success {
  color: #fff;
  background-color: #28a745;
  border-color: #28a745; }
  #PTTChat .btn-success:hover {
    color: #fff;
    background-color: #218838;
    border-color: #1e7e34; }
  #PTTChat .btn-success:focus, #PTTChat .btn-success.focus {
    color: #fff;
    background-color: #218838;
    border-color: #1e7e34;
    box-shadow: 0 0 0 2px rgba(72, 180, 97, 0.5); }
  #PTTChat .btn-success.disabled, #PTTChat .btn-success:disabled {
    color: #fff;
    background-color: #28a745;
    border-color: #28a745; }
  #PTTChat .btn-success:not(:disabled):not(.disabled):active, #PTTChat .btn-success:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-success.dropdown-toggle {
    color: #fff;
    background-color: #1e7e34;
    border-color: #1c7430; }
    #PTTChat .btn-success:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-success:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-success.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(72, 180, 97, 0.5); }

#PTTChat .btn-info {
  color: #fff;
  background-color: #17a2b8;
  border-color: #17a2b8; }
  #PTTChat .btn-info:hover {
    color: #fff;
    background-color: #138496;
    border-color: #117a8b; }
  #PTTChat .btn-info:focus, #PTTChat .btn-info.focus {
    color: #fff;
    background-color: #138496;
    border-color: #117a8b;
    box-shadow: 0 0 0 2px rgba(58, 176, 195, 0.5); }
  #PTTChat .btn-info.disabled, #PTTChat .btn-info:disabled {
    color: #fff;
    background-color: #17a2b8;
    border-color: #17a2b8; }
  #PTTChat .btn-info:not(:disabled):not(.disabled):active, #PTTChat .btn-info:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-info.dropdown-toggle {
    color: #fff;
    background-color: #117a8b;
    border-color: #10707f; }
    #PTTChat .btn-info:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-info:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-info.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(58, 176, 195, 0.5); }

#PTTChat .btn-warning {
  color: #212529;
  background-color: #ffc107;
  border-color: #ffc107; }
  #PTTChat .btn-warning:hover {
    color: #212529;
    background-color: #e0a800;
    border-color: #d39e00; }
  #PTTChat .btn-warning:focus, #PTTChat .btn-warning.focus {
    color: #212529;
    background-color: #e0a800;
    border-color: #d39e00;
    box-shadow: 0 0 0 2px rgba(222, 170, 12, 0.5); }
  #PTTChat .btn-warning.disabled, #PTTChat .btn-warning:disabled {
    color: #212529;
    background-color: #ffc107;
    border-color: #ffc107; }
  #PTTChat .btn-warning:not(:disabled):not(.disabled):active, #PTTChat .btn-warning:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-warning.dropdown-toggle {
    color: #212529;
    background-color: #d39e00;
    border-color: #c69500; }
    #PTTChat .btn-warning:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-warning:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-warning.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(222, 170, 12, 0.5); }

#PTTChat .btn-danger {
  color: #fff;
  background-color: #dc3545;
  border-color: #dc3545; }
  #PTTChat .btn-danger:hover {
    color: #fff;
    background-color: #c82333;
    border-color: #bd2130; }
  #PTTChat .btn-danger:focus, #PTTChat .btn-danger.focus {
    color: #fff;
    background-color: #c82333;
    border-color: #bd2130;
    box-shadow: 0 0 0 2px rgba(225, 83, 97, 0.5); }
  #PTTChat .btn-danger.disabled, #PTTChat .btn-danger:disabled {
    color: #fff;
    background-color: #dc3545;
    border-color: #dc3545; }
  #PTTChat .btn-danger:not(:disabled):not(.disabled):active, #PTTChat .btn-danger:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-danger.dropdown-toggle {
    color: #fff;
    background-color: #bd2130;
    border-color: #b21f2d; }
    #PTTChat .btn-danger:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-danger:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-danger.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(225, 83, 97, 0.5); }

#PTTChat .btn-light {
  color: #212529;
  background-color: #f8f9fa;
  border-color: #f8f9fa; }
  #PTTChat .btn-light:hover {
    color: #212529;
    background-color: #e2e6ea;
    border-color: #dae0e5; }
  #PTTChat .btn-light:focus, #PTTChat .btn-light.focus {
    color: #212529;
    background-color: #e2e6ea;
    border-color: #dae0e5;
    box-shadow: 0 0 0 2px rgba(216, 217, 219, 0.5); }
  #PTTChat .btn-light.disabled, #PTTChat .btn-light:disabled {
    color: #212529;
    background-color: #f8f9fa;
    border-color: #f8f9fa; }
  #PTTChat .btn-light:not(:disabled):not(.disabled):active, #PTTChat .btn-light:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-light.dropdown-toggle {
    color: #212529;
    background-color: #dae0e5;
    border-color: #d3d9df; }
    #PTTChat .btn-light:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-light:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-light.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(216, 217, 219, 0.5); }

#PTTChat .btn-dark {
  color: #fff;
  background-color: #343a40;
  border-color: #343a40; }
  #PTTChat .btn-dark:hover {
    color: #fff;
    background-color: #23272b;
    border-color: #1d2124; }
  #PTTChat .btn-dark:focus, #PTTChat .btn-dark.focus {
    color: #fff;
    background-color: #23272b;
    border-color: #1d2124;
    box-shadow: 0 0 0 2px rgba(82, 88, 93, 0.5); }
  #PTTChat .btn-dark.disabled, #PTTChat .btn-dark:disabled {
    color: #fff;
    background-color: #343a40;
    border-color: #343a40; }
  #PTTChat .btn-dark:not(:disabled):not(.disabled):active, #PTTChat .btn-dark:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-dark.dropdown-toggle {
    color: #fff;
    background-color: #1d2124;
    border-color: #171a1d; }
    #PTTChat .btn-dark:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-dark:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-dark.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(82, 88, 93, 0.5); }

#PTTChat .btn-outline-primary {
  color: #007bff;
  border-color: #007bff; }
  #PTTChat .btn-outline-primary:hover {
    color: #fff;
    background-color: #007bff;
    border-color: #007bff; }
  #PTTChat .btn-outline-primary:focus, #PTTChat .btn-outline-primary.focus {
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.5); }
  #PTTChat .btn-outline-primary.disabled, #PTTChat .btn-outline-primary:disabled {
    color: #007bff;
    background-color: transparent; }
  #PTTChat .btn-outline-primary:not(:disabled):not(.disabled):active, #PTTChat .btn-outline-primary:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-outline-primary.dropdown-toggle {
    color: #fff;
    background-color: #007bff;
    border-color: #007bff; }
    #PTTChat .btn-outline-primary:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-outline-primary:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-outline-primary.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.5); }

#PTTChat .btn-outline-secondary {
  color: #6c757d;
  border-color: #6c757d; }
  #PTTChat .btn-outline-secondary:hover {
    color: #fff;
    background-color: #6c757d;
    border-color: #6c757d; }
  #PTTChat .btn-outline-secondary:focus, #PTTChat .btn-outline-secondary.focus {
    box-shadow: 0 0 0 2px rgba(108, 117, 125, 0.5); }
  #PTTChat .btn-outline-secondary.disabled, #PTTChat .btn-outline-secondary:disabled {
    color: #6c757d;
    background-color: transparent; }
  #PTTChat .btn-outline-secondary:not(:disabled):not(.disabled):active, #PTTChat .btn-outline-secondary:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-outline-secondary.dropdown-toggle {
    color: #fff;
    background-color: #6c757d;
    border-color: #6c757d; }
    #PTTChat .btn-outline-secondary:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-outline-secondary:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-outline-secondary.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(108, 117, 125, 0.5); }

#PTTChat .btn-outline-success {
  color: #28a745;
  border-color: #28a745; }
  #PTTChat .btn-outline-success:hover {
    color: #fff;
    background-color: #28a745;
    border-color: #28a745; }
  #PTTChat .btn-outline-success:focus, #PTTChat .btn-outline-success.focus {
    box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.5); }
  #PTTChat .btn-outline-success.disabled, #PTTChat .btn-outline-success:disabled {
    color: #28a745;
    background-color: transparent; }
  #PTTChat .btn-outline-success:not(:disabled):not(.disabled):active, #PTTChat .btn-outline-success:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-outline-success.dropdown-toggle {
    color: #fff;
    background-color: #28a745;
    border-color: #28a745; }
    #PTTChat .btn-outline-success:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-outline-success:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-outline-success.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.5); }

#PTTChat .btn-outline-info {
  color: #17a2b8;
  border-color: #17a2b8; }
  #PTTChat .btn-outline-info:hover {
    color: #fff;
    background-color: #17a2b8;
    border-color: #17a2b8; }
  #PTTChat .btn-outline-info:focus, #PTTChat .btn-outline-info.focus {
    box-shadow: 0 0 0 2px rgba(23, 162, 184, 0.5); }
  #PTTChat .btn-outline-info.disabled, #PTTChat .btn-outline-info:disabled {
    color: #17a2b8;
    background-color: transparent; }
  #PTTChat .btn-outline-info:not(:disabled):not(.disabled):active, #PTTChat .btn-outline-info:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-outline-info.dropdown-toggle {
    color: #fff;
    background-color: #17a2b8;
    border-color: #17a2b8; }
    #PTTChat .btn-outline-info:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-outline-info:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-outline-info.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(23, 162, 184, 0.5); }

#PTTChat .btn-outline-warning {
  color: #ffc107;
  border-color: #ffc107; }
  #PTTChat .btn-outline-warning:hover {
    color: #212529;
    background-color: #ffc107;
    border-color: #ffc107; }
  #PTTChat .btn-outline-warning:focus, #PTTChat .btn-outline-warning.focus {
    box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.5); }
  #PTTChat .btn-outline-warning.disabled, #PTTChat .btn-outline-warning:disabled {
    color: #ffc107;
    background-color: transparent; }
  #PTTChat .btn-outline-warning:not(:disabled):not(.disabled):active, #PTTChat .btn-outline-warning:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-outline-warning.dropdown-toggle {
    color: #212529;
    background-color: #ffc107;
    border-color: #ffc107; }
    #PTTChat .btn-outline-warning:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-outline-warning:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-outline-warning.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.5); }

#PTTChat .btn-outline-danger {
  color: #dc3545;
  border-color: #dc3545; }
  #PTTChat .btn-outline-danger:hover {
    color: #fff;
    background-color: #dc3545;
    border-color: #dc3545; }
  #PTTChat .btn-outline-danger:focus, #PTTChat .btn-outline-danger.focus {
    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.5); }
  #PTTChat .btn-outline-danger.disabled, #PTTChat .btn-outline-danger:disabled {
    color: #dc3545;
    background-color: transparent; }
  #PTTChat .btn-outline-danger:not(:disabled):not(.disabled):active, #PTTChat .btn-outline-danger:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-outline-danger.dropdown-toggle {
    color: #fff;
    background-color: #dc3545;
    border-color: #dc3545; }
    #PTTChat .btn-outline-danger:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-outline-danger:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-outline-danger.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.5); }

#PTTChat .btn-outline-light {
  color: #f8f9fa;
  border-color: #f8f9fa; }
  #PTTChat .btn-outline-light:hover {
    color: #212529;
    background-color: #f8f9fa;
    border-color: #f8f9fa; }
  #PTTChat .btn-outline-light:focus, #PTTChat .btn-outline-light.focus {
    box-shadow: 0 0 0 2px rgba(248, 249, 250, 0.5); }
  #PTTChat .btn-outline-light.disabled, #PTTChat .btn-outline-light:disabled {
    color: #f8f9fa;
    background-color: transparent; }
  #PTTChat .btn-outline-light:not(:disabled):not(.disabled):active, #PTTChat .btn-outline-light:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-outline-light.dropdown-toggle {
    color: #212529;
    background-color: #f8f9fa;
    border-color: #f8f9fa; }
    #PTTChat .btn-outline-light:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-outline-light:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-outline-light.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(248, 249, 250, 0.5); }

#PTTChat .btn-outline-dark {
  color: #343a40;
  border-color: #343a40; }
  #PTTChat .btn-outline-dark:hover {
    color: #fff;
    background-color: #343a40;
    border-color: #343a40; }
  #PTTChat .btn-outline-dark:focus, #PTTChat .btn-outline-dark.focus {
    box-shadow: 0 0 0 2px rgba(52, 58, 64, 0.5); }
  #PTTChat .btn-outline-dark.disabled, #PTTChat .btn-outline-dark:disabled {
    color: #343a40;
    background-color: transparent; }
  #PTTChat .btn-outline-dark:not(:disabled):not(.disabled):active, #PTTChat .btn-outline-dark:not(:disabled):not(.disabled).active,
  .show > #PTTChat .btn-outline-dark.dropdown-toggle {
    color: #fff;
    background-color: #343a40;
    border-color: #343a40; }
    #PTTChat .btn-outline-dark:not(:disabled):not(.disabled):active:focus, #PTTChat .btn-outline-dark:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat .btn-outline-dark.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(52, 58, 64, 0.5); }

#PTTChat .btn-link {
  font-weight: 400;
  color: #007bff;
  text-decoration: none; }
  #PTTChat .btn-link:hover {
    color: #0056b3;
    text-decoration: underline; }
  #PTTChat .btn-link:focus, #PTTChat .btn-link.focus {
    text-decoration: underline; }
  #PTTChat .btn-link:disabled, #PTTChat .btn-link.disabled {
    color: #6c757d;
    pointer-events: none; }

#PTTChat .btn-lg, #PTTChat .btn-group-lg > .btn {
  padding: 3px 10px;
  font-size: 15px;
  line-height: 1.5;
  border-radius: 2.5px; }

#PTTChat .btn-sm, #PTTChat .btn-group-sm > .btn {
  padding: 2.5px 0.5rem;
  font-size: 10.5px;
  line-height: 18px;
  border-radius: 2.5px; }

#PTTChat .btn-block {
  display: block;
  width: 100%; }
  #PTTChat .btn-block + .btn-block {
    margin-top: 0.5rem; }

#PTTChat input[type="submit"].btn-block,
#PTTChat input[type="reset"].btn-block,
#PTTChat input[type="button"].btn-block {
  width: 100%; }

#PTTChat .fade {
  transition: opacity 0.15s linear; }
  @media (prefers-reduced-motion: reduce) {
    #PTTChat .fade {
      transition: none; } }
  #PTTChat .fade:not(.show) {
    opacity: 0; }

#PTTChat .collapse:not(.show) {
  display: none; }

#PTTChat .collapsing {
  position: relative;
  height: 0;
  overflow: hidden;
  transition: height 0.35s ease; }
  @media (prefers-reduced-motion: reduce) {
    #PTTChat .collapsing {
      transition: none; } }

#PTTChat .dropup,
#PTTChat .dropright,
#PTTChat .dropdown,
#PTTChat .dropleft {
  position: relative; }

#PTTChat .dropdown-toggle {
  white-space: nowrap; }
  #PTTChat .dropdown-toggle::after {
    display: inline-block;
    margin-left: 0.255em;
    vertical-align: 0.255em;
    content: "";
    border-top: 0.3em solid;
    border-right: 0.3em solid transparent;
    border-bottom: 0;
    border-left: 0.3em solid transparent; }
  #PTTChat .dropdown-toggle:empty::after {
    margin-left: 0; }

#PTTChat .dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  display: none;
  float: left;
  min-width: 10rem;
  padding: 0.5rem 0;
  margin: 0.125rem 0 0;
  font-size: 12px;
  color: #212529;
  text-align: left;
  list-style: none;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 2.5px; }

#PTTChat .dropdown-menu-left {
  right: auto;
  left: 0; }

#PTTChat .dropdown-menu-right {
  right: 0;
  left: auto; }

@media (min-width: 576px) {
  #PTTChat .dropdown-menu-sm-left {
    right: auto;
    left: 0; }
  #PTTChat .dropdown-menu-sm-right {
    right: 0;
    left: auto; } }

@media (min-width: 768px) {
  #PTTChat .dropdown-menu-md-left {
    right: auto;
    left: 0; }
  #PTTChat .dropdown-menu-md-right {
    right: 0;
    left: auto; } }

@media (min-width: 992px) {
  #PTTChat .dropdown-menu-lg-left {
    right: auto;
    left: 0; }
  #PTTChat .dropdown-menu-lg-right {
    right: 0;
    left: auto; } }

@media (min-width: 1200px) {
  #PTTChat .dropdown-menu-xl-left {
    right: auto;
    left: 0; }
  #PTTChat .dropdown-menu-xl-right {
    right: 0;
    left: auto; } }

#PTTChat .dropup .dropdown-menu {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 0.125rem; }

#PTTChat .dropup .dropdown-toggle::after {
  display: inline-block;
  margin-left: 0.255em;
  vertical-align: 0.255em;
  content: "";
  border-top: 0;
  border-right: 0.3em solid transparent;
  border-bottom: 0.3em solid;
  border-left: 0.3em solid transparent; }

#PTTChat .dropup .dropdown-toggle:empty::after {
  margin-left: 0; }

#PTTChat .dropright .dropdown-menu {
  top: 0;
  right: auto;
  left: 100%;
  margin-top: 0;
  margin-left: 0.125rem; }

#PTTChat .dropright .dropdown-toggle::after {
  display: inline-block;
  margin-left: 0.255em;
  vertical-align: 0.255em;
  content: "";
  border-top: 0.3em solid transparent;
  border-right: 0;
  border-bottom: 0.3em solid transparent;
  border-left: 0.3em solid; }

#PTTChat .dropright .dropdown-toggle:empty::after {
  margin-left: 0; }

#PTTChat .dropright .dropdown-toggle::after {
  vertical-align: 0; }

#PTTChat .dropleft .dropdown-menu {
  top: 0;
  right: 100%;
  left: auto;
  margin-top: 0;
  margin-right: 0.125rem; }

#PTTChat .dropleft .dropdown-toggle::after {
  display: inline-block;
  margin-left: 0.255em;
  vertical-align: 0.255em;
  content: ""; }

#PTTChat .dropleft .dropdown-toggle::after {
  display: none; }

#PTTChat .dropleft .dropdown-toggle::before {
  display: inline-block;
  margin-right: 0.255em;
  vertical-align: 0.255em;
  content: "";
  border-top: 0.3em solid transparent;
  border-right: 0.3em solid;
  border-bottom: 0.3em solid transparent; }

#PTTChat .dropleft .dropdown-toggle:empty::after {
  margin-left: 0; }

#PTTChat .dropleft .dropdown-toggle::before {
  vertical-align: 0; }

#PTTChat .dropdown-menu[x-placement^="top"], #PTTChat .dropdown-menu[x-placement^="right"], #PTTChat .dropdown-menu[x-placement^="bottom"], #PTTChat .dropdown-menu[x-placement^="left"] {
  right: auto;
  bottom: auto; }

#PTTChat .dropdown-divider {
  height: 0;
  margin: 5px 0;
  overflow: hidden;
  border-top: 1px solid #e9ecef; }

#PTTChat .dropdown-item {
  display: block;
  width: 100%;
  padding: 0.25rem 1.5rem;
  clear: both;
  font-weight: 400;
  color: #212529;
  text-align: inherit;
  white-space: nowrap;
  background-color: transparent;
  border: 0; }
  #PTTChat .dropdown-item:hover, #PTTChat .dropdown-item:focus {
    color: #16181b;
    text-decoration: none;
    background-color: #e9ecef; }
  #PTTChat .dropdown-item.active, #PTTChat .dropdown-item:active {
    color: #fff;
    text-decoration: none;
    background-color: #007bff; }
  #PTTChat .dropdown-item.disabled, #PTTChat .dropdown-item:disabled {
    color: #adb5bd;
    pointer-events: none;
    background-color: transparent; }

#PTTChat .dropdown-menu.show {
  display: block; }

#PTTChat .dropdown-header {
  display: block;
  padding: 0.5rem 1.5rem;
  margin-bottom: 0;
  font-size: 10.5px;
  color: #6c757d;
  white-space: nowrap; }

#PTTChat .dropdown-item-text {
  display: block;
  padding: 0.25rem 1.5rem;
  color: #212529; }

#PTTChat .btn-group,
#PTTChat .btn-group-vertical {
  position: relative;
  display: inline-flex;
  vertical-align: middle; }
  #PTTChat .btn-group > .btn,
  #PTTChat .btn-group-vertical > .btn {
    position: relative;
    flex: 1 1 auto; }
    #PTTChat .btn-group > .btn:hover,
    #PTTChat .btn-group-vertical > .btn:hover {
      z-index: 1; }
    #PTTChat .btn-group > .btn:focus, #PTTChat .btn-group > .btn:active, #PTTChat .btn-group > .btn.active,
    #PTTChat .btn-group-vertical > .btn:focus,
    #PTTChat .btn-group-vertical > .btn:active,
    #PTTChat .btn-group-vertical > .btn.active {
      z-index: 1; }

#PTTChat .btn-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start; }
  #PTTChat .btn-toolbar .input-group {
    width: auto; }

#PTTChat .btn-group > .btn:not(:first-child),
#PTTChat .btn-group > .btn-group:not(:first-child) {
  margin-left: -1px; }

#PTTChat .btn-group > .btn:not(:last-child):not(.dropdown-toggle),
#PTTChat .btn-group > .btn-group:not(:last-child) > .btn {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0; }

#PTTChat .btn-group > .btn:not(:first-child),
#PTTChat .btn-group > .btn-group:not(:first-child) > .btn {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0; }

#PTTChat .dropdown-toggle-split {
  padding-right: 5.625px;
  padding-left: 5.625px; }
  #PTTChat .dropdown-toggle-split::after,
  .dropup #PTTChat .dropdown-toggle-split::after,
  .dropright #PTTChat .dropdown-toggle-split::after {
    margin-left: 0; }
  .dropleft #PTTChat .dropdown-toggle-split::before {
    margin-right: 0; }

#PTTChat .btn-sm + .dropdown-toggle-split, #PTTChat .btn-group-sm > .btn + .dropdown-toggle-split {
  padding-right: 0.375rem;
  padding-left: 0.375rem; }

#PTTChat .btn-lg + .dropdown-toggle-split, #PTTChat .btn-group-lg > .btn + .dropdown-toggle-split {
  padding-right: 7.5px;
  padding-left: 7.5px; }

#PTTChat .btn-group-vertical {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center; }
  #PTTChat .btn-group-vertical > .btn,
  #PTTChat .btn-group-vertical > .btn-group {
    width: 100%; }
  #PTTChat .btn-group-vertical > .btn:not(:first-child),
  #PTTChat .btn-group-vertical > .btn-group:not(:first-child) {
    margin-top: -1px; }
  #PTTChat .btn-group-vertical > .btn:not(:last-child):not(.dropdown-toggle),
  #PTTChat .btn-group-vertical > .btn-group:not(:last-child) > .btn {
    border-bottom-right-radius: 0;
    border-bottom-left-radius: 0; }
  #PTTChat .btn-group-vertical > .btn:not(:first-child),
  #PTTChat .btn-group-vertical > .btn-group:not(:first-child) > .btn {
    border-top-left-radius: 0;
    border-top-right-radius: 0; }

#PTTChat .btn-group-toggle > .btn,
#PTTChat .btn-group-toggle > .btn-group > .btn {
  margin-bottom: 0; }
  #PTTChat .btn-group-toggle > .btn input[type="radio"],
  #PTTChat .btn-group-toggle > .btn input[type="checkbox"],
  #PTTChat .btn-group-toggle > .btn-group > .btn input[type="radio"],
  #PTTChat .btn-group-toggle > .btn-group > .btn input[type="checkbox"] {
    position: absolute;
    clip: rect(0, 0, 0, 0);
    pointer-events: none; }

#PTTChat .nav {
  display: flex;
  flex-wrap: wrap;
  padding-left: 0;
  margin-bottom: 0;
  list-style: none; }

#PTTChat .nav-link {
  display: block;
  padding: 5px 10px; }
  #PTTChat .nav-link:hover, #PTTChat .nav-link:focus {
    text-decoration: none; }
  #PTTChat .nav-link.disabled {
    color: #6c757d;
    pointer-events: none;
    cursor: default; }

#PTTChat .nav-tabs {
  border-bottom: 1px solid #dee2e6; }
  #PTTChat .nav-tabs .nav-link {
    margin-bottom: -1px;
    border: 1px solid transparent;
    border-top-left-radius: 2.5px;
    border-top-right-radius: 2.5px; }
    #PTTChat .nav-tabs .nav-link:hover, #PTTChat .nav-tabs .nav-link:focus {
      border-color: #e9ecef #e9ecef #dee2e6; }
    #PTTChat .nav-tabs .nav-link.disabled {
      color: #6c757d;
      background-color: transparent;
      border-color: transparent; }
  #PTTChat .nav-tabs .nav-link.active,
  #PTTChat .nav-tabs .nav-item.show .nav-link {
    color: #495057;
    background-color: #fff;
    border-color: #dee2e6 #dee2e6 #fff; }
  #PTTChat .nav-tabs .dropdown-menu {
    margin-top: -1px;
    border-top-left-radius: 0;
    border-top-right-radius: 0; }

#PTTChat .nav-pills .nav-link {
  border-radius: 2.5px; }

#PTTChat .nav-pills .nav-link.active,
#PTTChat .nav-pills .show > .nav-link {
  color: #fff;
  background-color: #007bff; }

#PTTChat .nav-fill > .nav-link,
#PTTChat .nav-fill .nav-item {
  flex: 1 1 auto;
  text-align: center; }

#PTTChat .nav-justified > .nav-link,
#PTTChat .nav-justified .nav-item {
  flex-basis: 0;
  flex-grow: 1;
  text-align: center; }

#PTTChat .tab-content > .tab-pane {
  display: none; }

#PTTChat .tab-content > .active {
  display: block; }

#PTTChat .navbar {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px; }
  #PTTChat .navbar .container,
  #PTTChat .navbar .container-fluid, #PTTChat .navbar .container-sm, #PTTChat .navbar .container-md, #PTTChat .navbar .container-lg, #PTTChat .navbar .container-xl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between; }

#PTTChat .navbar-brand {
  display: inline-block;
  padding-top: 2.75px;
  padding-bottom: 2.75px;
  margin-right: 10px;
  font-size: 15px;
  line-height: inherit;
  white-space: nowrap; }
  #PTTChat .navbar-brand:hover, #PTTChat .navbar-brand:focus {
    text-decoration: none; }

#PTTChat .navbar-nav {
  display: flex;
  flex-direction: column;
  padding-left: 0;
  margin-bottom: 0;
  list-style: none; }
  #PTTChat .navbar-nav .nav-link {
    padding-right: 0;
    padding-left: 0; }
  #PTTChat .navbar-nav .dropdown-menu {
    position: static;
    float: none; }

#PTTChat .navbar-text {
  display: inline-block;
  padding-top: 5px;
  padding-bottom: 5px; }

#PTTChat .navbar-collapse {
  flex-basis: 100%;
  flex-grow: 1;
  align-items: center; }

#PTTChat .navbar-toggler {
  padding: 0.25rem 0.75rem;
  font-size: 15px;
  line-height: 1;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 2.5px; }
  #PTTChat .navbar-toggler:hover, #PTTChat .navbar-toggler:focus {
    text-decoration: none; }

#PTTChat .navbar-toggler-icon {
  display: inline-block;
  width: 1.5em;
  height: 1.5em;
  vertical-align: middle;
  content: "";
  background: 50% / 100% 100% no-repeat; }

#PTTChat .navbar-nav-scroll {
  max-height: 75vh;
  overflow-y: auto; }

@media (max-width: 575.98px) {
  #PTTChat .navbar-expand-sm > .container,
  #PTTChat .navbar-expand-sm > .container-fluid, #PTTChat .navbar-expand-sm > .container-sm, #PTTChat .navbar-expand-sm > .container-md, #PTTChat .navbar-expand-sm > .container-lg, #PTTChat .navbar-expand-sm > .container-xl {
    padding-right: 0;
    padding-left: 0; } }

@media (min-width: 576px) {
  #PTTChat .navbar-expand-sm {
    flex-flow: row nowrap;
    justify-content: flex-start; }
    #PTTChat .navbar-expand-sm .navbar-nav {
      flex-direction: row; }
      #PTTChat .navbar-expand-sm .navbar-nav .dropdown-menu {
        position: absolute; }
      #PTTChat .navbar-expand-sm .navbar-nav .nav-link {
        padding-right: 0.5rem;
        padding-left: 0.5rem; }
    #PTTChat .navbar-expand-sm > .container,
    #PTTChat .navbar-expand-sm > .container-fluid, #PTTChat .navbar-expand-sm > .container-sm, #PTTChat .navbar-expand-sm > .container-md, #PTTChat .navbar-expand-sm > .container-lg, #PTTChat .navbar-expand-sm > .container-xl {
      flex-wrap: nowrap; }
    #PTTChat .navbar-expand-sm .navbar-nav-scroll {
      overflow: visible; }
    #PTTChat .navbar-expand-sm .navbar-collapse {
      display: flex !important;
      flex-basis: auto; }
    #PTTChat .navbar-expand-sm .navbar-toggler {
      display: none; } }

@media (max-width: 767.98px) {
  #PTTChat .navbar-expand-md > .container,
  #PTTChat .navbar-expand-md > .container-fluid, #PTTChat .navbar-expand-md > .container-sm, #PTTChat .navbar-expand-md > .container-md, #PTTChat .navbar-expand-md > .container-lg, #PTTChat .navbar-expand-md > .container-xl {
    padding-right: 0;
    padding-left: 0; } }

@media (min-width: 768px) {
  #PTTChat .navbar-expand-md {
    flex-flow: row nowrap;
    justify-content: flex-start; }
    #PTTChat .navbar-expand-md .navbar-nav {
      flex-direction: row; }
      #PTTChat .navbar-expand-md .navbar-nav .dropdown-menu {
        position: absolute; }
      #PTTChat .navbar-expand-md .navbar-nav .nav-link {
        padding-right: 0.5rem;
        padding-left: 0.5rem; }
    #PTTChat .navbar-expand-md > .container,
    #PTTChat .navbar-expand-md > .container-fluid, #PTTChat .navbar-expand-md > .container-sm, #PTTChat .navbar-expand-md > .container-md, #PTTChat .navbar-expand-md > .container-lg, #PTTChat .navbar-expand-md > .container-xl {
      flex-wrap: nowrap; }
    #PTTChat .navbar-expand-md .navbar-nav-scroll {
      overflow: visible; }
    #PTTChat .navbar-expand-md .navbar-collapse {
      display: flex !important;
      flex-basis: auto; }
    #PTTChat .navbar-expand-md .navbar-toggler {
      display: none; } }

@media (max-width: 991.98px) {
  #PTTChat .navbar-expand-lg > .container,
  #PTTChat .navbar-expand-lg > .container-fluid, #PTTChat .navbar-expand-lg > .container-sm, #PTTChat .navbar-expand-lg > .container-md, #PTTChat .navbar-expand-lg > .container-lg, #PTTChat .navbar-expand-lg > .container-xl {
    padding-right: 0;
    padding-left: 0; } }

@media (min-width: 992px) {
  #PTTChat .navbar-expand-lg {
    flex-flow: row nowrap;
    justify-content: flex-start; }
    #PTTChat .navbar-expand-lg .navbar-nav {
      flex-direction: row; }
      #PTTChat .navbar-expand-lg .navbar-nav .dropdown-menu {
        position: absolute; }
      #PTTChat .navbar-expand-lg .navbar-nav .nav-link {
        padding-right: 0.5rem;
        padding-left: 0.5rem; }
    #PTTChat .navbar-expand-lg > .container,
    #PTTChat .navbar-expand-lg > .container-fluid, #PTTChat .navbar-expand-lg > .container-sm, #PTTChat .navbar-expand-lg > .container-md, #PTTChat .navbar-expand-lg > .container-lg, #PTTChat .navbar-expand-lg > .container-xl {
      flex-wrap: nowrap; }
    #PTTChat .navbar-expand-lg .navbar-nav-scroll {
      overflow: visible; }
    #PTTChat .navbar-expand-lg .navbar-collapse {
      display: flex !important;
      flex-basis: auto; }
    #PTTChat .navbar-expand-lg .navbar-toggler {
      display: none; } }

@media (max-width: 1199.98px) {
  #PTTChat .navbar-expand-xl > .container,
  #PTTChat .navbar-expand-xl > .container-fluid, #PTTChat .navbar-expand-xl > .container-sm, #PTTChat .navbar-expand-xl > .container-md, #PTTChat .navbar-expand-xl > .container-lg, #PTTChat .navbar-expand-xl > .container-xl {
    padding-right: 0;
    padding-left: 0; } }

@media (min-width: 1200px) {
  #PTTChat .navbar-expand-xl {
    flex-flow: row nowrap;
    justify-content: flex-start; }
    #PTTChat .navbar-expand-xl .navbar-nav {
      flex-direction: row; }
      #PTTChat .navbar-expand-xl .navbar-nav .dropdown-menu {
        position: absolute; }
      #PTTChat .navbar-expand-xl .navbar-nav .nav-link {
        padding-right: 0.5rem;
        padding-left: 0.5rem; }
    #PTTChat .navbar-expand-xl > .container,
    #PTTChat .navbar-expand-xl > .container-fluid, #PTTChat .navbar-expand-xl > .container-sm, #PTTChat .navbar-expand-xl > .container-md, #PTTChat .navbar-expand-xl > .container-lg, #PTTChat .navbar-expand-xl > .container-xl {
      flex-wrap: nowrap; }
    #PTTChat .navbar-expand-xl .navbar-nav-scroll {
      overflow: visible; }
    #PTTChat .navbar-expand-xl .navbar-collapse {
      display: flex !important;
      flex-basis: auto; }
    #PTTChat .navbar-expand-xl .navbar-toggler {
      display: none; } }

#PTTChat .navbar-expand {
  flex-flow: row nowrap;
  justify-content: flex-start; }
  #PTTChat .navbar-expand > .container,
  #PTTChat .navbar-expand > .container-fluid, #PTTChat .navbar-expand > .container-sm, #PTTChat .navbar-expand > .container-md, #PTTChat .navbar-expand > .container-lg, #PTTChat .navbar-expand > .container-xl {
    padding-right: 0;
    padding-left: 0; }
  #PTTChat .navbar-expand .navbar-nav {
    flex-direction: row; }
    #PTTChat .navbar-expand .navbar-nav .dropdown-menu {
      position: absolute; }
    #PTTChat .navbar-expand .navbar-nav .nav-link {
      padding-right: 0.5rem;
      padding-left: 0.5rem; }
  #PTTChat .navbar-expand > .container,
  #PTTChat .navbar-expand > .container-fluid, #PTTChat .navbar-expand > .container-sm, #PTTChat .navbar-expand > .container-md, #PTTChat .navbar-expand > .container-lg, #PTTChat .navbar-expand > .container-xl {
    flex-wrap: nowrap; }
  #PTTChat .navbar-expand .navbar-nav-scroll {
    overflow: visible; }
  #PTTChat .navbar-expand .navbar-collapse {
    display: flex !important;
    flex-basis: auto; }
  #PTTChat .navbar-expand .navbar-toggler {
    display: none; }

#PTTChat .navbar-light .navbar-brand {
  color: rgba(0, 0, 0, 0.9); }
  #PTTChat .navbar-light .navbar-brand:hover, #PTTChat .navbar-light .navbar-brand:focus {
    color: rgba(0, 0, 0, 0.9); }

#PTTChat .navbar-light .navbar-nav .nav-link {
  color: rgba(0, 0, 0, 0.5); }
  #PTTChat .navbar-light .navbar-nav .nav-link:hover, #PTTChat .navbar-light .navbar-nav .nav-link:focus {
    color: rgba(0, 0, 0, 0.7); }
  #PTTChat .navbar-light .navbar-nav .nav-link.disabled {
    color: rgba(0, 0, 0, 0.3); }

#PTTChat .navbar-light .navbar-nav .show > .nav-link,
#PTTChat .navbar-light .navbar-nav .active > .nav-link,
#PTTChat .navbar-light .navbar-nav .nav-link.show,
#PTTChat .navbar-light .navbar-nav .nav-link.active {
  color: rgba(0, 0, 0, 0.9); }

#PTTChat .navbar-light .navbar-toggler {
  color: rgba(0, 0, 0, 0.5);
  border-color: rgba(0, 0, 0, 0.1); }

#PTTChat .navbar-light .navbar-toggler-icon {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%280, 0, 0, 0.5%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e"); }

#PTTChat .navbar-light .navbar-text {
  color: rgba(0, 0, 0, 0.5); }
  #PTTChat .navbar-light .navbar-text a {
    color: rgba(0, 0, 0, 0.9); }
    #PTTChat .navbar-light .navbar-text a:hover, #PTTChat .navbar-light .navbar-text a:focus {
      color: rgba(0, 0, 0, 0.9); }

#PTTChat .navbar-dark .navbar-brand {
  color: #fff; }
  #PTTChat .navbar-dark .navbar-brand:hover, #PTTChat .navbar-dark .navbar-brand:focus {
    color: #fff; }

#PTTChat .navbar-dark .navbar-nav .nav-link {
  color: rgba(255, 255, 255, 0.5); }
  #PTTChat .navbar-dark .navbar-nav .nav-link:hover, #PTTChat .navbar-dark .navbar-nav .nav-link:focus {
    color: rgba(255, 255, 255, 0.75); }
  #PTTChat .navbar-dark .navbar-nav .nav-link.disabled {
    color: rgba(255, 255, 255, 0.25); }

#PTTChat .navbar-dark .navbar-nav .show > .nav-link,
#PTTChat .navbar-dark .navbar-nav .active > .nav-link,
#PTTChat .navbar-dark .navbar-nav .nav-link.show,
#PTTChat .navbar-dark .navbar-nav .nav-link.active {
  color: #fff; }

#PTTChat .navbar-dark .navbar-toggler {
  color: rgba(255, 255, 255, 0.5);
  border-color: rgba(255, 255, 255, 0.1); }

#PTTChat .navbar-dark .navbar-toggler-icon {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%28255, 255, 255, 0.5%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e"); }

#PTTChat .navbar-dark .navbar-text {
  color: rgba(255, 255, 255, 0.5); }
  #PTTChat .navbar-dark .navbar-text a {
    color: #fff; }
    #PTTChat .navbar-dark .navbar-text a:hover, #PTTChat .navbar-dark .navbar-text a:focus {
      color: #fff; }

#PTTChat .card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  word-wrap: break-word;
  background-color: #fff;
  background-clip: border-box;
  border: 1px solid rgba(0, 0, 0, 0.125);
  border-radius: 2.5px; }
  #PTTChat .card > hr {
    margin-right: 0;
    margin-left: 0; }
  #PTTChat .card > .list-group {
    border-top: inherit;
    border-bottom: inherit; }
    #PTTChat .card > .list-group:first-child {
      border-top-width: 0;
      border-top-left-radius: 1.5px;
      border-top-right-radius: 1.5px; }
    #PTTChat .card > .list-group:last-child {
      border-bottom-width: 0;
      border-bottom-right-radius: 1.5px;
      border-bottom-left-radius: 1.5px; }
  #PTTChat .card > .card-header + .list-group,
  #PTTChat .card > .list-group + .card-footer {
    border-top: 0; }

#PTTChat .card-body {
  flex: 1 1 auto;
  min-height: 1px;
  padding: 12.5px; }

#PTTChat .card-title {
  margin-bottom: 7.5px; }

#PTTChat .card-subtitle {
  margin-top: -3.75px;
  margin-bottom: 0; }

#PTTChat .card-text:last-child {
  margin-bottom: 0; }

#PTTChat .card-link:hover {
  text-decoration: none; }

#PTTChat .card-link + .card-link {
  margin-left: 12.5px; }

#PTTChat .card-header {
  padding: 7.5px 12.5px;
  margin-bottom: 0;
  background-color: rgba(0, 0, 0, 0.03);
  border-bottom: 1px solid rgba(0, 0, 0, 0.125); }
  #PTTChat .card-header:first-child {
    border-radius: 1.5px 1.5px 0 0; }

#PTTChat .card-footer {
  padding: 7.5px 12.5px;
  background-color: rgba(0, 0, 0, 0.03);
  border-top: 1px solid rgba(0, 0, 0, 0.125); }
  #PTTChat .card-footer:last-child {
    border-radius: 0 0 1.5px 1.5px; }

#PTTChat .card-header-tabs {
  margin-right: -6.25px;
  margin-bottom: -7.5px;
  margin-left: -6.25px;
  border-bottom: 0; }

#PTTChat .card-header-pills {
  margin-right: -6.25px;
  margin-left: -6.25px; }

#PTTChat .card-img-overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 1.25rem;
  border-radius: 1.5px; }

#PTTChat .card-img,
#PTTChat .card-img-top,
#PTTChat .card-img-bottom {
  flex-shrink: 0;
  width: 100%; }

#PTTChat .card-img,
#PTTChat .card-img-top {
  border-top-left-radius: 1.5px;
  border-top-right-radius: 1.5px; }

#PTTChat .card-img,
#PTTChat .card-img-bottom {
  border-bottom-right-radius: 1.5px;
  border-bottom-left-radius: 1.5px; }

#PTTChat .card-deck .card {
  margin-bottom: 15px; }

@media (min-width: 576px) {
  #PTTChat .card-deck {
    display: flex;
    flex-flow: row wrap;
    margin-right: -15px;
    margin-left: -15px; }
    #PTTChat .card-deck .card {
      flex: 1 0 0%;
      margin-right: 15px;
      margin-bottom: 0;
      margin-left: 15px; } }

#PTTChat .card-group > .card {
  margin-bottom: 15px; }

@media (min-width: 576px) {
  #PTTChat .card-group {
    display: flex;
    flex-flow: row wrap; }
    #PTTChat .card-group > .card {
      flex: 1 0 0%;
      margin-bottom: 0; }
      #PTTChat .card-group > .card + .card {
        margin-left: 0;
        border-left: 0; }
      #PTTChat .card-group > .card:not(:last-child) {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0; }
        #PTTChat .card-group > .card:not(:last-child) .card-img-top,
        #PTTChat .card-group > .card:not(:last-child) .card-header {
          border-top-right-radius: 0; }
        #PTTChat .card-group > .card:not(:last-child) .card-img-bottom,
        #PTTChat .card-group > .card:not(:last-child) .card-footer {
          border-bottom-right-radius: 0; }
      #PTTChat .card-group > .card:not(:first-child) {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0; }
        #PTTChat .card-group > .card:not(:first-child) .card-img-top,
        #PTTChat .card-group > .card:not(:first-child) .card-header {
          border-top-left-radius: 0; }
        #PTTChat .card-group > .card:not(:first-child) .card-img-bottom,
        #PTTChat .card-group > .card:not(:first-child) .card-footer {
          border-bottom-left-radius: 0; } }

#PTTChat .card-columns .card {
  margin-bottom: 7.5px; }

@media (min-width: 576px) {
  #PTTChat .card-columns {
    column-count: 3;
    column-gap: 1.25rem;
    orphans: 1;
    widows: 1; }
    #PTTChat .card-columns .card {
      display: inline-block;
      width: 100%; } }

#PTTChat .accordion {
  overflow-anchor: none; }
  #PTTChat .accordion > .card {
    overflow: hidden; }
    #PTTChat .accordion > .card:not(:last-of-type) {
      border-bottom: 0;
      border-bottom-right-radius: 0;
      border-bottom-left-radius: 0; }
    #PTTChat .accordion > .card:not(:first-of-type) {
      border-top-left-radius: 0;
      border-top-right-radius: 0; }
    #PTTChat .accordion > .card > .card-header {
      border-radius: 0;
      margin-bottom: -1px; }

#PTTChat .alert {
  position: relative;
  padding: 7.5px 12.5px;
  margin-bottom: 1rem;
  border: 1px solid transparent;
  border-radius: 2.5px; }

#PTTChat .alert-heading {
  color: inherit; }

#PTTChat .alert-link {
  font-weight: 700; }

#PTTChat .alert-dismissible {
  padding-right: 43px; }
  #PTTChat .alert-dismissible .close {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
    padding: 7.5px 12.5px;
    color: inherit; }

#PTTChat .alert-primary {
  color: #004085;
  background-color: #cce5ff;
  border-color: #b8daff; }
  #PTTChat .alert-primary hr {
    border-top-color: #9fcdff; }
  #PTTChat .alert-primary .alert-link {
    color: #002752; }

#PTTChat .alert-secondary {
  color: #383d41;
  background-color: #e2e3e5;
  border-color: #d6d8db; }
  #PTTChat .alert-secondary hr {
    border-top-color: #c8cbcf; }
  #PTTChat .alert-secondary .alert-link {
    color: #202326; }

#PTTChat .alert-success {
  color: #155724;
  background-color: #d4edda;
  border-color: #c3e6cb; }
  #PTTChat .alert-success hr {
    border-top-color: #b1dfbb; }
  #PTTChat .alert-success .alert-link {
    color: #0b2e13; }

#PTTChat .alert-info {
  color: #0c5460;
  background-color: #d1ecf1;
  border-color: #bee5eb; }
  #PTTChat .alert-info hr {
    border-top-color: #abdde5; }
  #PTTChat .alert-info .alert-link {
    color: #062c33; }

#PTTChat .alert-warning {
  color: #856404;
  background-color: #fff3cd;
  border-color: #ffeeba; }
  #PTTChat .alert-warning hr {
    border-top-color: #ffe8a1; }
  #PTTChat .alert-warning .alert-link {
    color: #533f03; }

#PTTChat .alert-danger {
  color: #721c24;
  background-color: #f8d7da;
  border-color: #f5c6cb; }
  #PTTChat .alert-danger hr {
    border-top-color: #f1b0b7; }
  #PTTChat .alert-danger .alert-link {
    color: #491217; }

#PTTChat .alert-light {
  color: #818182;
  background-color: #fefefe;
  border-color: #fdfdfe; }
  #PTTChat .alert-light hr {
    border-top-color: #ececf6; }
  #PTTChat .alert-light .alert-link {
    color: #686868; }

#PTTChat .alert-dark {
  color: #1b1e21;
  background-color: #d6d8d9;
  border-color: #c6c8ca; }
  #PTTChat .alert-dark hr {
    border-top-color: #b9bbbe; }
  #PTTChat .alert-dark .alert-link {
    color: #040505; }

#PTTChat .media {
  display: flex;
  align-items: flex-start; }

#PTTChat .media-body {
  flex: 1; }

#PTTChat .close {
  float: right;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  color: #000;
  text-shadow: 0 1px 0 #fff;
  opacity: .5; }
  #PTTChat .close:hover {
    color: #000;
    text-decoration: none; }
  #PTTChat .close:not(:disabled):not(.disabled):hover, #PTTChat .close:not(:disabled):not(.disabled):focus {
    opacity: .75; }

#PTTChat button.close {
  padding: 0;
  background-color: transparent;
  border: 0; }

#PTTChat a.close.disabled {
  pointer-events: none; }

#PTTChat .modal-open {
  overflow: hidden; }
  #PTTChat .modal-open .modal {
    overflow-x: hidden;
    overflow-y: auto; }

#PTTChat .modal {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1050;
  display: none;
  width: 100%;
  height: 100%;
  overflow: hidden;
  outline: 0; }

#PTTChat .modal-dialog {
  position: relative;
  width: auto;
  margin: 0.5rem;
  pointer-events: none; }
  .modal.fade #PTTChat .modal-dialog {
    transition: transform 0.3s ease-out;
    transform: translate(0, -50px); }
    @media (prefers-reduced-motion: reduce) {
      .modal.fade #PTTChat .modal-dialog {
        transition: none; } }
  .modal.show #PTTChat .modal-dialog {
    transform: none; }
  .modal.modal-static #PTTChat .modal-dialog {
    transform: scale(1.02); }

#PTTChat .modal-dialog-scrollable {
  display: flex;
  max-height: calc(100% - 1rem); }
  #PTTChat .modal-dialog-scrollable .modal-content {
    max-height: calc(100vh - 1rem);
    overflow: hidden; }
  #PTTChat .modal-dialog-scrollable .modal-header,
  #PTTChat .modal-dialog-scrollable .modal-footer {
    flex-shrink: 0; }
  #PTTChat .modal-dialog-scrollable .modal-body {
    overflow-y: auto; }

#PTTChat .modal-dialog-centered {
  display: flex;
  align-items: center;
  min-height: calc(100% - 1rem); }
  #PTTChat .modal-dialog-centered::before {
    display: block;
    height: calc(100vh - 1rem);
    height: min-content;
    content: ""; }
  #PTTChat .modal-dialog-centered.modal-dialog-scrollable {
    flex-direction: column;
    justify-content: center;
    height: 100%; }
    #PTTChat .modal-dialog-centered.modal-dialog-scrollable .modal-content {
      max-height: none; }
    #PTTChat .modal-dialog-centered.modal-dialog-scrollable::before {
      content: none; }

#PTTChat .modal-content {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  pointer-events: auto;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 2.5px;
  outline: 0; }

#PTTChat .modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1040;
  width: 100vw;
  height: 100vh;
  background-color: #000; }
  #PTTChat .modal-backdrop.fade {
    opacity: 0; }
  #PTTChat .modal-backdrop.show {
    opacity: 0.5; }

#PTTChat .modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem 1rem;
  border-bottom: 1px solid #dee2e6;
  border-top-left-radius: 1.5px;
  border-top-right-radius: 1.5px; }
  #PTTChat .modal-header .close {
    padding: 1rem 1rem;
    margin: -1rem -1rem -1rem auto; }

#PTTChat .modal-title {
  margin-bottom: 0;
  line-height: 1.5; }

#PTTChat .modal-body {
  position: relative;
  flex: 1 1 auto;
  padding: 1rem; }

#PTTChat .modal-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  padding: 0.75rem;
  border-top: 1px solid #dee2e6;
  border-bottom-right-radius: 1.5px;
  border-bottom-left-radius: 1.5px; }
  #PTTChat .modal-footer > * {
    margin: 0.25rem; }

#PTTChat .modal-scrollbar-measure {
  position: absolute;
  top: -9999px;
  width: 50px;
  height: 50px;
  overflow: scroll; }

@media (min-width: 576px) {
  #PTTChat .modal-dialog {
    max-width: 500px;
    margin: 1.75rem auto; }
  #PTTChat .modal-dialog-scrollable {
    max-height: calc(100% - 3.5rem); }
    #PTTChat .modal-dialog-scrollable .modal-content {
      max-height: calc(100vh - 3.5rem); }
  #PTTChat .modal-dialog-centered {
    min-height: calc(100% - 3.5rem); }
    #PTTChat .modal-dialog-centered::before {
      height: calc(100vh - 3.5rem);
      height: min-content; }
  #PTTChat .modal-sm {
    max-width: 300px; } }

@media (min-width: 992px) {
  #PTTChat .modal-lg,
  #PTTChat .modal-xl {
    max-width: 800px; } }

@media (min-width: 1200px) {
  #PTTChat .modal-xl {
    max-width: 1140px; } }

#PTTChat .align-baseline {
  vertical-align: baseline !important; }

#PTTChat .align-top {
  vertical-align: top !important; }

#PTTChat .align-middle {
  vertical-align: middle !important; }

#PTTChat .align-bottom {
  vertical-align: bottom !important; }

#PTTChat .align-text-bottom {
  vertical-align: text-bottom !important; }

#PTTChat .align-text-top {
  vertical-align: text-top !important; }

#PTTChat .bg-primary {
  background-color: #007bff !important; }

#PTTChat a.bg-primary:hover, #PTTChat a.bg-primary:focus,
#PTTChat button.bg-primary:hover,
#PTTChat button.bg-primary:focus {
  background-color: #0062cc !important; }

#PTTChat .bg-secondary {
  background-color: #6c757d !important; }

#PTTChat a.bg-secondary:hover, #PTTChat a.bg-secondary:focus,
#PTTChat button.bg-secondary:hover,
#PTTChat button.bg-secondary:focus {
  background-color: #545b62 !important; }

#PTTChat .bg-success {
  background-color: #28a745 !important; }

#PTTChat a.bg-success:hover, #PTTChat a.bg-success:focus,
#PTTChat button.bg-success:hover,
#PTTChat button.bg-success:focus {
  background-color: #1e7e34 !important; }

#PTTChat .bg-info {
  background-color: #17a2b8 !important; }

#PTTChat a.bg-info:hover, #PTTChat a.bg-info:focus,
#PTTChat button.bg-info:hover,
#PTTChat button.bg-info:focus {
  background-color: #117a8b !important; }

#PTTChat .bg-warning {
  background-color: #ffc107 !important; }

#PTTChat a.bg-warning:hover, #PTTChat a.bg-warning:focus,
#PTTChat button.bg-warning:hover,
#PTTChat button.bg-warning:focus {
  background-color: #d39e00 !important; }

#PTTChat .bg-danger {
  background-color: #dc3545 !important; }

#PTTChat a.bg-danger:hover, #PTTChat a.bg-danger:focus,
#PTTChat button.bg-danger:hover,
#PTTChat button.bg-danger:focus {
  background-color: #bd2130 !important; }

#PTTChat .bg-light {
  background-color: #f8f9fa !important; }

#PTTChat a.bg-light:hover, #PTTChat a.bg-light:focus,
#PTTChat button.bg-light:hover,
#PTTChat button.bg-light:focus {
  background-color: #dae0e5 !important; }

#PTTChat .bg-dark {
  background-color: #343a40 !important; }

#PTTChat a.bg-dark:hover, #PTTChat a.bg-dark:focus,
#PTTChat button.bg-dark:hover,
#PTTChat button.bg-dark:focus {
  background-color: #1d2124 !important; }

#PTTChat .bg-white {
  background-color: #fff !important; }

#PTTChat .bg-transparent {
  background-color: transparent !important; }

#PTTChat .border {
  border: 1px solid #dee2e6 !important; }

#PTTChat .border-top {
  border-top: 1px solid #dee2e6 !important; }

#PTTChat .border-right {
  border-right: 1px solid #dee2e6 !important; }

#PTTChat .border-bottom {
  border-bottom: 1px solid #dee2e6 !important; }

#PTTChat .border-left {
  border-left: 1px solid #dee2e6 !important; }

#PTTChat .border-0 {
  border: 0 !important; }

#PTTChat .border-top-0 {
  border-top: 0 !important; }

#PTTChat .border-right-0 {
  border-right: 0 !important; }

#PTTChat .border-bottom-0 {
  border-bottom: 0 !important; }

#PTTChat .border-left-0 {
  border-left: 0 !important; }

#PTTChat .border-primary {
  border-color: #007bff !important; }

#PTTChat .border-secondary {
  border-color: #6c757d !important; }

#PTTChat .border-success {
  border-color: #28a745 !important; }

#PTTChat .border-info {
  border-color: #17a2b8 !important; }

#PTTChat .border-warning {
  border-color: #ffc107 !important; }

#PTTChat .border-danger {
  border-color: #dc3545 !important; }

#PTTChat .border-light {
  border-color: #f8f9fa !important; }

#PTTChat .border-dark {
  border-color: #343a40 !important; }

#PTTChat .border-white {
  border-color: #fff !important; }

#PTTChat .rounded-sm {
  border-radius: 2.5px !important; }

#PTTChat .rounded {
  border-radius: 2.5px !important; }

#PTTChat .rounded-top {
  border-top-left-radius: 2.5px !important;
  border-top-right-radius: 2.5px !important; }

#PTTChat .rounded-right {
  border-top-right-radius: 2.5px !important;
  border-bottom-right-radius: 2.5px !important; }

#PTTChat .rounded-bottom {
  border-bottom-right-radius: 2.5px !important;
  border-bottom-left-radius: 2.5px !important; }

#PTTChat .rounded-left {
  border-top-left-radius: 2.5px !important;
  border-bottom-left-radius: 2.5px !important; }

#PTTChat .rounded-lg {
  border-radius: 2.5px !important; }

#PTTChat .rounded-circle {
  border-radius: 50% !important; }

#PTTChat .rounded-pill {
  border-radius: 50rem !important; }

#PTTChat .rounded-0 {
  border-radius: 0 !important; }

#PTTChat .clearfix::after {
  display: block;
  clear: both;
  content: ""; }

#PTTChat .d-none {
  display: none !important; }

#PTTChat .d-inline {
  display: inline !important; }

#PTTChat .d-inline-block {
  display: inline-block !important; }

#PTTChat .d-block {
  display: block !important; }

#PTTChat .d-table {
  display: table !important; }

#PTTChat .d-table-row {
  display: table-row !important; }

#PTTChat .d-table-cell {
  display: table-cell !important; }

#PTTChat .d-flex {
  display: flex !important; }

#PTTChat .d-inline-flex {
  display: inline-flex !important; }

@media (min-width: 576px) {
  #PTTChat .d-sm-none {
    display: none !important; }
  #PTTChat .d-sm-inline {
    display: inline !important; }
  #PTTChat .d-sm-inline-block {
    display: inline-block !important; }
  #PTTChat .d-sm-block {
    display: block !important; }
  #PTTChat .d-sm-table {
    display: table !important; }
  #PTTChat .d-sm-table-row {
    display: table-row !important; }
  #PTTChat .d-sm-table-cell {
    display: table-cell !important; }
  #PTTChat .d-sm-flex {
    display: flex !important; }
  #PTTChat .d-sm-inline-flex {
    display: inline-flex !important; } }

@media (min-width: 768px) {
  #PTTChat .d-md-none {
    display: none !important; }
  #PTTChat .d-md-inline {
    display: inline !important; }
  #PTTChat .d-md-inline-block {
    display: inline-block !important; }
  #PTTChat .d-md-block {
    display: block !important; }
  #PTTChat .d-md-table {
    display: table !important; }
  #PTTChat .d-md-table-row {
    display: table-row !important; }
  #PTTChat .d-md-table-cell {
    display: table-cell !important; }
  #PTTChat .d-md-flex {
    display: flex !important; }
  #PTTChat .d-md-inline-flex {
    display: inline-flex !important; } }

@media (min-width: 992px) {
  #PTTChat .d-lg-none {
    display: none !important; }
  #PTTChat .d-lg-inline {
    display: inline !important; }
  #PTTChat .d-lg-inline-block {
    display: inline-block !important; }
  #PTTChat .d-lg-block {
    display: block !important; }
  #PTTChat .d-lg-table {
    display: table !important; }
  #PTTChat .d-lg-table-row {
    display: table-row !important; }
  #PTTChat .d-lg-table-cell {
    display: table-cell !important; }
  #PTTChat .d-lg-flex {
    display: flex !important; }
  #PTTChat .d-lg-inline-flex {
    display: inline-flex !important; } }

@media (min-width: 1200px) {
  #PTTChat .d-xl-none {
    display: none !important; }
  #PTTChat .d-xl-inline {
    display: inline !important; }
  #PTTChat .d-xl-inline-block {
    display: inline-block !important; }
  #PTTChat .d-xl-block {
    display: block !important; }
  #PTTChat .d-xl-table {
    display: table !important; }
  #PTTChat .d-xl-table-row {
    display: table-row !important; }
  #PTTChat .d-xl-table-cell {
    display: table-cell !important; }
  #PTTChat .d-xl-flex {
    display: flex !important; }
  #PTTChat .d-xl-inline-flex {
    display: inline-flex !important; } }

@media print {
  #PTTChat .d-print-none {
    display: none !important; }
  #PTTChat .d-print-inline {
    display: inline !important; }
  #PTTChat .d-print-inline-block {
    display: inline-block !important; }
  #PTTChat .d-print-block {
    display: block !important; }
  #PTTChat .d-print-table {
    display: table !important; }
  #PTTChat .d-print-table-row {
    display: table-row !important; }
  #PTTChat .d-print-table-cell {
    display: table-cell !important; }
  #PTTChat .d-print-flex {
    display: flex !important; }
  #PTTChat .d-print-inline-flex {
    display: inline-flex !important; } }

#PTTChat .embed-responsive {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  overflow: hidden; }
  #PTTChat .embed-responsive::before {
    display: block;
    content: ""; }
  #PTTChat .embed-responsive .embed-responsive-item,
  #PTTChat .embed-responsive iframe,
  #PTTChat .embed-responsive embed,
  #PTTChat .embed-responsive object,
  #PTTChat .embed-responsive video {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 0; }

#PTTChat .embed-responsive-21by9::before {
  padding-top: 42.85714%; }

#PTTChat .embed-responsive-16by9::before {
  padding-top: 56.25%; }

#PTTChat .embed-responsive-4by3::before {
  padding-top: 75%; }

#PTTChat .embed-responsive-1by1::before {
  padding-top: 100%; }

#PTTChat .flex-row {
  flex-direction: row !important; }

#PTTChat .flex-column {
  flex-direction: column !important; }

#PTTChat .flex-row-reverse {
  flex-direction: row-reverse !important; }

#PTTChat .flex-column-reverse {
  flex-direction: column-reverse !important; }

#PTTChat .flex-wrap {
  flex-wrap: wrap !important; }

#PTTChat .flex-nowrap {
  flex-wrap: nowrap !important; }

#PTTChat .flex-wrap-reverse {
  flex-wrap: wrap-reverse !important; }

#PTTChat .flex-fill {
  flex: 1 1 auto !important; }

#PTTChat .flex-grow-0 {
  flex-grow: 0 !important; }

#PTTChat .flex-grow-1 {
  flex-grow: 1 !important; }

#PTTChat .flex-shrink-0 {
  flex-shrink: 0 !important; }

#PTTChat .flex-shrink-1 {
  flex-shrink: 1 !important; }

#PTTChat .justify-content-start {
  justify-content: flex-start !important; }

#PTTChat .justify-content-end {
  justify-content: flex-end !important; }

#PTTChat .justify-content-center {
  justify-content: center !important; }

#PTTChat .justify-content-between {
  justify-content: space-between !important; }

#PTTChat .justify-content-around {
  justify-content: space-around !important; }

#PTTChat .align-items-start {
  align-items: flex-start !important; }

#PTTChat .align-items-end {
  align-items: flex-end !important; }

#PTTChat .align-items-center {
  align-items: center !important; }

#PTTChat .align-items-baseline {
  align-items: baseline !important; }

#PTTChat .align-items-stretch {
  align-items: stretch !important; }

#PTTChat .align-content-start {
  align-content: flex-start !important; }

#PTTChat .align-content-end {
  align-content: flex-end !important; }

#PTTChat .align-content-center {
  align-content: center !important; }

#PTTChat .align-content-between {
  align-content: space-between !important; }

#PTTChat .align-content-around {
  align-content: space-around !important; }

#PTTChat .align-content-stretch {
  align-content: stretch !important; }

#PTTChat .align-self-auto {
  align-self: auto !important; }

#PTTChat .align-self-start {
  align-self: flex-start !important; }

#PTTChat .align-self-end {
  align-self: flex-end !important; }

#PTTChat .align-self-center {
  align-self: center !important; }

#PTTChat .align-self-baseline {
  align-self: baseline !important; }

#PTTChat .align-self-stretch {
  align-self: stretch !important; }

@media (min-width: 576px) {
  #PTTChat .flex-sm-row {
    flex-direction: row !important; }
  #PTTChat .flex-sm-column {
    flex-direction: column !important; }
  #PTTChat .flex-sm-row-reverse {
    flex-direction: row-reverse !important; }
  #PTTChat .flex-sm-column-reverse {
    flex-direction: column-reverse !important; }
  #PTTChat .flex-sm-wrap {
    flex-wrap: wrap !important; }
  #PTTChat .flex-sm-nowrap {
    flex-wrap: nowrap !important; }
  #PTTChat .flex-sm-wrap-reverse {
    flex-wrap: wrap-reverse !important; }
  #PTTChat .flex-sm-fill {
    flex: 1 1 auto !important; }
  #PTTChat .flex-sm-grow-0 {
    flex-grow: 0 !important; }
  #PTTChat .flex-sm-grow-1 {
    flex-grow: 1 !important; }
  #PTTChat .flex-sm-shrink-0 {
    flex-shrink: 0 !important; }
  #PTTChat .flex-sm-shrink-1 {
    flex-shrink: 1 !important; }
  #PTTChat .justify-content-sm-start {
    justify-content: flex-start !important; }
  #PTTChat .justify-content-sm-end {
    justify-content: flex-end !important; }
  #PTTChat .justify-content-sm-center {
    justify-content: center !important; }
  #PTTChat .justify-content-sm-between {
    justify-content: space-between !important; }
  #PTTChat .justify-content-sm-around {
    justify-content: space-around !important; }
  #PTTChat .align-items-sm-start {
    align-items: flex-start !important; }
  #PTTChat .align-items-sm-end {
    align-items: flex-end !important; }
  #PTTChat .align-items-sm-center {
    align-items: center !important; }
  #PTTChat .align-items-sm-baseline {
    align-items: baseline !important; }
  #PTTChat .align-items-sm-stretch {
    align-items: stretch !important; }
  #PTTChat .align-content-sm-start {
    align-content: flex-start !important; }
  #PTTChat .align-content-sm-end {
    align-content: flex-end !important; }
  #PTTChat .align-content-sm-center {
    align-content: center !important; }
  #PTTChat .align-content-sm-between {
    align-content: space-between !important; }
  #PTTChat .align-content-sm-around {
    align-content: space-around !important; }
  #PTTChat .align-content-sm-stretch {
    align-content: stretch !important; }
  #PTTChat .align-self-sm-auto {
    align-self: auto !important; }
  #PTTChat .align-self-sm-start {
    align-self: flex-start !important; }
  #PTTChat .align-self-sm-end {
    align-self: flex-end !important; }
  #PTTChat .align-self-sm-center {
    align-self: center !important; }
  #PTTChat .align-self-sm-baseline {
    align-self: baseline !important; }
  #PTTChat .align-self-sm-stretch {
    align-self: stretch !important; } }

@media (min-width: 768px) {
  #PTTChat .flex-md-row {
    flex-direction: row !important; }
  #PTTChat .flex-md-column {
    flex-direction: column !important; }
  #PTTChat .flex-md-row-reverse {
    flex-direction: row-reverse !important; }
  #PTTChat .flex-md-column-reverse {
    flex-direction: column-reverse !important; }
  #PTTChat .flex-md-wrap {
    flex-wrap: wrap !important; }
  #PTTChat .flex-md-nowrap {
    flex-wrap: nowrap !important; }
  #PTTChat .flex-md-wrap-reverse {
    flex-wrap: wrap-reverse !important; }
  #PTTChat .flex-md-fill {
    flex: 1 1 auto !important; }
  #PTTChat .flex-md-grow-0 {
    flex-grow: 0 !important; }
  #PTTChat .flex-md-grow-1 {
    flex-grow: 1 !important; }
  #PTTChat .flex-md-shrink-0 {
    flex-shrink: 0 !important; }
  #PTTChat .flex-md-shrink-1 {
    flex-shrink: 1 !important; }
  #PTTChat .justify-content-md-start {
    justify-content: flex-start !important; }
  #PTTChat .justify-content-md-end {
    justify-content: flex-end !important; }
  #PTTChat .justify-content-md-center {
    justify-content: center !important; }
  #PTTChat .justify-content-md-between {
    justify-content: space-between !important; }
  #PTTChat .justify-content-md-around {
    justify-content: space-around !important; }
  #PTTChat .align-items-md-start {
    align-items: flex-start !important; }
  #PTTChat .align-items-md-end {
    align-items: flex-end !important; }
  #PTTChat .align-items-md-center {
    align-items: center !important; }
  #PTTChat .align-items-md-baseline {
    align-items: baseline !important; }
  #PTTChat .align-items-md-stretch {
    align-items: stretch !important; }
  #PTTChat .align-content-md-start {
    align-content: flex-start !important; }
  #PTTChat .align-content-md-end {
    align-content: flex-end !important; }
  #PTTChat .align-content-md-center {
    align-content: center !important; }
  #PTTChat .align-content-md-between {
    align-content: space-between !important; }
  #PTTChat .align-content-md-around {
    align-content: space-around !important; }
  #PTTChat .align-content-md-stretch {
    align-content: stretch !important; }
  #PTTChat .align-self-md-auto {
    align-self: auto !important; }
  #PTTChat .align-self-md-start {
    align-self: flex-start !important; }
  #PTTChat .align-self-md-end {
    align-self: flex-end !important; }
  #PTTChat .align-self-md-center {
    align-self: center !important; }
  #PTTChat .align-self-md-baseline {
    align-self: baseline !important; }
  #PTTChat .align-self-md-stretch {
    align-self: stretch !important; } }

@media (min-width: 992px) {
  #PTTChat .flex-lg-row {
    flex-direction: row !important; }
  #PTTChat .flex-lg-column {
    flex-direction: column !important; }
  #PTTChat .flex-lg-row-reverse {
    flex-direction: row-reverse !important; }
  #PTTChat .flex-lg-column-reverse {
    flex-direction: column-reverse !important; }
  #PTTChat .flex-lg-wrap {
    flex-wrap: wrap !important; }
  #PTTChat .flex-lg-nowrap {
    flex-wrap: nowrap !important; }
  #PTTChat .flex-lg-wrap-reverse {
    flex-wrap: wrap-reverse !important; }
  #PTTChat .flex-lg-fill {
    flex: 1 1 auto !important; }
  #PTTChat .flex-lg-grow-0 {
    flex-grow: 0 !important; }
  #PTTChat .flex-lg-grow-1 {
    flex-grow: 1 !important; }
  #PTTChat .flex-lg-shrink-0 {
    flex-shrink: 0 !important; }
  #PTTChat .flex-lg-shrink-1 {
    flex-shrink: 1 !important; }
  #PTTChat .justify-content-lg-start {
    justify-content: flex-start !important; }
  #PTTChat .justify-content-lg-end {
    justify-content: flex-end !important; }
  #PTTChat .justify-content-lg-center {
    justify-content: center !important; }
  #PTTChat .justify-content-lg-between {
    justify-content: space-between !important; }
  #PTTChat .justify-content-lg-around {
    justify-content: space-around !important; }
  #PTTChat .align-items-lg-start {
    align-items: flex-start !important; }
  #PTTChat .align-items-lg-end {
    align-items: flex-end !important; }
  #PTTChat .align-items-lg-center {
    align-items: center !important; }
  #PTTChat .align-items-lg-baseline {
    align-items: baseline !important; }
  #PTTChat .align-items-lg-stretch {
    align-items: stretch !important; }
  #PTTChat .align-content-lg-start {
    align-content: flex-start !important; }
  #PTTChat .align-content-lg-end {
    align-content: flex-end !important; }
  #PTTChat .align-content-lg-center {
    align-content: center !important; }
  #PTTChat .align-content-lg-between {
    align-content: space-between !important; }
  #PTTChat .align-content-lg-around {
    align-content: space-around !important; }
  #PTTChat .align-content-lg-stretch {
    align-content: stretch !important; }
  #PTTChat .align-self-lg-auto {
    align-self: auto !important; }
  #PTTChat .align-self-lg-start {
    align-self: flex-start !important; }
  #PTTChat .align-self-lg-end {
    align-self: flex-end !important; }
  #PTTChat .align-self-lg-center {
    align-self: center !important; }
  #PTTChat .align-self-lg-baseline {
    align-self: baseline !important; }
  #PTTChat .align-self-lg-stretch {
    align-self: stretch !important; } }

@media (min-width: 1200px) {
  #PTTChat .flex-xl-row {
    flex-direction: row !important; }
  #PTTChat .flex-xl-column {
    flex-direction: column !important; }
  #PTTChat .flex-xl-row-reverse {
    flex-direction: row-reverse !important; }
  #PTTChat .flex-xl-column-reverse {
    flex-direction: column-reverse !important; }
  #PTTChat .flex-xl-wrap {
    flex-wrap: wrap !important; }
  #PTTChat .flex-xl-nowrap {
    flex-wrap: nowrap !important; }
  #PTTChat .flex-xl-wrap-reverse {
    flex-wrap: wrap-reverse !important; }
  #PTTChat .flex-xl-fill {
    flex: 1 1 auto !important; }
  #PTTChat .flex-xl-grow-0 {
    flex-grow: 0 !important; }
  #PTTChat .flex-xl-grow-1 {
    flex-grow: 1 !important; }
  #PTTChat .flex-xl-shrink-0 {
    flex-shrink: 0 !important; }
  #PTTChat .flex-xl-shrink-1 {
    flex-shrink: 1 !important; }
  #PTTChat .justify-content-xl-start {
    justify-content: flex-start !important; }
  #PTTChat .justify-content-xl-end {
    justify-content: flex-end !important; }
  #PTTChat .justify-content-xl-center {
    justify-content: center !important; }
  #PTTChat .justify-content-xl-between {
    justify-content: space-between !important; }
  #PTTChat .justify-content-xl-around {
    justify-content: space-around !important; }
  #PTTChat .align-items-xl-start {
    align-items: flex-start !important; }
  #PTTChat .align-items-xl-end {
    align-items: flex-end !important; }
  #PTTChat .align-items-xl-center {
    align-items: center !important; }
  #PTTChat .align-items-xl-baseline {
    align-items: baseline !important; }
  #PTTChat .align-items-xl-stretch {
    align-items: stretch !important; }
  #PTTChat .align-content-xl-start {
    align-content: flex-start !important; }
  #PTTChat .align-content-xl-end {
    align-content: flex-end !important; }
  #PTTChat .align-content-xl-center {
    align-content: center !important; }
  #PTTChat .align-content-xl-between {
    align-content: space-between !important; }
  #PTTChat .align-content-xl-around {
    align-content: space-around !important; }
  #PTTChat .align-content-xl-stretch {
    align-content: stretch !important; }
  #PTTChat .align-self-xl-auto {
    align-self: auto !important; }
  #PTTChat .align-self-xl-start {
    align-self: flex-start !important; }
  #PTTChat .align-self-xl-end {
    align-self: flex-end !important; }
  #PTTChat .align-self-xl-center {
    align-self: center !important; }
  #PTTChat .align-self-xl-baseline {
    align-self: baseline !important; }
  #PTTChat .align-self-xl-stretch {
    align-self: stretch !important; } }

#PTTChat .float-left {
  float: left !important; }

#PTTChat .float-right {
  float: right !important; }

#PTTChat .float-none {
  float: none !important; }

@media (min-width: 576px) {
  #PTTChat .float-sm-left {
    float: left !important; }
  #PTTChat .float-sm-right {
    float: right !important; }
  #PTTChat .float-sm-none {
    float: none !important; } }

@media (min-width: 768px) {
  #PTTChat .float-md-left {
    float: left !important; }
  #PTTChat .float-md-right {
    float: right !important; }
  #PTTChat .float-md-none {
    float: none !important; } }

@media (min-width: 992px) {
  #PTTChat .float-lg-left {
    float: left !important; }
  #PTTChat .float-lg-right {
    float: right !important; }
  #PTTChat .float-lg-none {
    float: none !important; } }

@media (min-width: 1200px) {
  #PTTChat .float-xl-left {
    float: left !important; }
  #PTTChat .float-xl-right {
    float: right !important; }
  #PTTChat .float-xl-none {
    float: none !important; } }

#PTTChat .user-select-all {
  user-select: all !important; }

#PTTChat .user-select-auto {
  user-select: auto !important; }

#PTTChat .user-select-none {
  user-select: none !important; }

#PTTChat .overflow-auto {
  overflow: auto !important; }

#PTTChat .overflow-hidden {
  overflow: hidden !important; }

#PTTChat .position-static {
  position: static !important; }

#PTTChat .position-relative {
  position: relative !important; }

#PTTChat .position-absolute {
  position: absolute !important; }

#PTTChat .position-fixed {
  position: fixed !important; }

#PTTChat .position-sticky {
  position: sticky !important; }

#PTTChat .fixed-top {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 1030; }

#PTTChat .fixed-bottom {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1030; }

@supports (position: sticky) {
  #PTTChat .sticky-top {
    position: sticky;
    top: 0;
    z-index: 1020; } }

#PTTChat .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0; }

#PTTChat .sr-only-focusable:active, #PTTChat .sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  overflow: visible;
  clip: auto;
  white-space: normal; }

#PTTChat .shadow-sm {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075) !important; }

#PTTChat .shadow {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important; }

#PTTChat .shadow-lg {
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175) !important; }

#PTTChat .shadow-none {
  box-shadow: none !important; }

#PTTChat .w-25 {
  width: 25% !important; }

#PTTChat .w-50 {
  width: 50% !important; }

#PTTChat .w-75 {
  width: 75% !important; }

#PTTChat .w-100 {
  width: 100% !important; }

#PTTChat .w-auto {
  width: auto !important; }

#PTTChat .h-25 {
  height: 25% !important; }

#PTTChat .h-50 {
  height: 50% !important; }

#PTTChat .h-75 {
  height: 75% !important; }

#PTTChat .h-100 {
  height: 100% !important; }

#PTTChat .h-auto {
  height: auto !important; }

#PTTChat .mw-100 {
  max-width: 100% !important; }

#PTTChat .mh-100 {
  max-height: 100% !important; }

#PTTChat .min-vw-100 {
  min-width: 100vw !important; }

#PTTChat .min-vh-100 {
  min-height: 100vh !important; }

#PTTChat .vw-100 {
  width: 100vw !important; }

#PTTChat .vh-100 {
  height: 100vh !important; }

#PTTChat .m-0 {
  margin: 0 !important; }

#PTTChat .mt-0,
#PTTChat .my-0 {
  margin-top: 0 !important; }

#PTTChat .mr-0,
#PTTChat .mx-0 {
  margin-right: 0 !important; }

#PTTChat .mb-0,
#PTTChat .my-0 {
  margin-bottom: 0 !important; }

#PTTChat .ml-0,
#PTTChat .mx-0 {
  margin-left: 0 !important; }

#PTTChat .m-1 {
  margin: 2.5px !important; }

#PTTChat .mt-1,
#PTTChat .my-1 {
  margin-top: 2.5px !important; }

#PTTChat .mr-1,
#PTTChat .mx-1 {
  margin-right: 2.5px !important; }

#PTTChat .mb-1,
#PTTChat .my-1 {
  margin-bottom: 2.5px !important; }

#PTTChat .ml-1,
#PTTChat .mx-1 {
  margin-left: 2.5px !important; }

#PTTChat .m-2 {
  margin: 5px !important; }

#PTTChat .mt-2,
#PTTChat .my-2 {
  margin-top: 5px !important; }

#PTTChat .mr-2,
#PTTChat .mx-2 {
  margin-right: 5px !important; }

#PTTChat .mb-2,
#PTTChat .my-2 {
  margin-bottom: 5px !important; }

#PTTChat .ml-2,
#PTTChat .mx-2 {
  margin-left: 5px !important; }

#PTTChat .m-3 {
  margin: 10px !important; }

#PTTChat .mt-3,
#PTTChat .my-3 {
  margin-top: 10px !important; }

#PTTChat .mr-3,
#PTTChat .mx-3 {
  margin-right: 10px !important; }

#PTTChat .mb-3,
#PTTChat .my-3 {
  margin-bottom: 10px !important; }

#PTTChat .ml-3,
#PTTChat .mx-3 {
  margin-left: 10px !important; }

#PTTChat .m-4 {
  margin: 15px !important; }

#PTTChat .mt-4,
#PTTChat .my-4 {
  margin-top: 15px !important; }

#PTTChat .mr-4,
#PTTChat .mx-4 {
  margin-right: 15px !important; }

#PTTChat .mb-4,
#PTTChat .my-4 {
  margin-bottom: 15px !important; }

#PTTChat .ml-4,
#PTTChat .mx-4 {
  margin-left: 15px !important; }

#PTTChat .m-5 {
  margin: 30px !important; }

#PTTChat .mt-5,
#PTTChat .my-5 {
  margin-top: 30px !important; }

#PTTChat .mr-5,
#PTTChat .mx-5 {
  margin-right: 30px !important; }

#PTTChat .mb-5,
#PTTChat .my-5 {
  margin-bottom: 30px !important; }

#PTTChat .ml-5,
#PTTChat .mx-5 {
  margin-left: 30px !important; }

#PTTChat .p-0 {
  padding: 0 !important; }

#PTTChat .pt-0,
#PTTChat .py-0 {
  padding-top: 0 !important; }

#PTTChat .pr-0,
#PTTChat .px-0 {
  padding-right: 0 !important; }

#PTTChat .pb-0,
#PTTChat .py-0 {
  padding-bottom: 0 !important; }

#PTTChat .pl-0,
#PTTChat .px-0 {
  padding-left: 0 !important; }

#PTTChat .p-1 {
  padding: 2.5px !important; }

#PTTChat .pt-1,
#PTTChat .py-1 {
  padding-top: 2.5px !important; }

#PTTChat .pr-1,
#PTTChat .px-1 {
  padding-right: 2.5px !important; }

#PTTChat .pb-1,
#PTTChat .py-1 {
  padding-bottom: 2.5px !important; }

#PTTChat .pl-1,
#PTTChat .px-1 {
  padding-left: 2.5px !important; }

#PTTChat .p-2 {
  padding: 5px !important; }

#PTTChat .pt-2,
#PTTChat .py-2 {
  padding-top: 5px !important; }

#PTTChat .pr-2,
#PTTChat .px-2 {
  padding-right: 5px !important; }

#PTTChat .pb-2,
#PTTChat .py-2 {
  padding-bottom: 5px !important; }

#PTTChat .pl-2,
#PTTChat .px-2 {
  padding-left: 5px !important; }

#PTTChat .p-3 {
  padding: 10px !important; }

#PTTChat .pt-3,
#PTTChat .py-3 {
  padding-top: 10px !important; }

#PTTChat .pr-3,
#PTTChat .px-3 {
  padding-right: 10px !important; }

#PTTChat .pb-3,
#PTTChat .py-3 {
  padding-bottom: 10px !important; }

#PTTChat .pl-3,
#PTTChat .px-3 {
  padding-left: 10px !important; }

#PTTChat .p-4 {
  padding: 15px !important; }

#PTTChat .pt-4,
#PTTChat .py-4 {
  padding-top: 15px !important; }

#PTTChat .pr-4,
#PTTChat .px-4 {
  padding-right: 15px !important; }

#PTTChat .pb-4,
#PTTChat .py-4 {
  padding-bottom: 15px !important; }

#PTTChat .pl-4,
#PTTChat .px-4 {
  padding-left: 15px !important; }

#PTTChat .p-5 {
  padding: 30px !important; }

#PTTChat .pt-5,
#PTTChat .py-5 {
  padding-top: 30px !important; }

#PTTChat .pr-5,
#PTTChat .px-5 {
  padding-right: 30px !important; }

#PTTChat .pb-5,
#PTTChat .py-5 {
  padding-bottom: 30px !important; }

#PTTChat .pl-5,
#PTTChat .px-5 {
  padding-left: 30px !important; }

#PTTChat .m-n1 {
  margin: -2.5px !important; }

#PTTChat .mt-n1,
#PTTChat .my-n1 {
  margin-top: -2.5px !important; }

#PTTChat .mr-n1,
#PTTChat .mx-n1 {
  margin-right: -2.5px !important; }

#PTTChat .mb-n1,
#PTTChat .my-n1 {
  margin-bottom: -2.5px !important; }

#PTTChat .ml-n1,
#PTTChat .mx-n1 {
  margin-left: -2.5px !important; }

#PTTChat .m-n2 {
  margin: -5px !important; }

#PTTChat .mt-n2,
#PTTChat .my-n2 {
  margin-top: -5px !important; }

#PTTChat .mr-n2,
#PTTChat .mx-n2 {
  margin-right: -5px !important; }

#PTTChat .mb-n2,
#PTTChat .my-n2 {
  margin-bottom: -5px !important; }

#PTTChat .ml-n2,
#PTTChat .mx-n2 {
  margin-left: -5px !important; }

#PTTChat .m-n3 {
  margin: -10px !important; }

#PTTChat .mt-n3,
#PTTChat .my-n3 {
  margin-top: -10px !important; }

#PTTChat .mr-n3,
#PTTChat .mx-n3 {
  margin-right: -10px !important; }

#PTTChat .mb-n3,
#PTTChat .my-n3 {
  margin-bottom: -10px !important; }

#PTTChat .ml-n3,
#PTTChat .mx-n3 {
  margin-left: -10px !important; }

#PTTChat .m-n4 {
  margin: -15px !important; }

#PTTChat .mt-n4,
#PTTChat .my-n4 {
  margin-top: -15px !important; }

#PTTChat .mr-n4,
#PTTChat .mx-n4 {
  margin-right: -15px !important; }

#PTTChat .mb-n4,
#PTTChat .my-n4 {
  margin-bottom: -15px !important; }

#PTTChat .ml-n4,
#PTTChat .mx-n4 {
  margin-left: -15px !important; }

#PTTChat .m-n5 {
  margin: -30px !important; }

#PTTChat .mt-n5,
#PTTChat .my-n5 {
  margin-top: -30px !important; }

#PTTChat .mr-n5,
#PTTChat .mx-n5 {
  margin-right: -30px !important; }

#PTTChat .mb-n5,
#PTTChat .my-n5 {
  margin-bottom: -30px !important; }

#PTTChat .ml-n5,
#PTTChat .mx-n5 {
  margin-left: -30px !important; }

#PTTChat .m-auto {
  margin: auto !important; }

#PTTChat .mt-auto,
#PTTChat .my-auto {
  margin-top: auto !important; }

#PTTChat .mr-auto,
#PTTChat .mx-auto {
  margin-right: auto !important; }

#PTTChat .mb-auto,
#PTTChat .my-auto {
  margin-bottom: auto !important; }

#PTTChat .ml-auto,
#PTTChat .mx-auto {
  margin-left: auto !important; }

@media (min-width: 576px) {
  #PTTChat .m-sm-0 {
    margin: 0 !important; }
  #PTTChat .mt-sm-0,
  #PTTChat .my-sm-0 {
    margin-top: 0 !important; }
  #PTTChat .mr-sm-0,
  #PTTChat .mx-sm-0 {
    margin-right: 0 !important; }
  #PTTChat .mb-sm-0,
  #PTTChat .my-sm-0 {
    margin-bottom: 0 !important; }
  #PTTChat .ml-sm-0,
  #PTTChat .mx-sm-0 {
    margin-left: 0 !important; }
  #PTTChat .m-sm-1 {
    margin: 2.5px !important; }
  #PTTChat .mt-sm-1,
  #PTTChat .my-sm-1 {
    margin-top: 2.5px !important; }
  #PTTChat .mr-sm-1,
  #PTTChat .mx-sm-1 {
    margin-right: 2.5px !important; }
  #PTTChat .mb-sm-1,
  #PTTChat .my-sm-1 {
    margin-bottom: 2.5px !important; }
  #PTTChat .ml-sm-1,
  #PTTChat .mx-sm-1 {
    margin-left: 2.5px !important; }
  #PTTChat .m-sm-2 {
    margin: 5px !important; }
  #PTTChat .mt-sm-2,
  #PTTChat .my-sm-2 {
    margin-top: 5px !important; }
  #PTTChat .mr-sm-2,
  #PTTChat .mx-sm-2 {
    margin-right: 5px !important; }
  #PTTChat .mb-sm-2,
  #PTTChat .my-sm-2 {
    margin-bottom: 5px !important; }
  #PTTChat .ml-sm-2,
  #PTTChat .mx-sm-2 {
    margin-left: 5px !important; }
  #PTTChat .m-sm-3 {
    margin: 10px !important; }
  #PTTChat .mt-sm-3,
  #PTTChat .my-sm-3 {
    margin-top: 10px !important; }
  #PTTChat .mr-sm-3,
  #PTTChat .mx-sm-3 {
    margin-right: 10px !important; }
  #PTTChat .mb-sm-3,
  #PTTChat .my-sm-3 {
    margin-bottom: 10px !important; }
  #PTTChat .ml-sm-3,
  #PTTChat .mx-sm-3 {
    margin-left: 10px !important; }
  #PTTChat .m-sm-4 {
    margin: 15px !important; }
  #PTTChat .mt-sm-4,
  #PTTChat .my-sm-4 {
    margin-top: 15px !important; }
  #PTTChat .mr-sm-4,
  #PTTChat .mx-sm-4 {
    margin-right: 15px !important; }
  #PTTChat .mb-sm-4,
  #PTTChat .my-sm-4 {
    margin-bottom: 15px !important; }
  #PTTChat .ml-sm-4,
  #PTTChat .mx-sm-4 {
    margin-left: 15px !important; }
  #PTTChat .m-sm-5 {
    margin: 30px !important; }
  #PTTChat .mt-sm-5,
  #PTTChat .my-sm-5 {
    margin-top: 30px !important; }
  #PTTChat .mr-sm-5,
  #PTTChat .mx-sm-5 {
    margin-right: 30px !important; }
  #PTTChat .mb-sm-5,
  #PTTChat .my-sm-5 {
    margin-bottom: 30px !important; }
  #PTTChat .ml-sm-5,
  #PTTChat .mx-sm-5 {
    margin-left: 30px !important; }
  #PTTChat .p-sm-0 {
    padding: 0 !important; }
  #PTTChat .pt-sm-0,
  #PTTChat .py-sm-0 {
    padding-top: 0 !important; }
  #PTTChat .pr-sm-0,
  #PTTChat .px-sm-0 {
    padding-right: 0 !important; }
  #PTTChat .pb-sm-0,
  #PTTChat .py-sm-0 {
    padding-bottom: 0 !important; }
  #PTTChat .pl-sm-0,
  #PTTChat .px-sm-0 {
    padding-left: 0 !important; }
  #PTTChat .p-sm-1 {
    padding: 2.5px !important; }
  #PTTChat .pt-sm-1,
  #PTTChat .py-sm-1 {
    padding-top: 2.5px !important; }
  #PTTChat .pr-sm-1,
  #PTTChat .px-sm-1 {
    padding-right: 2.5px !important; }
  #PTTChat .pb-sm-1,
  #PTTChat .py-sm-1 {
    padding-bottom: 2.5px !important; }
  #PTTChat .pl-sm-1,
  #PTTChat .px-sm-1 {
    padding-left: 2.5px !important; }
  #PTTChat .p-sm-2 {
    padding: 5px !important; }
  #PTTChat .pt-sm-2,
  #PTTChat .py-sm-2 {
    padding-top: 5px !important; }
  #PTTChat .pr-sm-2,
  #PTTChat .px-sm-2 {
    padding-right: 5px !important; }
  #PTTChat .pb-sm-2,
  #PTTChat .py-sm-2 {
    padding-bottom: 5px !important; }
  #PTTChat .pl-sm-2,
  #PTTChat .px-sm-2 {
    padding-left: 5px !important; }
  #PTTChat .p-sm-3 {
    padding: 10px !important; }
  #PTTChat .pt-sm-3,
  #PTTChat .py-sm-3 {
    padding-top: 10px !important; }
  #PTTChat .pr-sm-3,
  #PTTChat .px-sm-3 {
    padding-right: 10px !important; }
  #PTTChat .pb-sm-3,
  #PTTChat .py-sm-3 {
    padding-bottom: 10px !important; }
  #PTTChat .pl-sm-3,
  #PTTChat .px-sm-3 {
    padding-left: 10px !important; }
  #PTTChat .p-sm-4 {
    padding: 15px !important; }
  #PTTChat .pt-sm-4,
  #PTTChat .py-sm-4 {
    padding-top: 15px !important; }
  #PTTChat .pr-sm-4,
  #PTTChat .px-sm-4 {
    padding-right: 15px !important; }
  #PTTChat .pb-sm-4,
  #PTTChat .py-sm-4 {
    padding-bottom: 15px !important; }
  #PTTChat .pl-sm-4,
  #PTTChat .px-sm-4 {
    padding-left: 15px !important; }
  #PTTChat .p-sm-5 {
    padding: 30px !important; }
  #PTTChat .pt-sm-5,
  #PTTChat .py-sm-5 {
    padding-top: 30px !important; }
  #PTTChat .pr-sm-5,
  #PTTChat .px-sm-5 {
    padding-right: 30px !important; }
  #PTTChat .pb-sm-5,
  #PTTChat .py-sm-5 {
    padding-bottom: 30px !important; }
  #PTTChat .pl-sm-5,
  #PTTChat .px-sm-5 {
    padding-left: 30px !important; }
  #PTTChat .m-sm-n1 {
    margin: -2.5px !important; }
  #PTTChat .mt-sm-n1,
  #PTTChat .my-sm-n1 {
    margin-top: -2.5px !important; }
  #PTTChat .mr-sm-n1,
  #PTTChat .mx-sm-n1 {
    margin-right: -2.5px !important; }
  #PTTChat .mb-sm-n1,
  #PTTChat .my-sm-n1 {
    margin-bottom: -2.5px !important; }
  #PTTChat .ml-sm-n1,
  #PTTChat .mx-sm-n1 {
    margin-left: -2.5px !important; }
  #PTTChat .m-sm-n2 {
    margin: -5px !important; }
  #PTTChat .mt-sm-n2,
  #PTTChat .my-sm-n2 {
    margin-top: -5px !important; }
  #PTTChat .mr-sm-n2,
  #PTTChat .mx-sm-n2 {
    margin-right: -5px !important; }
  #PTTChat .mb-sm-n2,
  #PTTChat .my-sm-n2 {
    margin-bottom: -5px !important; }
  #PTTChat .ml-sm-n2,
  #PTTChat .mx-sm-n2 {
    margin-left: -5px !important; }
  #PTTChat .m-sm-n3 {
    margin: -10px !important; }
  #PTTChat .mt-sm-n3,
  #PTTChat .my-sm-n3 {
    margin-top: -10px !important; }
  #PTTChat .mr-sm-n3,
  #PTTChat .mx-sm-n3 {
    margin-right: -10px !important; }
  #PTTChat .mb-sm-n3,
  #PTTChat .my-sm-n3 {
    margin-bottom: -10px !important; }
  #PTTChat .ml-sm-n3,
  #PTTChat .mx-sm-n3 {
    margin-left: -10px !important; }
  #PTTChat .m-sm-n4 {
    margin: -15px !important; }
  #PTTChat .mt-sm-n4,
  #PTTChat .my-sm-n4 {
    margin-top: -15px !important; }
  #PTTChat .mr-sm-n4,
  #PTTChat .mx-sm-n4 {
    margin-right: -15px !important; }
  #PTTChat .mb-sm-n4,
  #PTTChat .my-sm-n4 {
    margin-bottom: -15px !important; }
  #PTTChat .ml-sm-n4,
  #PTTChat .mx-sm-n4 {
    margin-left: -15px !important; }
  #PTTChat .m-sm-n5 {
    margin: -30px !important; }
  #PTTChat .mt-sm-n5,
  #PTTChat .my-sm-n5 {
    margin-top: -30px !important; }
  #PTTChat .mr-sm-n5,
  #PTTChat .mx-sm-n5 {
    margin-right: -30px !important; }
  #PTTChat .mb-sm-n5,
  #PTTChat .my-sm-n5 {
    margin-bottom: -30px !important; }
  #PTTChat .ml-sm-n5,
  #PTTChat .mx-sm-n5 {
    margin-left: -30px !important; }
  #PTTChat .m-sm-auto {
    margin: auto !important; }
  #PTTChat .mt-sm-auto,
  #PTTChat .my-sm-auto {
    margin-top: auto !important; }
  #PTTChat .mr-sm-auto,
  #PTTChat .mx-sm-auto {
    margin-right: auto !important; }
  #PTTChat .mb-sm-auto,
  #PTTChat .my-sm-auto {
    margin-bottom: auto !important; }
  #PTTChat .ml-sm-auto,
  #PTTChat .mx-sm-auto {
    margin-left: auto !important; } }

@media (min-width: 768px) {
  #PTTChat .m-md-0 {
    margin: 0 !important; }
  #PTTChat .mt-md-0,
  #PTTChat .my-md-0 {
    margin-top: 0 !important; }
  #PTTChat .mr-md-0,
  #PTTChat .mx-md-0 {
    margin-right: 0 !important; }
  #PTTChat .mb-md-0,
  #PTTChat .my-md-0 {
    margin-bottom: 0 !important; }
  #PTTChat .ml-md-0,
  #PTTChat .mx-md-0 {
    margin-left: 0 !important; }
  #PTTChat .m-md-1 {
    margin: 2.5px !important; }
  #PTTChat .mt-md-1,
  #PTTChat .my-md-1 {
    margin-top: 2.5px !important; }
  #PTTChat .mr-md-1,
  #PTTChat .mx-md-1 {
    margin-right: 2.5px !important; }
  #PTTChat .mb-md-1,
  #PTTChat .my-md-1 {
    margin-bottom: 2.5px !important; }
  #PTTChat .ml-md-1,
  #PTTChat .mx-md-1 {
    margin-left: 2.5px !important; }
  #PTTChat .m-md-2 {
    margin: 5px !important; }
  #PTTChat .mt-md-2,
  #PTTChat .my-md-2 {
    margin-top: 5px !important; }
  #PTTChat .mr-md-2,
  #PTTChat .mx-md-2 {
    margin-right: 5px !important; }
  #PTTChat .mb-md-2,
  #PTTChat .my-md-2 {
    margin-bottom: 5px !important; }
  #PTTChat .ml-md-2,
  #PTTChat .mx-md-2 {
    margin-left: 5px !important; }
  #PTTChat .m-md-3 {
    margin: 10px !important; }
  #PTTChat .mt-md-3,
  #PTTChat .my-md-3 {
    margin-top: 10px !important; }
  #PTTChat .mr-md-3,
  #PTTChat .mx-md-3 {
    margin-right: 10px !important; }
  #PTTChat .mb-md-3,
  #PTTChat .my-md-3 {
    margin-bottom: 10px !important; }
  #PTTChat .ml-md-3,
  #PTTChat .mx-md-3 {
    margin-left: 10px !important; }
  #PTTChat .m-md-4 {
    margin: 15px !important; }
  #PTTChat .mt-md-4,
  #PTTChat .my-md-4 {
    margin-top: 15px !important; }
  #PTTChat .mr-md-4,
  #PTTChat .mx-md-4 {
    margin-right: 15px !important; }
  #PTTChat .mb-md-4,
  #PTTChat .my-md-4 {
    margin-bottom: 15px !important; }
  #PTTChat .ml-md-4,
  #PTTChat .mx-md-4 {
    margin-left: 15px !important; }
  #PTTChat .m-md-5 {
    margin: 30px !important; }
  #PTTChat .mt-md-5,
  #PTTChat .my-md-5 {
    margin-top: 30px !important; }
  #PTTChat .mr-md-5,
  #PTTChat .mx-md-5 {
    margin-right: 30px !important; }
  #PTTChat .mb-md-5,
  #PTTChat .my-md-5 {
    margin-bottom: 30px !important; }
  #PTTChat .ml-md-5,
  #PTTChat .mx-md-5 {
    margin-left: 30px !important; }
  #PTTChat .p-md-0 {
    padding: 0 !important; }
  #PTTChat .pt-md-0,
  #PTTChat .py-md-0 {
    padding-top: 0 !important; }
  #PTTChat .pr-md-0,
  #PTTChat .px-md-0 {
    padding-right: 0 !important; }
  #PTTChat .pb-md-0,
  #PTTChat .py-md-0 {
    padding-bottom: 0 !important; }
  #PTTChat .pl-md-0,
  #PTTChat .px-md-0 {
    padding-left: 0 !important; }
  #PTTChat .p-md-1 {
    padding: 2.5px !important; }
  #PTTChat .pt-md-1,
  #PTTChat .py-md-1 {
    padding-top: 2.5px !important; }
  #PTTChat .pr-md-1,
  #PTTChat .px-md-1 {
    padding-right: 2.5px !important; }
  #PTTChat .pb-md-1,
  #PTTChat .py-md-1 {
    padding-bottom: 2.5px !important; }
  #PTTChat .pl-md-1,
  #PTTChat .px-md-1 {
    padding-left: 2.5px !important; }
  #PTTChat .p-md-2 {
    padding: 5px !important; }
  #PTTChat .pt-md-2,
  #PTTChat .py-md-2 {
    padding-top: 5px !important; }
  #PTTChat .pr-md-2,
  #PTTChat .px-md-2 {
    padding-right: 5px !important; }
  #PTTChat .pb-md-2,
  #PTTChat .py-md-2 {
    padding-bottom: 5px !important; }
  #PTTChat .pl-md-2,
  #PTTChat .px-md-2 {
    padding-left: 5px !important; }
  #PTTChat .p-md-3 {
    padding: 10px !important; }
  #PTTChat .pt-md-3,
  #PTTChat .py-md-3 {
    padding-top: 10px !important; }
  #PTTChat .pr-md-3,
  #PTTChat .px-md-3 {
    padding-right: 10px !important; }
  #PTTChat .pb-md-3,
  #PTTChat .py-md-3 {
    padding-bottom: 10px !important; }
  #PTTChat .pl-md-3,
  #PTTChat .px-md-3 {
    padding-left: 10px !important; }
  #PTTChat .p-md-4 {
    padding: 15px !important; }
  #PTTChat .pt-md-4,
  #PTTChat .py-md-4 {
    padding-top: 15px !important; }
  #PTTChat .pr-md-4,
  #PTTChat .px-md-4 {
    padding-right: 15px !important; }
  #PTTChat .pb-md-4,
  #PTTChat .py-md-4 {
    padding-bottom: 15px !important; }
  #PTTChat .pl-md-4,
  #PTTChat .px-md-4 {
    padding-left: 15px !important; }
  #PTTChat .p-md-5 {
    padding: 30px !important; }
  #PTTChat .pt-md-5,
  #PTTChat .py-md-5 {
    padding-top: 30px !important; }
  #PTTChat .pr-md-5,
  #PTTChat .px-md-5 {
    padding-right: 30px !important; }
  #PTTChat .pb-md-5,
  #PTTChat .py-md-5 {
    padding-bottom: 30px !important; }
  #PTTChat .pl-md-5,
  #PTTChat .px-md-5 {
    padding-left: 30px !important; }
  #PTTChat .m-md-n1 {
    margin: -2.5px !important; }
  #PTTChat .mt-md-n1,
  #PTTChat .my-md-n1 {
    margin-top: -2.5px !important; }
  #PTTChat .mr-md-n1,
  #PTTChat .mx-md-n1 {
    margin-right: -2.5px !important; }
  #PTTChat .mb-md-n1,
  #PTTChat .my-md-n1 {
    margin-bottom: -2.5px !important; }
  #PTTChat .ml-md-n1,
  #PTTChat .mx-md-n1 {
    margin-left: -2.5px !important; }
  #PTTChat .m-md-n2 {
    margin: -5px !important; }
  #PTTChat .mt-md-n2,
  #PTTChat .my-md-n2 {
    margin-top: -5px !important; }
  #PTTChat .mr-md-n2,
  #PTTChat .mx-md-n2 {
    margin-right: -5px !important; }
  #PTTChat .mb-md-n2,
  #PTTChat .my-md-n2 {
    margin-bottom: -5px !important; }
  #PTTChat .ml-md-n2,
  #PTTChat .mx-md-n2 {
    margin-left: -5px !important; }
  #PTTChat .m-md-n3 {
    margin: -10px !important; }
  #PTTChat .mt-md-n3,
  #PTTChat .my-md-n3 {
    margin-top: -10px !important; }
  #PTTChat .mr-md-n3,
  #PTTChat .mx-md-n3 {
    margin-right: -10px !important; }
  #PTTChat .mb-md-n3,
  #PTTChat .my-md-n3 {
    margin-bottom: -10px !important; }
  #PTTChat .ml-md-n3,
  #PTTChat .mx-md-n3 {
    margin-left: -10px !important; }
  #PTTChat .m-md-n4 {
    margin: -15px !important; }
  #PTTChat .mt-md-n4,
  #PTTChat .my-md-n4 {
    margin-top: -15px !important; }
  #PTTChat .mr-md-n4,
  #PTTChat .mx-md-n4 {
    margin-right: -15px !important; }
  #PTTChat .mb-md-n4,
  #PTTChat .my-md-n4 {
    margin-bottom: -15px !important; }
  #PTTChat .ml-md-n4,
  #PTTChat .mx-md-n4 {
    margin-left: -15px !important; }
  #PTTChat .m-md-n5 {
    margin: -30px !important; }
  #PTTChat .mt-md-n5,
  #PTTChat .my-md-n5 {
    margin-top: -30px !important; }
  #PTTChat .mr-md-n5,
  #PTTChat .mx-md-n5 {
    margin-right: -30px !important; }
  #PTTChat .mb-md-n5,
  #PTTChat .my-md-n5 {
    margin-bottom: -30px !important; }
  #PTTChat .ml-md-n5,
  #PTTChat .mx-md-n5 {
    margin-left: -30px !important; }
  #PTTChat .m-md-auto {
    margin: auto !important; }
  #PTTChat .mt-md-auto,
  #PTTChat .my-md-auto {
    margin-top: auto !important; }
  #PTTChat .mr-md-auto,
  #PTTChat .mx-md-auto {
    margin-right: auto !important; }
  #PTTChat .mb-md-auto,
  #PTTChat .my-md-auto {
    margin-bottom: auto !important; }
  #PTTChat .ml-md-auto,
  #PTTChat .mx-md-auto {
    margin-left: auto !important; } }

@media (min-width: 992px) {
  #PTTChat .m-lg-0 {
    margin: 0 !important; }
  #PTTChat .mt-lg-0,
  #PTTChat .my-lg-0 {
    margin-top: 0 !important; }
  #PTTChat .mr-lg-0,
  #PTTChat .mx-lg-0 {
    margin-right: 0 !important; }
  #PTTChat .mb-lg-0,
  #PTTChat .my-lg-0 {
    margin-bottom: 0 !important; }
  #PTTChat .ml-lg-0,
  #PTTChat .mx-lg-0 {
    margin-left: 0 !important; }
  #PTTChat .m-lg-1 {
    margin: 2.5px !important; }
  #PTTChat .mt-lg-1,
  #PTTChat .my-lg-1 {
    margin-top: 2.5px !important; }
  #PTTChat .mr-lg-1,
  #PTTChat .mx-lg-1 {
    margin-right: 2.5px !important; }
  #PTTChat .mb-lg-1,
  #PTTChat .my-lg-1 {
    margin-bottom: 2.5px !important; }
  #PTTChat .ml-lg-1,
  #PTTChat .mx-lg-1 {
    margin-left: 2.5px !important; }
  #PTTChat .m-lg-2 {
    margin: 5px !important; }
  #PTTChat .mt-lg-2,
  #PTTChat .my-lg-2 {
    margin-top: 5px !important; }
  #PTTChat .mr-lg-2,
  #PTTChat .mx-lg-2 {
    margin-right: 5px !important; }
  #PTTChat .mb-lg-2,
  #PTTChat .my-lg-2 {
    margin-bottom: 5px !important; }
  #PTTChat .ml-lg-2,
  #PTTChat .mx-lg-2 {
    margin-left: 5px !important; }
  #PTTChat .m-lg-3 {
    margin: 10px !important; }
  #PTTChat .mt-lg-3,
  #PTTChat .my-lg-3 {
    margin-top: 10px !important; }
  #PTTChat .mr-lg-3,
  #PTTChat .mx-lg-3 {
    margin-right: 10px !important; }
  #PTTChat .mb-lg-3,
  #PTTChat .my-lg-3 {
    margin-bottom: 10px !important; }
  #PTTChat .ml-lg-3,
  #PTTChat .mx-lg-3 {
    margin-left: 10px !important; }
  #PTTChat .m-lg-4 {
    margin: 15px !important; }
  #PTTChat .mt-lg-4,
  #PTTChat .my-lg-4 {
    margin-top: 15px !important; }
  #PTTChat .mr-lg-4,
  #PTTChat .mx-lg-4 {
    margin-right: 15px !important; }
  #PTTChat .mb-lg-4,
  #PTTChat .my-lg-4 {
    margin-bottom: 15px !important; }
  #PTTChat .ml-lg-4,
  #PTTChat .mx-lg-4 {
    margin-left: 15px !important; }
  #PTTChat .m-lg-5 {
    margin: 30px !important; }
  #PTTChat .mt-lg-5,
  #PTTChat .my-lg-5 {
    margin-top: 30px !important; }
  #PTTChat .mr-lg-5,
  #PTTChat .mx-lg-5 {
    margin-right: 30px !important; }
  #PTTChat .mb-lg-5,
  #PTTChat .my-lg-5 {
    margin-bottom: 30px !important; }
  #PTTChat .ml-lg-5,
  #PTTChat .mx-lg-5 {
    margin-left: 30px !important; }
  #PTTChat .p-lg-0 {
    padding: 0 !important; }
  #PTTChat .pt-lg-0,
  #PTTChat .py-lg-0 {
    padding-top: 0 !important; }
  #PTTChat .pr-lg-0,
  #PTTChat .px-lg-0 {
    padding-right: 0 !important; }
  #PTTChat .pb-lg-0,
  #PTTChat .py-lg-0 {
    padding-bottom: 0 !important; }
  #PTTChat .pl-lg-0,
  #PTTChat .px-lg-0 {
    padding-left: 0 !important; }
  #PTTChat .p-lg-1 {
    padding: 2.5px !important; }
  #PTTChat .pt-lg-1,
  #PTTChat .py-lg-1 {
    padding-top: 2.5px !important; }
  #PTTChat .pr-lg-1,
  #PTTChat .px-lg-1 {
    padding-right: 2.5px !important; }
  #PTTChat .pb-lg-1,
  #PTTChat .py-lg-1 {
    padding-bottom: 2.5px !important; }
  #PTTChat .pl-lg-1,
  #PTTChat .px-lg-1 {
    padding-left: 2.5px !important; }
  #PTTChat .p-lg-2 {
    padding: 5px !important; }
  #PTTChat .pt-lg-2,
  #PTTChat .py-lg-2 {
    padding-top: 5px !important; }
  #PTTChat .pr-lg-2,
  #PTTChat .px-lg-2 {
    padding-right: 5px !important; }
  #PTTChat .pb-lg-2,
  #PTTChat .py-lg-2 {
    padding-bottom: 5px !important; }
  #PTTChat .pl-lg-2,
  #PTTChat .px-lg-2 {
    padding-left: 5px !important; }
  #PTTChat .p-lg-3 {
    padding: 10px !important; }
  #PTTChat .pt-lg-3,
  #PTTChat .py-lg-3 {
    padding-top: 10px !important; }
  #PTTChat .pr-lg-3,
  #PTTChat .px-lg-3 {
    padding-right: 10px !important; }
  #PTTChat .pb-lg-3,
  #PTTChat .py-lg-3 {
    padding-bottom: 10px !important; }
  #PTTChat .pl-lg-3,
  #PTTChat .px-lg-3 {
    padding-left: 10px !important; }
  #PTTChat .p-lg-4 {
    padding: 15px !important; }
  #PTTChat .pt-lg-4,
  #PTTChat .py-lg-4 {
    padding-top: 15px !important; }
  #PTTChat .pr-lg-4,
  #PTTChat .px-lg-4 {
    padding-right: 15px !important; }
  #PTTChat .pb-lg-4,
  #PTTChat .py-lg-4 {
    padding-bottom: 15px !important; }
  #PTTChat .pl-lg-4,
  #PTTChat .px-lg-4 {
    padding-left: 15px !important; }
  #PTTChat .p-lg-5 {
    padding: 30px !important; }
  #PTTChat .pt-lg-5,
  #PTTChat .py-lg-5 {
    padding-top: 30px !important; }
  #PTTChat .pr-lg-5,
  #PTTChat .px-lg-5 {
    padding-right: 30px !important; }
  #PTTChat .pb-lg-5,
  #PTTChat .py-lg-5 {
    padding-bottom: 30px !important; }
  #PTTChat .pl-lg-5,
  #PTTChat .px-lg-5 {
    padding-left: 30px !important; }
  #PTTChat .m-lg-n1 {
    margin: -2.5px !important; }
  #PTTChat .mt-lg-n1,
  #PTTChat .my-lg-n1 {
    margin-top: -2.5px !important; }
  #PTTChat .mr-lg-n1,
  #PTTChat .mx-lg-n1 {
    margin-right: -2.5px !important; }
  #PTTChat .mb-lg-n1,
  #PTTChat .my-lg-n1 {
    margin-bottom: -2.5px !important; }
  #PTTChat .ml-lg-n1,
  #PTTChat .mx-lg-n1 {
    margin-left: -2.5px !important; }
  #PTTChat .m-lg-n2 {
    margin: -5px !important; }
  #PTTChat .mt-lg-n2,
  #PTTChat .my-lg-n2 {
    margin-top: -5px !important; }
  #PTTChat .mr-lg-n2,
  #PTTChat .mx-lg-n2 {
    margin-right: -5px !important; }
  #PTTChat .mb-lg-n2,
  #PTTChat .my-lg-n2 {
    margin-bottom: -5px !important; }
  #PTTChat .ml-lg-n2,
  #PTTChat .mx-lg-n2 {
    margin-left: -5px !important; }
  #PTTChat .m-lg-n3 {
    margin: -10px !important; }
  #PTTChat .mt-lg-n3,
  #PTTChat .my-lg-n3 {
    margin-top: -10px !important; }
  #PTTChat .mr-lg-n3,
  #PTTChat .mx-lg-n3 {
    margin-right: -10px !important; }
  #PTTChat .mb-lg-n3,
  #PTTChat .my-lg-n3 {
    margin-bottom: -10px !important; }
  #PTTChat .ml-lg-n3,
  #PTTChat .mx-lg-n3 {
    margin-left: -10px !important; }
  #PTTChat .m-lg-n4 {
    margin: -15px !important; }
  #PTTChat .mt-lg-n4,
  #PTTChat .my-lg-n4 {
    margin-top: -15px !important; }
  #PTTChat .mr-lg-n4,
  #PTTChat .mx-lg-n4 {
    margin-right: -15px !important; }
  #PTTChat .mb-lg-n4,
  #PTTChat .my-lg-n4 {
    margin-bottom: -15px !important; }
  #PTTChat .ml-lg-n4,
  #PTTChat .mx-lg-n4 {
    margin-left: -15px !important; }
  #PTTChat .m-lg-n5 {
    margin: -30px !important; }
  #PTTChat .mt-lg-n5,
  #PTTChat .my-lg-n5 {
    margin-top: -30px !important; }
  #PTTChat .mr-lg-n5,
  #PTTChat .mx-lg-n5 {
    margin-right: -30px !important; }
  #PTTChat .mb-lg-n5,
  #PTTChat .my-lg-n5 {
    margin-bottom: -30px !important; }
  #PTTChat .ml-lg-n5,
  #PTTChat .mx-lg-n5 {
    margin-left: -30px !important; }
  #PTTChat .m-lg-auto {
    margin: auto !important; }
  #PTTChat .mt-lg-auto,
  #PTTChat .my-lg-auto {
    margin-top: auto !important; }
  #PTTChat .mr-lg-auto,
  #PTTChat .mx-lg-auto {
    margin-right: auto !important; }
  #PTTChat .mb-lg-auto,
  #PTTChat .my-lg-auto {
    margin-bottom: auto !important; }
  #PTTChat .ml-lg-auto,
  #PTTChat .mx-lg-auto {
    margin-left: auto !important; } }

@media (min-width: 1200px) {
  #PTTChat .m-xl-0 {
    margin: 0 !important; }
  #PTTChat .mt-xl-0,
  #PTTChat .my-xl-0 {
    margin-top: 0 !important; }
  #PTTChat .mr-xl-0,
  #PTTChat .mx-xl-0 {
    margin-right: 0 !important; }
  #PTTChat .mb-xl-0,
  #PTTChat .my-xl-0 {
    margin-bottom: 0 !important; }
  #PTTChat .ml-xl-0,
  #PTTChat .mx-xl-0 {
    margin-left: 0 !important; }
  #PTTChat .m-xl-1 {
    margin: 2.5px !important; }
  #PTTChat .mt-xl-1,
  #PTTChat .my-xl-1 {
    margin-top: 2.5px !important; }
  #PTTChat .mr-xl-1,
  #PTTChat .mx-xl-1 {
    margin-right: 2.5px !important; }
  #PTTChat .mb-xl-1,
  #PTTChat .my-xl-1 {
    margin-bottom: 2.5px !important; }
  #PTTChat .ml-xl-1,
  #PTTChat .mx-xl-1 {
    margin-left: 2.5px !important; }
  #PTTChat .m-xl-2 {
    margin: 5px !important; }
  #PTTChat .mt-xl-2,
  #PTTChat .my-xl-2 {
    margin-top: 5px !important; }
  #PTTChat .mr-xl-2,
  #PTTChat .mx-xl-2 {
    margin-right: 5px !important; }
  #PTTChat .mb-xl-2,
  #PTTChat .my-xl-2 {
    margin-bottom: 5px !important; }
  #PTTChat .ml-xl-2,
  #PTTChat .mx-xl-2 {
    margin-left: 5px !important; }
  #PTTChat .m-xl-3 {
    margin: 10px !important; }
  #PTTChat .mt-xl-3,
  #PTTChat .my-xl-3 {
    margin-top: 10px !important; }
  #PTTChat .mr-xl-3,
  #PTTChat .mx-xl-3 {
    margin-right: 10px !important; }
  #PTTChat .mb-xl-3,
  #PTTChat .my-xl-3 {
    margin-bottom: 10px !important; }
  #PTTChat .ml-xl-3,
  #PTTChat .mx-xl-3 {
    margin-left: 10px !important; }
  #PTTChat .m-xl-4 {
    margin: 15px !important; }
  #PTTChat .mt-xl-4,
  #PTTChat .my-xl-4 {
    margin-top: 15px !important; }
  #PTTChat .mr-xl-4,
  #PTTChat .mx-xl-4 {
    margin-right: 15px !important; }
  #PTTChat .mb-xl-4,
  #PTTChat .my-xl-4 {
    margin-bottom: 15px !important; }
  #PTTChat .ml-xl-4,
  #PTTChat .mx-xl-4 {
    margin-left: 15px !important; }
  #PTTChat .m-xl-5 {
    margin: 30px !important; }
  #PTTChat .mt-xl-5,
  #PTTChat .my-xl-5 {
    margin-top: 30px !important; }
  #PTTChat .mr-xl-5,
  #PTTChat .mx-xl-5 {
    margin-right: 30px !important; }
  #PTTChat .mb-xl-5,
  #PTTChat .my-xl-5 {
    margin-bottom: 30px !important; }
  #PTTChat .ml-xl-5,
  #PTTChat .mx-xl-5 {
    margin-left: 30px !important; }
  #PTTChat .p-xl-0 {
    padding: 0 !important; }
  #PTTChat .pt-xl-0,
  #PTTChat .py-xl-0 {
    padding-top: 0 !important; }
  #PTTChat .pr-xl-0,
  #PTTChat .px-xl-0 {
    padding-right: 0 !important; }
  #PTTChat .pb-xl-0,
  #PTTChat .py-xl-0 {
    padding-bottom: 0 !important; }
  #PTTChat .pl-xl-0,
  #PTTChat .px-xl-0 {
    padding-left: 0 !important; }
  #PTTChat .p-xl-1 {
    padding: 2.5px !important; }
  #PTTChat .pt-xl-1,
  #PTTChat .py-xl-1 {
    padding-top: 2.5px !important; }
  #PTTChat .pr-xl-1,
  #PTTChat .px-xl-1 {
    padding-right: 2.5px !important; }
  #PTTChat .pb-xl-1,
  #PTTChat .py-xl-1 {
    padding-bottom: 2.5px !important; }
  #PTTChat .pl-xl-1,
  #PTTChat .px-xl-1 {
    padding-left: 2.5px !important; }
  #PTTChat .p-xl-2 {
    padding: 5px !important; }
  #PTTChat .pt-xl-2,
  #PTTChat .py-xl-2 {
    padding-top: 5px !important; }
  #PTTChat .pr-xl-2,
  #PTTChat .px-xl-2 {
    padding-right: 5px !important; }
  #PTTChat .pb-xl-2,
  #PTTChat .py-xl-2 {
    padding-bottom: 5px !important; }
  #PTTChat .pl-xl-2,
  #PTTChat .px-xl-2 {
    padding-left: 5px !important; }
  #PTTChat .p-xl-3 {
    padding: 10px !important; }
  #PTTChat .pt-xl-3,
  #PTTChat .py-xl-3 {
    padding-top: 10px !important; }
  #PTTChat .pr-xl-3,
  #PTTChat .px-xl-3 {
    padding-right: 10px !important; }
  #PTTChat .pb-xl-3,
  #PTTChat .py-xl-3 {
    padding-bottom: 10px !important; }
  #PTTChat .pl-xl-3,
  #PTTChat .px-xl-3 {
    padding-left: 10px !important; }
  #PTTChat .p-xl-4 {
    padding: 15px !important; }
  #PTTChat .pt-xl-4,
  #PTTChat .py-xl-4 {
    padding-top: 15px !important; }
  #PTTChat .pr-xl-4,
  #PTTChat .px-xl-4 {
    padding-right: 15px !important; }
  #PTTChat .pb-xl-4,
  #PTTChat .py-xl-4 {
    padding-bottom: 15px !important; }
  #PTTChat .pl-xl-4,
  #PTTChat .px-xl-4 {
    padding-left: 15px !important; }
  #PTTChat .p-xl-5 {
    padding: 30px !important; }
  #PTTChat .pt-xl-5,
  #PTTChat .py-xl-5 {
    padding-top: 30px !important; }
  #PTTChat .pr-xl-5,
  #PTTChat .px-xl-5 {
    padding-right: 30px !important; }
  #PTTChat .pb-xl-5,
  #PTTChat .py-xl-5 {
    padding-bottom: 30px !important; }
  #PTTChat .pl-xl-5,
  #PTTChat .px-xl-5 {
    padding-left: 30px !important; }
  #PTTChat .m-xl-n1 {
    margin: -2.5px !important; }
  #PTTChat .mt-xl-n1,
  #PTTChat .my-xl-n1 {
    margin-top: -2.5px !important; }
  #PTTChat .mr-xl-n1,
  #PTTChat .mx-xl-n1 {
    margin-right: -2.5px !important; }
  #PTTChat .mb-xl-n1,
  #PTTChat .my-xl-n1 {
    margin-bottom: -2.5px !important; }
  #PTTChat .ml-xl-n1,
  #PTTChat .mx-xl-n1 {
    margin-left: -2.5px !important; }
  #PTTChat .m-xl-n2 {
    margin: -5px !important; }
  #PTTChat .mt-xl-n2,
  #PTTChat .my-xl-n2 {
    margin-top: -5px !important; }
  #PTTChat .mr-xl-n2,
  #PTTChat .mx-xl-n2 {
    margin-right: -5px !important; }
  #PTTChat .mb-xl-n2,
  #PTTChat .my-xl-n2 {
    margin-bottom: -5px !important; }
  #PTTChat .ml-xl-n2,
  #PTTChat .mx-xl-n2 {
    margin-left: -5px !important; }
  #PTTChat .m-xl-n3 {
    margin: -10px !important; }
  #PTTChat .mt-xl-n3,
  #PTTChat .my-xl-n3 {
    margin-top: -10px !important; }
  #PTTChat .mr-xl-n3,
  #PTTChat .mx-xl-n3 {
    margin-right: -10px !important; }
  #PTTChat .mb-xl-n3,
  #PTTChat .my-xl-n3 {
    margin-bottom: -10px !important; }
  #PTTChat .ml-xl-n3,
  #PTTChat .mx-xl-n3 {
    margin-left: -10px !important; }
  #PTTChat .m-xl-n4 {
    margin: -15px !important; }
  #PTTChat .mt-xl-n4,
  #PTTChat .my-xl-n4 {
    margin-top: -15px !important; }
  #PTTChat .mr-xl-n4,
  #PTTChat .mx-xl-n4 {
    margin-right: -15px !important; }
  #PTTChat .mb-xl-n4,
  #PTTChat .my-xl-n4 {
    margin-bottom: -15px !important; }
  #PTTChat .ml-xl-n4,
  #PTTChat .mx-xl-n4 {
    margin-left: -15px !important; }
  #PTTChat .m-xl-n5 {
    margin: -30px !important; }
  #PTTChat .mt-xl-n5,
  #PTTChat .my-xl-n5 {
    margin-top: -30px !important; }
  #PTTChat .mr-xl-n5,
  #PTTChat .mx-xl-n5 {
    margin-right: -30px !important; }
  #PTTChat .mb-xl-n5,
  #PTTChat .my-xl-n5 {
    margin-bottom: -30px !important; }
  #PTTChat .ml-xl-n5,
  #PTTChat .mx-xl-n5 {
    margin-left: -30px !important; }
  #PTTChat .m-xl-auto {
    margin: auto !important; }
  #PTTChat .mt-xl-auto,
  #PTTChat .my-xl-auto {
    margin-top: auto !important; }
  #PTTChat .mr-xl-auto,
  #PTTChat .mx-xl-auto {
    margin-right: auto !important; }
  #PTTChat .mb-xl-auto,
  #PTTChat .my-xl-auto {
    margin-bottom: auto !important; }
  #PTTChat .ml-xl-auto,
  #PTTChat .mx-xl-auto {
    margin-left: auto !important; } }

#PTTChat .stretched-link::after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  pointer-events: auto;
  content: "";
  background-color: rgba(0, 0, 0, 0); }

#PTTChat .text-monospace {
  font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }

#PTTChat .text-justify {
  text-align: justify !important; }

#PTTChat .text-wrap {
  white-space: normal !important; }

#PTTChat .text-nowrap {
  white-space: nowrap !important; }

#PTTChat .text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap; }

#PTTChat .text-left {
  text-align: left !important; }

#PTTChat .text-right {
  text-align: right !important; }

#PTTChat .text-center {
  text-align: center !important; }

@media (min-width: 576px) {
  #PTTChat .text-sm-left {
    text-align: left !important; }
  #PTTChat .text-sm-right {
    text-align: right !important; }
  #PTTChat .text-sm-center {
    text-align: center !important; } }

@media (min-width: 768px) {
  #PTTChat .text-md-left {
    text-align: left !important; }
  #PTTChat .text-md-right {
    text-align: right !important; }
  #PTTChat .text-md-center {
    text-align: center !important; } }

@media (min-width: 992px) {
  #PTTChat .text-lg-left {
    text-align: left !important; }
  #PTTChat .text-lg-right {
    text-align: right !important; }
  #PTTChat .text-lg-center {
    text-align: center !important; } }

@media (min-width: 1200px) {
  #PTTChat .text-xl-left {
    text-align: left !important; }
  #PTTChat .text-xl-right {
    text-align: right !important; }
  #PTTChat .text-xl-center {
    text-align: center !important; } }

#PTTChat .text-lowercase {
  text-transform: lowercase !important; }

#PTTChat .text-uppercase {
  text-transform: uppercase !important; }

#PTTChat .text-capitalize {
  text-transform: capitalize !important; }

#PTTChat .font-weight-light {
  font-weight: 300 !important; }

#PTTChat .font-weight-lighter {
  font-weight: lighter !important; }

#PTTChat .font-weight-normal {
  font-weight: 400 !important; }

#PTTChat .font-weight-bold {
  font-weight: 700 !important; }

#PTTChat .font-weight-bolder {
  font-weight: bolder !important; }

#PTTChat .font-italic {
  font-style: italic !important; }

#PTTChat .text-white {
  color: #fff !important; }

#PTTChat .text-primary {
  color: #007bff !important; }

#PTTChat a.text-primary:hover, #PTTChat a.text-primary:focus {
  color: #0056b3 !important; }

#PTTChat .text-secondary {
  color: #6c757d !important; }

#PTTChat a.text-secondary:hover, #PTTChat a.text-secondary:focus {
  color: #494f54 !important; }

#PTTChat .text-success {
  color: #28a745 !important; }

#PTTChat a.text-success:hover, #PTTChat a.text-success:focus {
  color: #19692c !important; }

#PTTChat .text-info {
  color: #17a2b8 !important; }

#PTTChat a.text-info:hover, #PTTChat a.text-info:focus {
  color: #0f6674 !important; }

#PTTChat .text-warning {
  color: #ffc107 !important; }

#PTTChat a.text-warning:hover, #PTTChat a.text-warning:focus {
  color: #ba8b00 !important; }

#PTTChat .text-danger {
  color: #dc3545 !important; }

#PTTChat a.text-danger:hover, #PTTChat a.text-danger:focus {
  color: #a71d2a !important; }

#PTTChat .text-light {
  color: #f8f9fa !important; }

#PTTChat a.text-light:hover, #PTTChat a.text-light:focus {
  color: #cbd3da !important; }

#PTTChat .text-dark {
  color: #343a40 !important; }

#PTTChat a.text-dark:hover, #PTTChat a.text-dark:focus {
  color: #121416 !important; }

#PTTChat .text-body {
  color: #212529 !important; }

#PTTChat .text-muted {
  color: #6c757d !important; }

#PTTChat .text-black-50 {
  color: rgba(0, 0, 0, 0.5) !important; }

#PTTChat .text-white-50 {
  color: rgba(255, 255, 255, 0.5) !important; }

#PTTChat .text-hide {
  font: 0/0 a;
  color: transparent;
  text-shadow: none;
  background-color: transparent;
  border: 0; }

#PTTChat .text-decoration-none {
  text-decoration: none !important; }

#PTTChat .text-break {
  word-break: break-word !important;
  word-wrap: break-word !important; }

#PTTChat .text-reset {
  color: inherit !important; }

#PTTChat .visible {
  visibility: visible !important; }

#PTTChat .invisible {
  visibility: hidden !important; }

@media print {
  #PTTChat *,
  #PTTChat *::before,
  #PTTChat *::after {
    text-shadow: none !important;
    box-shadow: none !important; }
  #PTTChat a:not(.btn) {
    text-decoration: underline; }
  #PTTChat abbr[title]::after {
    content: " (" attr(title) ")"; }
  #PTTChat pre {
    white-space: pre-wrap !important; }
  #PTTChat pre,
  #PTTChat blockquote {
    border: 1px solid #adb5bd;
    page-break-inside: avoid; }
  #PTTChat thead {
    display: table-header-group; }
  #PTTChat tr,
  #PTTChat img {
    page-break-inside: avoid; }
  #PTTChat p,
  #PTTChat h2,
  #PTTChat h3 {
    orphans: 3;
    widows: 3; }
  #PTTChat h2,
  #PTTChat h3 {
    page-break-after: avoid; }
  @page {
    #PTTChat {
      size: a3; } }
  #PTTChat body {
    min-width: 992px !important; }
  #PTTChat .container {
    min-width: 992px !important; }
  #PTTChat .navbar {
    display: none; }
  #PTTChat .badge {
    border: 1px solid #000; }
  #PTTChat .table {
    border-collapse: collapse !important; }
    #PTTChat .table td,
    #PTTChat .table th {
      background-color: #fff !important; }
  #PTTChat .table-bordered th,
  #PTTChat .table-bordered td {
    border: 1px solid #dee2e6 !important; }
  #PTTChat .table-dark {
    color: inherit; }
    #PTTChat .table-dark th,
    #PTTChat .table-dark td,
    #PTTChat .table-dark thead th,
    #PTTChat .table-dark tbody + tbody {
      border-color: #dee2e6; }
  #PTTChat .table .thead-dark th {
    color: inherit;
    border-color: #dee2e6; } }

#PTTChat .list-alert-enter,
#PTTChat .list-alert-leave-to {
  opacity: 0;
  transform: translateX(300px); }

#PTTChat .list-alert-leave-active {
  position: absolute; }

#PTTChat .alert {
  transition: all 1s; }

#PTTChat, #PTTChat table {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
  color: #212529;
  text-align: left;
  background-color: #fff; }

#PTTChat.pttbgc-0 .ptt-bg {
  background-color: black; }

#PTTChat.pttbgc-0 .ptt-chat-id {
  color: #ffff66; }

#PTTChat.pttbgc-0 .ptt-chat-time {
  color: #bbbbbb; }

#PTTChat.pttbgc-0 .ptt-chat-msg {
  color: #999900 !important; }

#PTTChat.pttbgc-0 .ptt-chat-type {
  color: white; }

#PTTChat.pttbgc-0 .ptt-chat-type-n {
  color: red; }

#PTTChat.pttbgc-1 .ptt-bg {
  background-color: #0d0d0d; }

#PTTChat.pttbgc-1 .ptt-chat-id {
  color: #ffff6b; }

#PTTChat.pttbgc-1 .ptt-chat-time {
  color: #bebebe; }

#PTTChat.pttbgc-1 .ptt-chat-msg {
  color: #9b9b00 !important; }

#PTTChat.pttbgc-1 .ptt-chat-type {
  color: white; }

#PTTChat.pttbgc-1 .ptt-chat-type-n {
  color: #ff0404; }

#PTTChat.pttbgc-2 .ptt-bg {
  background-color: #1a1a1a; }

#PTTChat.pttbgc-2 .ptt-chat-id {
  color: #ffff71; }

#PTTChat.pttbgc-2 .ptt-chat-time {
  color: #c1c1c1; }

#PTTChat.pttbgc-2 .ptt-chat-msg {
  color: #9e9e00 !important; }

#PTTChat.pttbgc-2 .ptt-chat-type {
  color: white; }

#PTTChat.pttbgc-2 .ptt-chat-type-n {
  color: #ff0808; }

#PTTChat.pttbgc-3 .ptt-bg {
  background-color: #262626; }

#PTTChat.pttbgc-3 .ptt-chat-id {
  color: #ffff76; }

#PTTChat.pttbgc-3 .ptt-chat-time {
  color: #c3c3c3; }

#PTTChat.pttbgc-3 .ptt-chat-msg {
  color: #a0a000 !important; }

#PTTChat.pttbgc-3 .ptt-chat-type {
  color: white; }

#PTTChat.pttbgc-3 .ptt-chat-type-n {
  color: #ff0b0b; }

#PTTChat.pttbgc-4 .ptt-bg {
  background-color: #333333; }

#PTTChat.pttbgc-4 .ptt-chat-id {
  color: #ffff7b; }

#PTTChat.pttbgc-4 .ptt-chat-time {
  color: #c6c6c6; }

#PTTChat.pttbgc-4 .ptt-chat-msg {
  color: #a2a200 !important; }

#PTTChat.pttbgc-4 .ptt-chat-type {
  color: white; }

#PTTChat.pttbgc-4 .ptt-chat-type-n {
  color: #ff0f0f; }

#PTTChat.pttbgc-5 .ptt-bg {
  background-color: #404040; }

#PTTChat.pttbgc-5 .ptt-chat-id {
  color: #ffff81; }

#PTTChat.pttbgc-5 .ptt-chat-time {
  color: #c9c9c9; }

#PTTChat.pttbgc-5 .ptt-chat-msg {
  color: #a4a400 !important; }

#PTTChat.pttbgc-5 .ptt-chat-type {
  color: white; }

#PTTChat.pttbgc-5 .ptt-chat-type-n {
  color: #ff1313; }

#PTTChat.pttbgc-6 .ptt-bg {
  background-color: #4d4d4d; }

#PTTChat.pttbgc-6 .ptt-chat-id {
  color: #ffff86; }

#PTTChat.pttbgc-6 .ptt-chat-time {
  color: #cccccc; }

#PTTChat.pttbgc-6 .ptt-chat-msg {
  color: #a7a700 !important; }

#PTTChat.pttbgc-6 .ptt-chat-type {
  color: white; }

#PTTChat.pttbgc-6 .ptt-chat-type-n {
  color: #ff1717; }

#PTTChat.pttbgc-7 .ptt-bg {
  background-color: #595959; }

#PTTChat.pttbgc-7 .ptt-chat-id {
  color: #ffff8b; }

#PTTChat.pttbgc-7 .ptt-chat-time {
  color: #cfcfcf; }

#PTTChat.pttbgc-7 .ptt-chat-msg {
  color: #a9a900 !important; }

#PTTChat.pttbgc-7 .ptt-chat-type {
  color: white; }

#PTTChat.pttbgc-7 .ptt-chat-type-n {
  color: #ff1b1b; }

#PTTChat.pttbgc-8 .ptt-bg {
  background-color: #666666; }

#PTTChat.pttbgc-8 .ptt-chat-id {
  color: #ffff91; }

#PTTChat.pttbgc-8 .ptt-chat-time {
  color: #d1d1d1; }

#PTTChat.pttbgc-8 .ptt-chat-msg {
  color: #abab00 !important; }

#PTTChat.pttbgc-8 .ptt-chat-type {
  color: white; }

#PTTChat.pttbgc-8 .ptt-chat-type-n {
  color: #ff1f1f; }

#PTTChat.pttbgc-9 .ptt-bg {
  background-color: #737373; }

#PTTChat.pttbgc-9 .ptt-chat-id {
  color: #ffff96; }

#PTTChat.pttbgc-9 .ptt-chat-time {
  color: #d4d4d4; }

#PTTChat.pttbgc-9 .ptt-chat-msg {
  color: #aeae00 !important; }

#PTTChat.pttbgc-9 .ptt-chat-type {
  color: white; }

#PTTChat.pttbgc-9 .ptt-chat-type-n {
  color: #ff2222; }

#PTTChat.pttbgc-10 .ptt-bg {
  background-color: gray; }

#PTTChat.pttbgc-10 .ptt-chat-id {
  color: #ffff9c; }

#PTTChat.pttbgc-10 .ptt-chat-time {
  color: #d7d7d7; }

#PTTChat.pttbgc-10 .ptt-chat-msg {
  color: #b0b000 !important; }

#PTTChat.pttbgc-10 .ptt-chat-type {
  color: white; }

#PTTChat.pttbgc-10 .ptt-chat-type-n {
  color: #ff2626; }

#PTTChat.pttbgc-11 .ptt-bg {
  background-color: #8c8c8c; }

#PTTChat.pttbgc-11 .ptt-chat-id {
  color: #ffffa1; }

#PTTChat.pttbgc-11 .ptt-chat-time {
  color: #dadada; }

#PTTChat.pttbgc-11 .ptt-chat-msg {
  color: #b2b200 !important; }

#PTTChat.pttbgc-11 .ptt-chat-type {
  color: white; }

#PTTChat.pttbgc-11 .ptt-chat-type-n {
  color: #ff2a2a; }

#PTTChat.pttbgc-12 .ptt-bg {
  background-color: #999999; }

#PTTChat.pttbgc-12 .ptt-chat-id {
  color: #888800; }

#PTTChat.pttbgc-12 .ptt-chat-time {
  color: #474747; }

#PTTChat.pttbgc-12 .ptt-chat-msg {
  color: #3a3a00 !important; }

#PTTChat.pttbgc-12 .ptt-chat-type {
  color: #616161; }

#PTTChat.pttbgc-12 .ptt-chat-type-n {
  color: #610000; }

#PTTChat.pttbgc-13 .ptt-bg {
  background-color: #a6a6a6; }

#PTTChat.pttbgc-13 .ptt-chat-id {
  color: #8d8d00; }

#PTTChat.pttbgc-13 .ptt-chat-time {
  color: #4a4a4a; }

#PTTChat.pttbgc-13 .ptt-chat-msg {
  color: #3c3c00 !important; }

#PTTChat.pttbgc-13 .ptt-chat-type {
  color: #656565; }

#PTTChat.pttbgc-13 .ptt-chat-type-n {
  color: #650000; }

#PTTChat.pttbgc-14 .ptt-bg {
  background-color: #b3b3b3; }

#PTTChat.pttbgc-14 .ptt-chat-id {
  color: #929200; }

#PTTChat.pttbgc-14 .ptt-chat-time {
  color: #4d4d4d; }

#PTTChat.pttbgc-14 .ptt-chat-msg {
  color: #3f3f00 !important; }

#PTTChat.pttbgc-14 .ptt-chat-type {
  color: dimgray; }

#PTTChat.pttbgc-14 .ptt-chat-type-n {
  color: #690000; }

#PTTChat.pttbgc-15 .ptt-bg {
  background-color: #bfbfbf; }

#PTTChat.pttbgc-15 .ptt-chat-id {
  color: #989800; }

#PTTChat.pttbgc-15 .ptt-chat-time {
  color: #4f4f4f; }

#PTTChat.pttbgc-15 .ptt-chat-msg {
  color: #414100 !important; }

#PTTChat.pttbgc-15 .ptt-chat-type {
  color: #6c6c6c; }

#PTTChat.pttbgc-15 .ptt-chat-type-n {
  color: #6c0000; }

#PTTChat.pttbgc-16 .ptt-bg {
  background-color: #cccccc; }

#PTTChat.pttbgc-16 .ptt-chat-id {
  color: #9d9d00; }

#PTTChat.pttbgc-16 .ptt-chat-time {
  color: #525252; }

#PTTChat.pttbgc-16 .ptt-chat-msg {
  color: #434300 !important; }

#PTTChat.pttbgc-16 .ptt-chat-type {
  color: #707070; }

#PTTChat.pttbgc-16 .ptt-chat-type-n {
  color: #700000; }

#PTTChat.pttbgc-17 .ptt-bg {
  background-color: #d9d9d9; }

#PTTChat.pttbgc-17 .ptt-chat-id {
  color: #a2a200; }

#PTTChat.pttbgc-17 .ptt-chat-time {
  color: #555555; }

#PTTChat.pttbgc-17 .ptt-chat-msg {
  color: #464600 !important; }

#PTTChat.pttbgc-17 .ptt-chat-type {
  color: #747474; }

#PTTChat.pttbgc-17 .ptt-chat-type-n {
  color: #740000; }

#PTTChat.pttbgc-18 .ptt-bg {
  background-color: #e6e6e6; }

#PTTChat.pttbgc-18 .ptt-chat-id {
  color: #a8a800; }

#PTTChat.pttbgc-18 .ptt-chat-time {
  color: #585858; }

#PTTChat.pttbgc-18 .ptt-chat-msg {
  color: #484800 !important; }

#PTTChat.pttbgc-18 .ptt-chat-type {
  color: #787878; }

#PTTChat.pttbgc-18 .ptt-chat-type-n {
  color: #780000; }

#PTTChat.pttbgc-19 .ptt-bg {
  background-color: #f2f2f2; }

#PTTChat.pttbgc-19 .ptt-chat-id {
  color: #adad00; }

#PTTChat.pttbgc-19 .ptt-chat-time {
  color: #5b5b5b; }

#PTTChat.pttbgc-19 .ptt-chat-msg {
  color: #4a4a00 !important; }

#PTTChat.pttbgc-19 .ptt-chat-type {
  color: #7c7c7c; }

#PTTChat.pttbgc-19 .ptt-chat-type-n {
  color: #7c0000; }

#PTTChat.pttbgc-20 .ptt-bg {
  background-color: white; }

#PTTChat.pttbgc-20 .ptt-chat-id {
  color: #b3b300; }

#PTTChat.pttbgc-20 .ptt-chat-time {
  color: #5e5e5e; }

#PTTChat.pttbgc-20 .ptt-chat-msg {
  color: #4d4d00 !important; }

#PTTChat.pttbgc-20 .ptt-chat-type {
  color: gray; }

#PTTChat.pttbgc-20 .ptt-chat-type-n {
  color: maroon; }

#PTTChat.pttc-10 .ptt-border {
  border: 1px solid black !important; }

#PTTChat.pttc-10 .ptt-text {
  color: black !important; }

#PTTChat.pttc-10 .ptt-btnoutline {
  color: black;
  color: black;
  border-color: black; }
  #PTTChat.pttc-10 .ptt-btnoutline:hover {
    color: #fff;
    background-color: black;
    border-color: black; }
  #PTTChat.pttc-10 .ptt-btnoutline:focus, #PTTChat.pttc-10 .ptt-btnoutline.focus {
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.5); }
  #PTTChat.pttc-10 .ptt-btnoutline.disabled, #PTTChat.pttc-10 .ptt-btnoutline:disabled {
    color: black;
    background-color: transparent; }
  #PTTChat.pttc-10 .ptt-btnoutline:not(:disabled):not(.disabled):active, #PTTChat.pttc-10 .ptt-btnoutline:not(:disabled):not(.disabled).active,
  .show > #PTTChat.pttc-10 .ptt-btnoutline.dropdown-toggle {
    color: #fff;
    background-color: black;
    border-color: black; }
    #PTTChat.pttc-10 .ptt-btnoutline:not(:disabled):not(.disabled):active:focus, #PTTChat.pttc-10 .ptt-btnoutline:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat.pttc-10 .ptt-btnoutline.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.5); }

#PTTChat.pttc-10 .nav-link.active,
#PTTChat.pttc-10 .nav-item.show .nav-link {
  color: black;
  background-color: #fff;
  border-color: #dee2e6 #dee2e6 #fff; }

#PTTChat.pttc-9 .ptt-border {
  border: 1px solid #1a1a1a !important; }

#PTTChat.pttc-9 .ptt-text {
  color: #1a1a1a !important; }

#PTTChat.pttc-9 .ptt-btnoutline {
  color: #1a1a1a;
  color: #1a1a1a;
  border-color: #1a1a1a; }
  #PTTChat.pttc-9 .ptt-btnoutline:hover {
    color: #fff;
    background-color: #1a1a1a;
    border-color: #1a1a1a; }
  #PTTChat.pttc-9 .ptt-btnoutline:focus, #PTTChat.pttc-9 .ptt-btnoutline.focus {
    box-shadow: 0 0 0 2px rgba(26, 26, 26, 0.5); }
  #PTTChat.pttc-9 .ptt-btnoutline.disabled, #PTTChat.pttc-9 .ptt-btnoutline:disabled {
    color: #1a1a1a;
    background-color: transparent; }
  #PTTChat.pttc-9 .ptt-btnoutline:not(:disabled):not(.disabled):active, #PTTChat.pttc-9 .ptt-btnoutline:not(:disabled):not(.disabled).active,
  .show > #PTTChat.pttc-9 .ptt-btnoutline.dropdown-toggle {
    color: #fff;
    background-color: #1a1a1a;
    border-color: #1a1a1a; }
    #PTTChat.pttc-9 .ptt-btnoutline:not(:disabled):not(.disabled):active:focus, #PTTChat.pttc-9 .ptt-btnoutline:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat.pttc-9 .ptt-btnoutline.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(26, 26, 26, 0.5); }

#PTTChat.pttc-9 .nav-link.active,
#PTTChat.pttc-9 .nav-item.show .nav-link {
  color: #1a1a1a;
  background-color: #fff;
  border-color: #dee2e6 #dee2e6 #fff; }

#PTTChat.pttc-8 .ptt-border {
  border: 1px solid #333333 !important; }

#PTTChat.pttc-8 .ptt-text {
  color: #333333 !important; }

#PTTChat.pttc-8 .ptt-btnoutline {
  color: #333333;
  color: #333333;
  border-color: #333333; }
  #PTTChat.pttc-8 .ptt-btnoutline:hover {
    color: #fff;
    background-color: #333333;
    border-color: #333333; }
  #PTTChat.pttc-8 .ptt-btnoutline:focus, #PTTChat.pttc-8 .ptt-btnoutline.focus {
    box-shadow: 0 0 0 2px rgba(51, 51, 51, 0.5); }
  #PTTChat.pttc-8 .ptt-btnoutline.disabled, #PTTChat.pttc-8 .ptt-btnoutline:disabled {
    color: #333333;
    background-color: transparent; }
  #PTTChat.pttc-8 .ptt-btnoutline:not(:disabled):not(.disabled):active, #PTTChat.pttc-8 .ptt-btnoutline:not(:disabled):not(.disabled).active,
  .show > #PTTChat.pttc-8 .ptt-btnoutline.dropdown-toggle {
    color: #fff;
    background-color: #333333;
    border-color: #333333; }
    #PTTChat.pttc-8 .ptt-btnoutline:not(:disabled):not(.disabled):active:focus, #PTTChat.pttc-8 .ptt-btnoutline:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat.pttc-8 .ptt-btnoutline.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(51, 51, 51, 0.5); }

#PTTChat.pttc-8 .nav-link.active,
#PTTChat.pttc-8 .nav-item.show .nav-link {
  color: #333333;
  background-color: #fff;
  border-color: #dee2e6 #dee2e6 #fff; }

#PTTChat.pttc-7 .ptt-border {
  border: 1px solid #4d4d4d !important; }

#PTTChat.pttc-7 .ptt-text {
  color: #4d4d4d !important; }

#PTTChat.pttc-7 .ptt-btnoutline {
  color: #4d4d4d;
  color: #4d4d4d;
  border-color: #4d4d4d; }
  #PTTChat.pttc-7 .ptt-btnoutline:hover {
    color: #fff;
    background-color: #4d4d4d;
    border-color: #4d4d4d; }
  #PTTChat.pttc-7 .ptt-btnoutline:focus, #PTTChat.pttc-7 .ptt-btnoutline.focus {
    box-shadow: 0 0 0 2px rgba(77, 77, 77, 0.5); }
  #PTTChat.pttc-7 .ptt-btnoutline.disabled, #PTTChat.pttc-7 .ptt-btnoutline:disabled {
    color: #4d4d4d;
    background-color: transparent; }
  #PTTChat.pttc-7 .ptt-btnoutline:not(:disabled):not(.disabled):active, #PTTChat.pttc-7 .ptt-btnoutline:not(:disabled):not(.disabled).active,
  .show > #PTTChat.pttc-7 .ptt-btnoutline.dropdown-toggle {
    color: #fff;
    background-color: #4d4d4d;
    border-color: #4d4d4d; }
    #PTTChat.pttc-7 .ptt-btnoutline:not(:disabled):not(.disabled):active:focus, #PTTChat.pttc-7 .ptt-btnoutline:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat.pttc-7 .ptt-btnoutline.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(77, 77, 77, 0.5); }

#PTTChat.pttc-7 .nav-link.active,
#PTTChat.pttc-7 .nav-item.show .nav-link {
  color: #4d4d4d;
  background-color: #fff;
  border-color: #dee2e6 #dee2e6 #fff; }

#PTTChat.pttc-6 .ptt-border {
  border: 1px solid #666666 !important; }

#PTTChat.pttc-6 .ptt-text {
  color: #666666 !important; }

#PTTChat.pttc-6 .ptt-btnoutline {
  color: #666666;
  color: #666666;
  border-color: #666666; }
  #PTTChat.pttc-6 .ptt-btnoutline:hover {
    color: #fff;
    background-color: #666666;
    border-color: #666666; }
  #PTTChat.pttc-6 .ptt-btnoutline:focus, #PTTChat.pttc-6 .ptt-btnoutline.focus {
    box-shadow: 0 0 0 2px rgba(102, 102, 102, 0.5); }
  #PTTChat.pttc-6 .ptt-btnoutline.disabled, #PTTChat.pttc-6 .ptt-btnoutline:disabled {
    color: #666666;
    background-color: transparent; }
  #PTTChat.pttc-6 .ptt-btnoutline:not(:disabled):not(.disabled):active, #PTTChat.pttc-6 .ptt-btnoutline:not(:disabled):not(.disabled).active,
  .show > #PTTChat.pttc-6 .ptt-btnoutline.dropdown-toggle {
    color: #fff;
    background-color: #666666;
    border-color: #666666; }
    #PTTChat.pttc-6 .ptt-btnoutline:not(:disabled):not(.disabled):active:focus, #PTTChat.pttc-6 .ptt-btnoutline:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat.pttc-6 .ptt-btnoutline.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(102, 102, 102, 0.5); }

#PTTChat.pttc-6 .nav-link.active,
#PTTChat.pttc-6 .nav-item.show .nav-link {
  color: #666666;
  background-color: #fff;
  border-color: #dee2e6 #dee2e6 #fff; }

#PTTChat.pttc-5 .ptt-border {
  border: 1px solid gray !important; }

#PTTChat.pttc-5 .ptt-text {
  color: gray !important; }

#PTTChat.pttc-5 .ptt-btnoutline {
  color: gray;
  color: gray;
  border-color: gray; }
  #PTTChat.pttc-5 .ptt-btnoutline:hover {
    color: #fff;
    background-color: gray;
    border-color: gray; }
  #PTTChat.pttc-5 .ptt-btnoutline:focus, #PTTChat.pttc-5 .ptt-btnoutline.focus {
    box-shadow: 0 0 0 2px rgba(128, 128, 128, 0.5); }
  #PTTChat.pttc-5 .ptt-btnoutline.disabled, #PTTChat.pttc-5 .ptt-btnoutline:disabled {
    color: gray;
    background-color: transparent; }
  #PTTChat.pttc-5 .ptt-btnoutline:not(:disabled):not(.disabled):active, #PTTChat.pttc-5 .ptt-btnoutline:not(:disabled):not(.disabled).active,
  .show > #PTTChat.pttc-5 .ptt-btnoutline.dropdown-toggle {
    color: #fff;
    background-color: gray;
    border-color: gray; }
    #PTTChat.pttc-5 .ptt-btnoutline:not(:disabled):not(.disabled):active:focus, #PTTChat.pttc-5 .ptt-btnoutline:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat.pttc-5 .ptt-btnoutline.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(128, 128, 128, 0.5); }

#PTTChat.pttc-5 .nav-link.active,
#PTTChat.pttc-5 .nav-item.show .nav-link {
  color: gray;
  background-color: #fff;
  border-color: #dee2e6 #dee2e6 #fff; }

#PTTChat.pttc-4 .ptt-border {
  border: 1px solid #999999 !important; }

#PTTChat.pttc-4 .ptt-text {
  color: #999999 !important; }

#PTTChat.pttc-4 .ptt-btnoutline {
  color: #999999;
  color: #999999;
  border-color: #999999; }
  #PTTChat.pttc-4 .ptt-btnoutline:hover {
    color: #212529;
    background-color: #999999;
    border-color: #999999; }
  #PTTChat.pttc-4 .ptt-btnoutline:focus, #PTTChat.pttc-4 .ptt-btnoutline.focus {
    box-shadow: 0 0 0 2px rgba(153, 153, 153, 0.5); }
  #PTTChat.pttc-4 .ptt-btnoutline.disabled, #PTTChat.pttc-4 .ptt-btnoutline:disabled {
    color: #999999;
    background-color: transparent; }
  #PTTChat.pttc-4 .ptt-btnoutline:not(:disabled):not(.disabled):active, #PTTChat.pttc-4 .ptt-btnoutline:not(:disabled):not(.disabled).active,
  .show > #PTTChat.pttc-4 .ptt-btnoutline.dropdown-toggle {
    color: #212529;
    background-color: #999999;
    border-color: #999999; }
    #PTTChat.pttc-4 .ptt-btnoutline:not(:disabled):not(.disabled):active:focus, #PTTChat.pttc-4 .ptt-btnoutline:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat.pttc-4 .ptt-btnoutline.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(153, 153, 153, 0.5); }

#PTTChat.pttc-4 .nav-link.active,
#PTTChat.pttc-4 .nav-item.show .nav-link {
  color: #999999;
  background-color: #fff;
  border-color: #dee2e6 #dee2e6 #fff; }

#PTTChat.pttc-3 .ptt-border {
  border: 1px solid #b3b3b3 !important; }

#PTTChat.pttc-3 .ptt-text {
  color: #b3b3b3 !important; }

#PTTChat.pttc-3 .ptt-btnoutline {
  color: #b3b3b3;
  color: #b3b3b3;
  border-color: #b3b3b3; }
  #PTTChat.pttc-3 .ptt-btnoutline:hover {
    color: #212529;
    background-color: #b3b3b3;
    border-color: #b3b3b3; }
  #PTTChat.pttc-3 .ptt-btnoutline:focus, #PTTChat.pttc-3 .ptt-btnoutline.focus {
    box-shadow: 0 0 0 2px rgba(179, 179, 179, 0.5); }
  #PTTChat.pttc-3 .ptt-btnoutline.disabled, #PTTChat.pttc-3 .ptt-btnoutline:disabled {
    color: #b3b3b3;
    background-color: transparent; }
  #PTTChat.pttc-3 .ptt-btnoutline:not(:disabled):not(.disabled):active, #PTTChat.pttc-3 .ptt-btnoutline:not(:disabled):not(.disabled).active,
  .show > #PTTChat.pttc-3 .ptt-btnoutline.dropdown-toggle {
    color: #212529;
    background-color: #b3b3b3;
    border-color: #b3b3b3; }
    #PTTChat.pttc-3 .ptt-btnoutline:not(:disabled):not(.disabled):active:focus, #PTTChat.pttc-3 .ptt-btnoutline:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat.pttc-3 .ptt-btnoutline.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(179, 179, 179, 0.5); }

#PTTChat.pttc-3 .nav-link.active,
#PTTChat.pttc-3 .nav-item.show .nav-link {
  color: #b3b3b3;
  background-color: #fff;
  border-color: #dee2e6 #dee2e6 #fff; }

#PTTChat.pttc-2 .ptt-border {
  border: 1px solid #cccccc !important; }

#PTTChat.pttc-2 .ptt-text {
  color: #cccccc !important; }

#PTTChat.pttc-2 .ptt-btnoutline {
  color: #cccccc;
  color: #cccccc;
  border-color: #cccccc; }
  #PTTChat.pttc-2 .ptt-btnoutline:hover {
    color: #212529;
    background-color: #cccccc;
    border-color: #cccccc; }
  #PTTChat.pttc-2 .ptt-btnoutline:focus, #PTTChat.pttc-2 .ptt-btnoutline.focus {
    box-shadow: 0 0 0 2px rgba(204, 204, 204, 0.5); }
  #PTTChat.pttc-2 .ptt-btnoutline.disabled, #PTTChat.pttc-2 .ptt-btnoutline:disabled {
    color: #cccccc;
    background-color: transparent; }
  #PTTChat.pttc-2 .ptt-btnoutline:not(:disabled):not(.disabled):active, #PTTChat.pttc-2 .ptt-btnoutline:not(:disabled):not(.disabled).active,
  .show > #PTTChat.pttc-2 .ptt-btnoutline.dropdown-toggle {
    color: #212529;
    background-color: #cccccc;
    border-color: #cccccc; }
    #PTTChat.pttc-2 .ptt-btnoutline:not(:disabled):not(.disabled):active:focus, #PTTChat.pttc-2 .ptt-btnoutline:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat.pttc-2 .ptt-btnoutline.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(204, 204, 204, 0.5); }

#PTTChat.pttc-2 .nav-link.active,
#PTTChat.pttc-2 .nav-item.show .nav-link {
  color: #cccccc;
  background-color: #fff;
  border-color: #dee2e6 #dee2e6 #fff; }

#PTTChat.pttc-1 .ptt-border {
  border: 1px solid #e6e6e6 !important; }

#PTTChat.pttc-1 .ptt-text {
  color: #e6e6e6 !important; }

#PTTChat.pttc-1 .ptt-btnoutline {
  color: #e6e6e6;
  color: #e6e6e6;
  border-color: #e6e6e6; }
  #PTTChat.pttc-1 .ptt-btnoutline:hover {
    color: #212529;
    background-color: #e6e6e6;
    border-color: #e6e6e6; }
  #PTTChat.pttc-1 .ptt-btnoutline:focus, #PTTChat.pttc-1 .ptt-btnoutline.focus {
    box-shadow: 0 0 0 2px rgba(230, 230, 230, 0.5); }
  #PTTChat.pttc-1 .ptt-btnoutline.disabled, #PTTChat.pttc-1 .ptt-btnoutline:disabled {
    color: #e6e6e6;
    background-color: transparent; }
  #PTTChat.pttc-1 .ptt-btnoutline:not(:disabled):not(.disabled):active, #PTTChat.pttc-1 .ptt-btnoutline:not(:disabled):not(.disabled).active,
  .show > #PTTChat.pttc-1 .ptt-btnoutline.dropdown-toggle {
    color: #212529;
    background-color: #e6e6e6;
    border-color: #e6e6e6; }
    #PTTChat.pttc-1 .ptt-btnoutline:not(:disabled):not(.disabled):active:focus, #PTTChat.pttc-1 .ptt-btnoutline:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat.pttc-1 .ptt-btnoutline.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(230, 230, 230, 0.5); }

#PTTChat.pttc-1 .nav-link.active,
#PTTChat.pttc-1 .nav-item.show .nav-link {
  color: #e6e6e6;
  background-color: #fff;
  border-color: #dee2e6 #dee2e6 #fff; }

#PTTChat.pttc-0 .ptt-border {
  border: 1px solid white !important; }

#PTTChat.pttc-0 .ptt-text {
  color: white !important; }

#PTTChat.pttc-0 .ptt-btnoutline {
  color: white;
  color: white;
  border-color: white; }
  #PTTChat.pttc-0 .ptt-btnoutline:hover {
    color: #212529;
    background-color: white;
    border-color: white; }
  #PTTChat.pttc-0 .ptt-btnoutline:focus, #PTTChat.pttc-0 .ptt-btnoutline.focus {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5); }
  #PTTChat.pttc-0 .ptt-btnoutline.disabled, #PTTChat.pttc-0 .ptt-btnoutline:disabled {
    color: white;
    background-color: transparent; }
  #PTTChat.pttc-0 .ptt-btnoutline:not(:disabled):not(.disabled):active, #PTTChat.pttc-0 .ptt-btnoutline:not(:disabled):not(.disabled).active,
  .show > #PTTChat.pttc-0 .ptt-btnoutline.dropdown-toggle {
    color: #212529;
    background-color: white;
    border-color: white; }
    #PTTChat.pttc-0 .ptt-btnoutline:not(:disabled):not(.disabled):active:focus, #PTTChat.pttc-0 .ptt-btnoutline:not(:disabled):not(.disabled).active:focus,
    .show > #PTTChat.pttc-0 .ptt-btnoutline.dropdown-toggle:focus {
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5); }

#PTTChat.pttc-0 .nav-link.active,
#PTTChat.pttc-0 .nav-item.show .nav-link {
  color: white;
  background-color: #fff;
  border-color: #dee2e6 #dee2e6 #fff; }

#PTTChat.position-absolute {
  position: absolute !important; }

#PTTChat.w-100 {
  width: 100% !important; }

.position-relative {
  position: relative !important; }

#PTTChat .ptt-chat {
  font-weight: 500; }

#PTTChat .ptt-chat-msg {
  word-break: break-word; }

#PTTChat hr {
  border-top: 1px solid rgba(128, 128, 128, 0.5) !important; }

#PTTChat .ptt-chat-msg a {
  text-decoration: underline !important; }

#PTTChat .dropdown-submenu {
  position: relative; }

#PTTChat .dropdown-submenu > .dropdown-menu {
  top: 0;
  left: 50%;
  margin-top: -6px; }

#PTTChat .dropdown-submenu:hover > .dropdown-menu {
  display: block; }

#PTTChat .dropdown-submenu > a:after {
  display: block;
  content: " ";
  float: right;
  border-color: transparent;
  border-style: solid;
  border-width: 5px 0 5px 5px;
  border-left-color: #ccc;
  margin-top: 5px;
  margin-right: -10px; }

#PTTChat .transition-smooth {
  height: 0;
  overflow: hidden;
  transition: 1s; }

#PTTChat .col-form-label {
  padding-top: 4.75px;
  padding-bottom: 4.75px;
  margin-bottom: 0;
  font-size: inherit;
  line-height: 1.5; }

#PTTChat .container,
#PTTChat .col,
#PTTChat .col-1,
#PTTChat .col-2,
#PTTChat .col-3,
#PTTChat .col-4,
#PTTChat .col-5,
#PTTChat .col-6,
#PTTChat .col-7,
#PTTChat .col-8,
#PTTChat .col-9,
#PTTChat .col-10,
#PTTChat .col-11,
#PTTChat .col-12,
#PTTChat .col-auto,
#PTTChat .col-lg,
#PTTChat .col-lg-1,
#PTTChat .col-lg-2,
#PTTChat .col-lg-3,
#PTTChat .col-lg-4,
#PTTChat .col-lg-5,
#PTTChat .col-lg-6,
#PTTChat .col-lg-7,
#PTTChat .col-lg-8,
#PTTChat .col-lg-9,
#PTTChat .col-lg-10,
#PTTChat .col-lg-11,
#PTTChat .col-lg-12,
#PTTChat .col-lg-auto,
#PTTChat .col-md,
#PTTChat .col-md-1,
#PTTChat .col-md-2,
#PTTChat .col-md-3,
#PTTChat .col-md-4,
#PTTChat .col-md-5,
#PTTChat .col-md-6,
#PTTChat .col-md-7,
#PTTChat .col-md-8,
#PTTChat .col-md-9,
#PTTChat .col-md-10,
#PTTChat .col-md-11,
#PTTChat .col-md-12,
#PTTChat .col-md-auto,
#PTTChat .col-sm,
#PTTChat .col-sm-1,
#PTTChat .col-sm-2,
#PTTChat .col-sm-3,
#PTTChat .col-sm-4,
#PTTChat .col-sm-5,
#PTTChat .col-sm-6,
#PTTChat .col-sm-7,
#PTTChat .col-sm-8,
#PTTChat .col-sm-9,
#PTTChat .col-sm-10,
#PTTChat .col-sm-11,
#PTTChat .col-sm-12,
#PTTChat .col-sm-auto,
#PTTChat .col-xl,
#PTTChat .col-xl-1,
#PTTChat .col-xl-2,
#PTTChat .col-xl-3,
#PTTChat .col-xl-4,
#PTTChat .col-xl-5,
#PTTChat .col-xl-6,
#PTTChat .col-xl-7,
#PTTChat .col-xl-8,
#PTTChat .col-xl-9,
#PTTChat .col-xl-10,
#PTTChat .col-xl-11,
#PTTChat .col-xl-12,
#PTTChat .col-xl-auto {
  padding-top: 0px;
  padding-bottom: 0px; }

#pttchatparent.d-flex, #fakeparent.d-flex {
  display: flex !important; }

#fakeparent.flex-row {
  flex-direction: row !important; }

#fakeparent.flex-column {
  flex-direction: column !important; }

#PTTChat .blockquote-footer::before {
  content: ""; }

#PTTChat {
  font-family: sans-serif;
  line-height: 1.15;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0); }

#PTTChat {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
  color: #212529;
  text-align: left;
  background-color: #fff; }
`
  switch (document.readyState) {
    case 'complete': case 'interactive':
      document.body.appendChild($style)
      break
    default:
      window.addEventListener('DOMContentLoaded', () => { document.body.appendChild($style) })
      break
  }
})()
