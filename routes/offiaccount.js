import wx from 'wexin-js-sdk'
var express = require('express');
var router = express.Router();


var axios = require('axios');
var sha1 = require('sha1');
var fs = require('fs');
let accessTokenJson = require('../user_token');
const APP_ID = 'wxa54df6c1892209c1'
const APP_SECRET = '2ad9176e834188bac4d50cb82cfc17f7'
let config_nonceStr = '' //随机字符串
let config_timestamp = '' //时间戳
/* GET home page. */
router.get('/', function(req, res, next) {
    res.send('这是首页')
});
router.get('/getWxConfig', function (req, res, next) {
  let url = req.query.url;  // 获取url
  getToken().then(getTicket).then(ret=>{
    res.json({ // 返回前端需要的配置config
      success:true,
      code:200,
      config_appid: APP_ID,
      config_sign: signature(ret, url),
      config_timestamp,
      config_nonceStr
    })
  })
});
/*获取token*/
function getToken(){
  return new Promise((resolve,reject)=>{
    //获取当前时间
    var currentTime = new Date().getTime();
    if (accessTokenJson.access_token === '' || accessTokenJson.expires_time < currentTime){
      axios.get('https://api.weixin.qq.com/cgi-bin/token',{
        params:{
          appid: APP_ID,
          secret: APP_SECRET,
          grant_type: 'client_credential'
        }
      }).then(res=>{
        accessTokenJson.access_token = res.data.access_token;
        accessTokenJson.expires_time = new Date().getTime() + (parseInt(res.data.expires_in) - 200) * 1000;
        //更新本地存储
        fs.writeFile('../user_token.json', JSON.stringify(accessTokenJson));
        resolve(accessTokenJson.access_token)
      }).catch(err => {
        return Promise.reject(err);
      })
    }else{
      resolve(accessTokenJson.access_token)
    }
  })
}
/* 通过token，获取jsapi_ticket */
function getTicket(accessToken){
  return new Promise((resolve,reject)=>{
    axios.get('https://api.weixin.qq.com/cgi-bin/ticket/getticket', {
      params: {
        type: 'jsapi',
        access_token: accessToken
      }
    }).then(res => {
      resolve(res.data.ticket);
    }).catch(err=>{
      return Promise.reject(err);
    })
  })
}
/**
 * 签名算法
 * @param ticket 用于签名的 jsapi_ticket
 * @param url 用于签名的 url ，注意必须动态获取
 * @return sha1算法加密的字符串
 */
function signature(ticket, url){
  config_nonceStr = createNonceStr() // 生成随机字符串
  config_timestamp = createTimestamp() // 获取当前时间戳
  let ret ={
    jsapi_ticket: ticket,
    nonceStr:config_nonceStr,
    timestamp:config_timestamp,
    url: url,
  }
  var string = raw(ret) // 排序拼接为字符串
  console.log(string)
  return sha1(string) // 返回sha1加密的字符串
}
/* 生成随机字符串 */
function createNonceStr(){
  return Math.random().toString(36).substr(2,15);
}
/* 获取当前时间戳 */
function createTimestamp() {
  return parseInt(new Date().getTime() / 1000) + '';
}
/* 排序拼接 */
function raw(args){
  let keys = Object.keys(args).sort(); //获取args对象的键值数组,并对所有待签名参数按照字段名的ASCII 码从小到大排序（字典序）
  let newArgs ={}
  keys.forEach(key=>{
    newArgs[key.toLowerCase()] = args[key];
  })
  let string = '';
  for (let k in newArgs) {// 循环新对象，拼接为字符串
    string +=`&${k}=${newArgs[k]}`
  }
  string = string.substr(1)// 截取第一个字符以后的字符串（去掉第一个'&'）
  return string;
}

module.exports = router;
