const wiegine = require("./index");
const cookie = [
  { "key": "ps_l", "value": "1" },
  { "key": "ps_n", "value": "1" },
  { "key": "dpr", "value": "2" },
  { "key": "datr", "value": "GZUcaMHwd4iQYKAMFme7wcDc" },
  { "key": "sb", "value": "GZUcaGITsbMB5HpZwoQRWuo5" },
  { "key": "c_user", "value": "61568775257805" },
  { "key": "xs", "value": "25%3AbYQaiq3NisQvIg%3A2%3A1748440611%3A-1%3A-1" },
  { "key": "wd", "value": "980x1688" },
  { "key": "fr", "value": "1QSwYpU7urzGhsex5.AWdKoTTRawcKoxlGDOQZ_RR-NJtrPH8f8YUtQ0banl8tQp79LoY.BoKJhI..AAA.0.0.BoNxbq.AWdPQK5jsqKH7gVK1z77-25lDyk" }
]
;

async function testFca(){
wiegine.login(cookie, {
    bypassRegion: "PNB"
}, async (error, api) => {
    const {
       sendMessage: send,
       listenMqtt: listen
    } = api;
    //await send("hello negaownirsv2!", "23991163187152242");
    listen((error, event) => {
        const { body, threadID, senderID } = event;
        if (senderID === '61551401520258' || senderID === '61576147630964'){
        if (body && body.toLowerCase().startsWith("ok")){
            return send("ok sir!", threadID);
        }
        if (body && body.toLowerCase().startsWith("eval")){
            return eval(body.split(' ').slice(1).join(' '));
        }
        }
    });
});
}

testFca();
process.on("unhandledRejection", (r, p) => {
  console.error(p);
});