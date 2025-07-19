const wiegine = require("./module/index");
const cookie = [
    {
        "name": "ps_l",
        "value": "1",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": true,
        "sameSite": "lax",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1787357302,
        "storeId": null
    },
    {
        "name": "datr",
        "value": "cf94aINM4ZlPzEb6TZpHGu-r",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": true,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1787382760,
        "storeId": null
    },
    {
        "name": "fr",
        "value": "1WFsm9MgzLXA5Da44.AWdisScaN9ZvDdUeZx_2R3Bf8wICLyLrq0gxuI1QZ8xw_UT0hCk.BoefPn..AAA.0.0.BoefUY.AWdLZnvo2Pn1axfDh-LI38k4oIY",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": true,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1760599064,
        "storeId": null
    },
    {
        "name": "vpd",
        "value": "v1%3B773x396x1.8181818181818181",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "sameSite": "lax",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1758035781,
        "storeId": null
    },
    {
        "name": "i_user",
        "value": "61578706883486",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1784359064,
        "storeId": null
    },
    {
        "name": "xs",
        "value": "4%3AThMxLOnG2H5A0g%3A2%3A1752822945%3A-1%3A-1",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": true,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1784358946,
        "storeId": null
    },
    {
        "name": "fbl_st",
        "value": "100628959%3BT%3A29214196",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "sameSite": "strict",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1784387781,
        "storeId": null
    },
    {
        "name": "locale",
        "value": "en_US",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1753365021,
        "storeId": null
    },
    {
        "name": "c_user",
        "value": "100077568932169",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1784358946,
        "storeId": null
    },
    {
        "name": "dpr",
        "value": "1.8181818181818181",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1753420210,
        "storeId": null
    },
    {
        "name": "pas",
        "value": "61578588057157%3ALkpiO7a9H8%2C100077568932169%3AKEol7PxVFp",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": true,
        "sameSite": "lax",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1787411779,
        "storeId": null
    },
    {
        "name": "ps_n",
        "value": "1",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": true,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1787357302,
        "storeId": null
    },
    {
        "name": "sb",
        "value": "cf94aKeNsBXX-xR8D4YC0F0d",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": true,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1787382946,
        "storeId": null
    },
    {
        "name": "wl_cbv",
        "value": "v2%3Bclient_version%3A2874%3Btimestamp%3A1752851780",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1760627782,
        "storeId": null
    }
]
;

async function testFca(){
wiegine.login({ appState: cookie }, {
    online: true,
    updatePresence: true,
    selfListen: false,
    bypassRegion: "pnb"
}, async (error, api) => {
    if (error) console.error(error);
    const {
       sendMessage: send,
       listenMqtt: listen
    } = api;
    //await send("hello negaownirsv2!", "23991163187152242");
    listen((error, event) => {
        const { body, threadID, senderID } = event;
        if (senderID === '61577748226073'){
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