const http = require('http');
const express = require('express')
const proxy = require('http-proxy-middleware')
const WebSocket = require('ws')
const bodyParser = require('body-parser')
const Client = require('./client')


startServer()

function startServer() {
    // Create a web server to serve files and listen to WebSocket connections
    const app = express()
    app.use("/api",proxy({
        target:"http://localhost:8000",
        changeOrigoin:true
    }))
    app.use(bodyParser.json({limit: '10mb'}))

    const server = http.createServer(app)

    const client = new Client()
    // Connect any incoming WebSocket connection to ShareDB
    const webSocketServer = new WebSocket.Server({server: server});
    webSocketServer.on('connection', (connection,request) => {
        client.addDoc(connection,request)
    })

    server.listen(8080)
    console.log('Listening on http://localhost:8080');
}