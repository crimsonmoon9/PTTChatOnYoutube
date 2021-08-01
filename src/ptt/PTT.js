export class PTTStatus {
  constructor () {
    this.login = false
    this.pageStatus = 0
    this.screen = []
    this.screenStatus = 0
    this.pageStateFilter = [
      { reg: /請輸入代號，或以 guest 參觀，或以 new 註冊/, state: 0 },
      { reg: /上方為使用者心情點播留言區|【 精華公佈欄 】/, state: 1 },
      { reg: /^\[←\]離開 \[→\]閱讀/, state: 2 },
      { reg: /目前顯示: 第 01/, state: 3 },
      { reg: /目前顯示: 第/, state: 4 }
    ]
  }

  clearScreen () {
    console.log('clearScreen')
    this.screen = []
    this.screenStatus = 0
  }

  screenHasText (regExp) {
    console.log('screenHasText')
    const reg = new RegExp(regExp, 'i')
    let result
    if (this.screenStatus === 0) {
      const el = $('[data-type="bbsline"]')
      for (let i = 0; i < el.length; i++) {
        this.screen.push(el[i].textContent)
        if (!result) result = reg.exec(el[i].textContent)
      }
      this.screenStatus = 1
    } else {
      for (let i = 0; i < this.screen.length; i++) {
        result = reg.exec(this.screen[i])
        if (result) break
      }
    }
    console.log(`screenHasText: "${result}"`)
    return result
  }

  updatePttState () {
    console.log('updatePttState')
    this.clearScreen()
    for (let i = 0; i < this.pageStateFilter.length; i++) {
      const filter = this.pageStateFilter[i]
      const result = this.screenHasText(filter.reg)
      if (result) {
        this.pageStatus = filter.state
        return
      }
    }
  }
}
