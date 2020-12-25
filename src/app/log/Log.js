export let Log = {
  template: `<div class=" flex-grow-1 overflow-auto mh-100 row" id="PTTChat-contents-log-main" style="overscroll-behavior: contain;">
  <table class="table">
    <tbody class="ptttext">
      <tr>
        <th scope="row">PTT狀態</th>
        <td id="log-PTTstate">--</td>
        <td colspan="2">更多的詳細資訊請參考PTT畫面</td>
      </tr>
      <th class="text-center bg-secondary text-white" colspan="4">文章資訊</th>
      <tr>
        <th scope="row">文章標題</th>
        <td id="log-posttitle" colspan="3">--</td>
      </tr>
      <tr>
        <th scope="row">文章看板</th>
        <td id="log-postboard">--</td>
        <th scope="row">文章代碼</th>
        <td id="log-postaid">--</td>
      </tr>
      <tr>
        <th scope="row">推文數</th>
        <td id="log-postpushcount">--</td>
        <th scope="row">結尾行數</th>
        <td id="log-postendline">--</td>
      </tr>
      <tr>
        <th scope="row">發文時間</th>
        <td id="log-posttime" colspan="3">--</td>
      </tr>
      <tr>
        <th scope="row">最後推文時間</th>
        <td id="log-postlastpushtime" colspan="3">--</td>
      </tr>

      <th class="text-center bg-secondary text-white" colspan="4">詳細資訊</th>
      </tr>
      <tr>
        <th scope="row">影片類型</th>
        <td id="log-videotype">--</td>
        <th scope="row">自動獲得推文</th>
        <td id="log-isautogetpush">--</td>
      </tr>
      <tr>
        <th scope="row">主題顏色</th>
        <td id="log-themecolor">--</td>
        <th scope="row"></th>
        <td></td>
      </tr>
      <tr>
        <th scope="row">預估開台時間</th>
        <td id="log-streamstarttime" colspan="3">--</td>
      </tr>
      <tr>
        <th scope="row">影片當下時間</th>
        <td id="log-streamnowtime" colspan="3">--</td>
      </tr>
      <th class="text-center bg-secondary text-white" colspan="4">滾動狀態</th>
      </tr>

      <tr>
        <th scope="row">目標推文樓數</th>
        <td id="log-pushindex">--</td>
        <th scope="row">目標捲動高度</th>
        <td id="log-targetscroll">--</td>
      </tr>
      <tr>
        <th scope="row">現在捲動高度</th>
        <td id="log-nowscroll">--</td>
        <th scope="row">上次捲動高度</th>
        <td id="log-lastscroll">--</td>
      </tr>
      <th class="text-center bg-secondary text-white" colspan="4">近期訊息</th>
      </tr>
      <tr>
        <td id="log-alert0" colspan="4">--</td>
      </tr>
      <tr>
        <td id="log-alert1" colspan="4">--</td>
      </tr>
      <tr>
        <td id="log-alert2" colspan="4">--</td>
      </tr>
      <tr>
        <td id="log-alert3" colspan="4">--</td>
      </tr>
      <tr>
        <td id="log-alert4" colspan="4">--</td>
      </tr>
      <tr>
        <td id="log-alert5" colspan="4">--</td>
      </tr>
      <tr>
        <td id="log-alert6" colspan="4">--</td>
      </tr>
      <tr>
        <td id="log-alert7" colspan="4">--</td>
      </tr>
      <tr>
        <td id="log-alert8" colspan="4">--</td>
      </tr>
      <tr>
        <td id="log-alert9" colspan="4">--</td>
      </tr>
    </tbody>
  </table>
</div>`,
}