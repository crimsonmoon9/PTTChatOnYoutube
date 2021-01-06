# PTTChatOnYoutube
在Youtube上面顯示PTT推文

## 如何開始開發

編輯腳本:
>1. 推薦使用violentmonkey，並使用chrome開發，Firefox無法載入本地檔案。
>2. 管理擴充功能/套件->允許存取檔案位置打勾
>3. 新建腳本並將開頭註解的\=\=UserScript\=\=部分貼進去
>4. 將@require file://E:\\*\Main.user.js 路徑改成你的檔案位置
>5. 用你習慣的IDE打開腳本並修改Main.user.js腳本

所有的腳本最終都會合併到Main.user.js發佈，發佈前會設置正確的版號並刪除開發用的```@require file://E:\\*\Main.user.js```

PTTConnect部分可以單獨在term.ptt.cc測試

min檔為VScode插件Minify自動生成，以避免.js太冗長

預覽腳本效果:
>1. 儲存檔案
>2. 儲存violentmonkey腳本(沒有作任何更動也要儲存，否則會讀取瀏覽器內的快取不會重新載入腳本)
>3. 重新整理網頁，violentmonkey會讀取完標頭後載入本地檔案。

## 建議及回報

因為我本身是寫Unity、C#，前後端都不太了解也不常碰js。如果有任何建議或指教請歡迎提供討論。

## TODO List
#### Youtube
- [ ] 修正自動滾動功能有時候會失敗的問題
- [ ] 彈幕版本
- [ ] 彈幕版本

#### PTT
- [ ] 推文功能
- [ ] 任務柱列功能
- [ ] 修正PTT有時候會爆炸沒處理到的問題

#### Script
- [ ] 把舊的功能搬到新的vue物件上面
- [ ] 透過vuex element資料傳輸 [vue教學](https://ithelp.ithome.com.tw/users/20107673/ironman/1470?page=1) [todolist範例](https://codepen.io/oddvalue/pen/dpBGpj) [todolist範例2](https://codepen.io/mkumaran/pen/vZgara?editors=1010)
- [ ] 根據網址撈實況開始時間[HoloStats](https://github.com/PoiScript/HoloStats/tree/master) [舊版api](https://holo.poi.cat/api/v3/streams_report?ids=skSmTEnAyGk&metrics=youtube_stream_viewer&start_at=0&end_at=0) [新版api](https://holo.poi.cat/api/v3/streams_report?ids=77OTDrqhN80&metrics=youtube_stream_viewer&start_at=0&end_at=0) [req測試](https://reqbin.com/)
- [ ] 測試[彩虹官網](https://niji-mado.web.app/home)的支援度，[彩虹的開台統計](https://2434analytics.com/rank/dailyView.html)

#### CSS 
- [ ] 確認插件在各網站的排版都正常且一樣