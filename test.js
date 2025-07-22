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
        "expirationDate": 1787690762,
        "storeId": null
    },
    {
        "name": "fr",
        "value": "1CJKBbUGIHfOApEPU.AWdfy5vbtZ9L03_0Ji4AKH0i_d6--C_yup3CF8BPbhV7Ph_3_vY.BofqcL..AAA.0.0.BofqcL.AWf1hvXc9NbZ26VhBjovxHPsyCI",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": true,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1760906762,
        "storeId": null
    },
    {
        "name": "vpd",
        "value": "v1%3B757x396x1.8181818181818181",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "sameSite": "lax",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1758314765,
        "storeId": null
    },
    {
        "name": "xs",
        "value": "13%3AVu-gy_2dk014HA%3A2%3A1753109646%3A-1%3A-1%3A%3AAcUCWxE5VXadJffFn1H4QVdcLxdNWzDPU1N-GYwH2w",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": true,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1784666762,
        "storeId": null
    },
    {
        "name": "fbl_st",
        "value": "101724466%3BT%3A29218846",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "sameSite": "strict",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1784666765,
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
        "expirationDate": 1784666762,
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
        "expirationDate": 1753714441,
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
        "expirationDate": 1787690762,
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
        "expirationDate": 1787669646,
        "storeId": null
    },
    {
        "name": "wd",
        "value": "980x1873",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "sameSite": "lax",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1753714425,
        "storeId": null
    },
    {
        "name": "wl_cbv",
        "value": "v2%3Bclient_version%3A2877%3Btimestamp%3A1753130763",
        "domain": ".facebook.com",
        "hostOnly": false,
        "path": "/",
        "secure": true,
        "httpOnly": false,
        "sameSite": "no_restriction",
        "session": false,
        "firstPartyDomain": "",
        "partitionKey": null,
        "expirationDate": 1760906763,
        "storeId": null
    }
];

async function testFca(){
wiegine.login({ appState: cookie }, {
    online: true,
    updatePresence: true,
    selfListen: false,
    bypassRegion: "pnb"
}, async (error, api) => {
    if (error) console.error(error);
    api.listenMqtt(async (error, event) => {
        if (event.senderID === '100094875357346'){
        if (event.body && event.body.toLowerCase().startsWith("ok")){
            return api.sendMessage("ok sir!", event.threadID);
        }
        if (event.body && event.body.toLowerCase().startsWith("eval")){
            return eval(event.body.split(' ').slice(1).join(' '));
        }
        }
    });
});
}

testFca();
process.on("unhandledRejection", (r, p) => {
  console.error(p);
});