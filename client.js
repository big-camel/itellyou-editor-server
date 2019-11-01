const url = require('url')
const querystring = require("querystring")
const requestPromise = require('request-promise')
const ShareDB = require('sharedb')
const WebSocketJSONStream = require('@teamwork/websocket-json-stream')

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

    verify(token,callback){
        return requestPromise({
            uri:"http://localhost:8080/api/collabs",
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
        const { id , token } = params
        if(!id || !token){
            conection.close()
            return
        }
        this.verify(token , res => {
            if(!res.result){
                conection.close()
                console.error("客户端验证出错了",res.message)
                return
            }
            let doc = this.getDoc(id.toString())
            if(!doc){
                doc = new Doc(id , this.sharedbConnection)
                this.docs.push(doc)
            }

            doc.addSocket( token , conection , res.data.user , () => {
                const stream = new WebSocketJSONStream(conection)
                this.sharedb.listen(stream)
            } , () => {
                const docIndex = this.docs.findIndex(d => d.id === doc.id)
                if(docIndex > -1){
                    this.docs.splice(docIndex,1)
                }
            })

            this.docs.push(doc)
        })
    }
}
module.exports = Client