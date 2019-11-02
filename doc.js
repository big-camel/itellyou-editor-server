const Socket = require('./socket')

class Doc {

    constructor( id , connection , callback ){
        this.id = id.toString()
        this.members = []
        this.sockets = []
        this.indexCount = 0
        this.create(connection , callback)
    }
    
    create(connection,callback){
        callback = callback || function(){}
        const doc = connection.get('itellyou', this.id)
        doc.fetch(function(err) {
            if (err) throw err
            if (doc.type === null) {
                doc.create({content: ''}, callback)
                return
            }
            callback()
        })
        return doc
    }

    getMembers(){
        return this.members
    }

    getSockets(){
        return this.sockets
    }

    addSocket( token , connection , user , callback , closeBack){
        this.indexCount++
        const socket = new Socket( token , connection )
    
        socket.on("close",() => {
            const socketIndex = this.sockets.findIndex(socket => socket.token === token)
            if(socketIndex > -1){
                this.sockets.splice(socketIndex,1)
            }

            const memberIndex = this.members.findIndex(member => member.uuid === user.uuid)
            if(memberIndex > -1){
                const levaeMember = this.members[memberIndex]
                this.members.splice(memberIndex,1)
                this.sockets.forEach(socket => {
                    socket.sendMessage("leave" , levaeMember)
                })
            }
            if(closeBack && this.sockets.length === 0){
                closeBack(this.id)
            }
        })

        socket.on("message",message => {
            const data = JSON.parse(message)
            if(data.action){
                console.log("on message:",data)
            }
        })
        user.iid = this.indexCount
        this.sockets.forEach(socket => {
            socket.sendMessage("join" , user)
        })
       
        this.members.push(user)
        this.sockets.push(socket)

        socket.sendMessage("members",this.members)

        socket.sendMessage("ready" , user , callback)
    }
}

module.exports = Doc