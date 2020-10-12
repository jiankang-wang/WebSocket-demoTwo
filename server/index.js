const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 3000 })

let num = 0

wss.on('connection', function connection(ws) {
  console.log('a client is connected')
  // 接收客户端的消息
  ws.on('message', function message(msg) {
    const msgObj = JSON.parse(msg)
    // 统计在线人数
    if (msgObj.event === 'enter') {
      ws.name = msgObj.message
      num ++
    }
    // 主动发消息给客户端
    // 消息广播
    wss.clients.forEach(client => {
      // if (ws !== client && client.readyState === WebSocket.OPEN) {
      //   msgObj.name = ws.name
      //   msgObj.num = wss.clients.size
      //   client.send(JSON.stringify(msgObj))
      // }
      if (client.readyState === WebSocket.OPEN) {
        msgObj.name = ws.name
        msgObj.num = num
        client.send(JSON.stringify(msgObj))
      }
    })
  })

  // 当ws客户端断开连接的时候
  ws.on('close', function close() {
    if (ws.name) {
      num --
    }
    let msgObj = {}
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        msgObj.name = ws.name
        msgObj.num = num
        msgObj.event = 'out'
        client.send(JSON.stringify(msgObj))
      }
    })
  })
})
