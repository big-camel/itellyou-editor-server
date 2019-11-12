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

    verify(id,token,callback){
        return requestPromise({
            uri:`http://api.itellyou.com/${id}/collab`,
            method:"POST",
            json:true,
            body:{
                id,
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
        const { id , token } = params
        if(!id || !token){
            conection.close()
            return
        }
        this.verify(id , token , res => {
            if(!res.result){
                conection.close()
                console.error("客户端验证出错了",res.message)
                return
            }

            const { user } = res.data
            const member = {
                id:user.user_id,
                key:user.user_name,
                name:user.nickname,
                uuid:uuidv3(id.concat("/" + user.user_id),uuidv3.URL)
            }

            let doc = this.getDoc(id.toString())
            if(!doc){
                doc = new Doc(id , this.sharedbConnection)
                this.docs.push(doc)
            }else{
                if(doc.members.find(m => m.id === member.id)){
                    conection.close()
                    console.error(`用户${member.name}在文档${id}中已经有一个连接了`)
                    return
                }
            }
            
            doc.addSocket( token , conection , member , () => {
                const stream = new WebSocketJSONStream(conection)
                this.sharedb.listen(stream)
            } , doc_id => {
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