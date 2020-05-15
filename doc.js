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
        console.log(this.id)
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

    addSocket( token , connection , member , callback , closeBack){
        this.indexCount++
        const socket = new Socket( token , member , connection )
    
        socket.on("close",() => {
            const socketIndex = this.sockets.findIndex(socket => socket.token === token)
            if(socketIndex > -1){
                this.sockets.splice(socketIndex,1)
            }

            const memberIndex = this.members.findIndex(m => m.uuid === member.uuid)
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
            if(data.action === "broadcast"){
                this.sockets.forEach(socket => {
                    socket.sendMessage("broadcast" , data.data)
                })
            }
        })
        member.iid = this.indexCount
        this.sockets.forEach(socket => {
            socket.sendMessage("join" , member)
        })
       
        this.members.push(member)
        this.sockets.push(socket)

        socket.sendMessage("members",this.members)

        socket.sendMessage("ready" , member , callback)
    }
}

module.exports = Doc