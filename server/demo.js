const WebSocket = require('ws')
const http = require('http')

const server = http.createServer()
const wss = new WebSocket.Server({ noServer: true })

// 鉴权
const jwt = require('jsonwebtoken')

let num = 0

// 心跳检测
const timeInterval = 30000

// 多人聊天室
// roomid => 对应相同的rootid才会去进行广播消息
let group = {}

wss.on('connection', function connection(ws) {
  console.log('a client is connected')
  // 初始的心跳状态
  ws.isAlive = true
  // 接收客户端的消息
  ws.on('message', function message(msg) {
    const msgObj = JSON.parse(msg)

    // 鉴权
    if (msgObj.event === 'auth') {
      console.log('server' + '鉴权')
      jwt.verify(msgObj.message, 'secret', function(err, decoded) {
        if (err) {
          // websocket返回前台鉴权失败消息
          console.log('server: ' + '鉴权失败')
          ws.send(JSON.stringify({
            event: 'noauth',
            message: 'please auth again',
          }))
          console.log('auth err')
          return 
        } else {
          console.log('server' + '鉴权成功')
          ws.isAuth = true
          return
        }
      })
      return
    }

    // 拦截非鉴权的请求
    if (!ws.isAuth) {
      return
    }

    // 统计在线人数
    if (msgObj.event === 'enter') {
      console.log('server' + '用户进入聊天室')
      ws.name = msgObj.message
      ws.roomid = msgObj.roomid
      if (typeof group[ws.roomid] === 'undefined') {
        group[ws.roomid] = 1
      } else {
        console.log('ogigin' + group[ws.roomid])
        group[ws.roomid]++
      }
    }

    // 心跳检测
    if (msgObj.event === 'heartbeat' && msgObj.message === 'pong') {
      ws.isAlive = true
      return
    }

    // 主动发消息给客户端
    // 消息广播
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && ws.roomid === client.roomid) {
        msgObj.name = ws.name
        msgObj.num = group[ws.roomid]
        client.send(JSON.stringify(msgObj))
      }
    })
  })

  // 当ws客户端断开连接的时候
  ws.on('close', function close() {
    if (ws.name) {
      group[ws.roomid] --
    }
    let msgObj = {}
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && ws.roomid === client.roomid) {
        msgObj.name = ws.name
        msgObj.num = group[ws.roomid]
        msgObj.event = 'out'
        client.send(JSON.stringify(msgObj))
      }
    })
  })
})


// 鉴权操作
server.on('upgrade', function upgrade(request, socket, head) {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request)
    })
})
 
server.listen(3000)

setInterval(() => {
  // 主动发送心跳检测
  // 当客户端a返回了消息之后， 主动设置flag 为在线
  wss.clients.forEach(ws => {
    if (!ws.isAlive && ws.roomid) {
      group[ws.roomid] --
      delete ws['roomid']
      return ws.terminate()
    }
    ws.isAlive = false
    console.log('sercer num:' + group[ws.roomid])
    ws.send(JSON.stringify({
      event: 'heartbeat',
      message: 'ping',
      num: group[ws.roomid] 
    }))
  })
}, timeInterval)
