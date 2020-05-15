const url = require('url')
const querystring = require("querystring")
const requestPromise = require('request-promise')
const ShareDB = require('sharedb')
const WebSocketJSONStream = require('@teamwork/websocket-json-stream')
const uuidv3 = require('uuid/v3')

const Doc = require('./doc')

class Client {
    constructor(){
        this.docs = []
        const sharedb = new ShareDB()
        this.sharedb = sharedb
        this.sharedbConnection = sharedb.connect()
    }

    getDoc(id){
        return this.docs.find(doc => doc.id === id)
    }

    getParams(request){
        return querystring.parse(url.parse(request.url).query)
    }

    verify(key,token,callback){
        return requestPromise({
            uri:`http://localhost:8082/${key}/collab`,
            method:"POST",
            json:true,
            body:{
                token
            }
        }).then(res => {
            callback(res)
        }).catch(error => {
            callback({ result : false , message : error })
        })
    }

    addDoc(conection,request){
        const params = this.getParams(request)
        const { key , token } = params
        if(!key || !token){
            conection.close()
            return
        }
        // 根据 key ，token 请求后端 api 验证客户端连接信息是否安全可靠
        this.verify(key , token , res => {
            if(!res.result){
                conection.close()
                console.error("客户端验证出错了",res.message)
                return
            }
            
            const { user } = res.data
            //设置用户信息 id , key , name , uuid 为固定参数
            const member = {
                id:user.id,
                key:user.login || user.mobile || user.email || user.id,
                name:user.name,
                avatar:user.avatar,
                path:user.path,
                uuid:uuidv3(key.concat("/" + user.id),uuidv3.URL)
            }

            let doc = this.getDoc(key)
            if(!doc){
                doc = new Doc(key , this.sharedbConnection)
                this.docs.push(doc)
            }else{
                // 关闭此用户此文档之前未关闭的链接
                doc.sockets.forEach(socket => {
                    if(socket.member.id === member.id){
                        socket.connection.close()
                    }
                });
            }
            
            doc.addSocket( token , conection , member , () => {
                // 建立协作 socket 连接
                const stream = new WebSocketJSONStream(conection)
                // 监听消息
                this.sharedb.listen(stream)
            } , doc_id => {
                // 没有编辑用户了，移除文档
                const docIndex = this.docs.findIndex(d => d.id === doc_id)
                if(docIndex > -1){
                    this.docs.splice(docIndex,1)
                }
            })

            this.docs.push(doc)
        })
    }
}
module.exports = Client