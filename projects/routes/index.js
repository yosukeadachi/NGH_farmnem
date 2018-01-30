var express = require('express');
var router = express.Router();


/* GET dashboard listing. */
router.get('/:pubkey?', function(req, res, next) {
    res.render('index.ejs', { publickey: req.params.pubkey });
});

module.exports = router;


//-------------------------
// NEM-SDK
function fmnConnectNis() {

    var nem = require("./NEM-sdk/build/index.js").default;
    var NODES = Array("http://104.128.226.60");
    var networkId = nem.model.network.data.testnet.id;

    var MGR_ADDRESS = "TDKUOYO2VJQAV73MTQEQOFCNA45FRKLDJCYSBVWG"; //gameManager
    var MGR_PUBKEY = "8873f6ebf29edb035de35d23cde2e36e908764f5d39c63f79820188f2073b8ba"; //gameManager
    var MGR_PRIVATEKEY = "@MGRPRIVATEKEY@"; //gameManager

    var FMN_NS = "farmnem"; //namespaceId
    var FMN_NS_LV = "level"; //level mosaic



    function getEndpointUrl(aNODES) {
        return aNODES[Math.floor(Math.random() * aNODES.length)];
    }

    var endpoint = nem.model.objects.create("endpoint")(getEndpointUrl(NODES), nem.model.nodes.defaultPort);

    var endpointWebsocket = nem.model.objects.create("endpoint")(getEndpointUrl(NODES), nem.model.nodes.websocketPort);
    var connector = nem.com.websockets.connector.create(endpointWebsocket, MGR_ADDRESS);
    console.log("fmnConnectNis check1");
    connector.connect().then(function() {
        console.log("fmnConnectNis check2");
        nem.com.websockets.subscribe.account.transactions.confirmed(connector, function(res) {
            console.log("confirmed");
            // console.log(res);
            //送り主がMGR意外か?
            //受け取りがMGR_ADDRESSか？
            //1xem以上あるか？
            if ((res.transaction.signer != MGR_PUBKEY) &&
                (res.transaction.recipient == MGR_ADDRESS) &&
                (res.transaction.amount >= 1000000)) {
                //growthメッセージとlevelモザイクを送信
                var nemTxCommon = nem.model.objects.create("common")("", MGR_PRIVATEKEY);
                var _lotAdd = lotLevel();
                var _level = Math.floor(res.transaction.amount / 1000000) + _lotAdd;
                var _msg = "growth lot:" + _lotAdd;
                var _userAddress = nem.model.address.toAddress(res.transaction.signer, networkId);
                var transferTx = nem.model.objects.create("transferTransaction")(_userAddress, 1, _msg);
                var _mosaicAttachment = nem.model.objects.create("mosaicAttachment")(FMN_NS, FMN_NS_LV, _level);
                transferTx.mosaics.push(_mosaicAttachment);
                console.log("transferTx");
                console.log(transferTx);
                var mosaicDefinitionMetaDataPair = nem.model.objects.get("mosaicDefinitionMetaDataPair");
                nem.com.requests.namespace.mosaicDefinitions(endpoint, _mosaicAttachment.mosaicId.namespaceId).then(function(res) {
                        // Look for the mosaic definition(s) we want in the request response (Could use ["eur", "usd"] to return eur and usd mosaicDefinitionMetaDataPairs)
                        var neededDefinition = nem.utils.helpers.searchMosaicDefinitionArray(res.data, [FMN_NS_LV]);

                        console.log("check0");
                        // Get full name of mosaic to use as object key
                        var fullMosaicName = nem.utils.format.mosaicIdToName(_mosaicAttachment.mosaicId);

                        console.log("check1");
                        // Check if the mosaic was found
                        if (undefined === neededDefinition[fullMosaicName]) return console.error("Mosaic not found !");

                        console.log("check2");
                        // Set eur mosaic definition into mosaicDefinitionMetaDataPair
                        mosaicDefinitionMetaDataPair[fullMosaicName] = {};
                        mosaicDefinitionMetaDataPair[fullMosaicName].mosaicDefinition = neededDefinition[fullMosaicName];
                        console.log("check3");

                        // Prepare the transfer transaction object
                        var transactionEntity = nem.model.transactions.prepare("mosaicTransferTransaction")(nemTxCommon, transferTx, mosaicDefinitionMetaDataPair, networkId);
                        console.log("check4");
                        // Serialize transfer transaction and announce
                        nem.model.transactions.send(nemTxCommon, transactionEntity, endpoint).then(function(res) {
                            // If code >= 2, it's an error
                            if (res.code >= 2) {
                                console.log("send res.code > 2 error");
                                console.log(res.message);
                            } else {
                                console.log("send ok");
                                // console.log(res.message);
                            }
                        }, function(err) {
                            console.log("send error");
                            console.log(err);
                        });
                        console.log("check5");
                    },
                    function(err) {
                        console.log("mosaicDefinitions error!");
                        console.error(err);
                    });

            }
        });
        nem.com.websockets.subscribe.account.transactions.unconfirmed(connector, function(res) {
            console.log("unconfirmed");
            // console.log(res);
        });
    });
}

fmnConnectNis();

function lotLevel() {
    var lotTable = [
        { judge: 0.2, result: 0 },
        { judge: 0.2, result: 1 },
        { judge: 0.55, result: 2 },
        { judge: 0.05, result: 3 }
    ];

    var _judge = 0;
    var _target = Math.random();
    for (var i = 0; i < lotTable.length; i++) {
        if (_judge >= _target) {
            return lotTable[i].result;
        }
        _judge += lotTable[i].judge;
    }
    return lotTable[0].result;
}