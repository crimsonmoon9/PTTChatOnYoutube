export let ChatTimeSetting = {
  template: `<div id="PTTChat-Time" class="ptt-text ptt-bg p-2 position-absolute w-100 d-none" style="z-index:400;">
  <div id="PTTChat-Time-Setting">
    <form class="form-inline">
      <label for="dis" class="w-100">實況重播時間微調</label>
      <div class="d-flex justify-content-between w-100">
        <button id="minus-min" class="btn ptt-btnoutline" type="button">-1分鐘</button>
        <button id="minus-sec" class="btn ptt-btnoutline" type="button">-15秒</button>
        <button id="add-sec" class="btn ptt-btnoutline" type="button">+15秒</button>
        <button id="add-min" class="btn ptt-btnoutline" type="button">+1分鐘</button>
      </div>
    </form>
  </div>
</div>
`,
}