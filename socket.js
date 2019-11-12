class Socket {
    constructor( token , member , connection ) {
        if(!connection)
            throw "需要一个WebSocket连接"
        this.token = token
        this.member = member
        this.connection = connection
    }

    on(event , listener){
        this.connection.on(event,listener)
    }

    off(event , listener){
        this.connection.off(event,listener)
    }

    sendMessage( action, data , callback ){
        callback = callback || function(){}
        this.connection.send(JSON.stringify({
            action,
            data
        }),callback)
    }
}

module.exports = Socket