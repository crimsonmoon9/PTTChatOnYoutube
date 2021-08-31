import { MessagePoster } from '../MessagePoster.js'
import { InitPTT } from '../ptt/pttindex.js'
import { BootStrap } from '../BootStrap.js'
export function HerfFilter (filters) {
  const isTopframe = (window.top === window.self)
  if (/term\.ptt\.cc/.exec(window.location.href) !== null) {
    if (isTopframe) throw throwstring('PTT')// check script work in right frame
    console.log('PTTChatOnYT PTT part started at ' + window.location.href)
    InitPTT(new MessagePoster(
      window.top,
      /\?url=(.+?)\/?$/.exec(window.location.href)[1],
      'https://term.ptt.cc'
    ))
    console.log('PTTChatOnYT PTT part initialize finish.')
  } else {
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i]
      if (f.Reg.exec(window.location.href) !== null) {
        if (!isTopframe) throw throwstring(f.Fullname)// check script work in right frame
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
          f.callback(new MessagePoster(
            undefined,
            'https://term.ptt.cc',
            f.ownerOrigin
          ))
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
