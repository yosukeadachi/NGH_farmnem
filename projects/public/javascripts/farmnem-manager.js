// NEM-SDK
var nem = require("nem-sdk").default;
var NEM_EPOCH = Date.UTC(2015, 2, 29, 0, 6, 25, 0);
var NODES = Array("http://104.128.226.60");
var networkId = nem.model.network.data.testnet.id;
var MGR_ADDRESS = "TDKUOYO2VJQAV73MTQEQOFCNA45FRKLDJCYSBVWG"; //gameManager
var MGR_PUBKEY = "8873f6ebf29edb035de35d23cde2e36e908764f5d39c63f79820188f2073b8ba"; //gameManager
var FMN_NS = "farmnem"; //namespaceId
var FMN_NS_LV = "level"; //level mosaic

function getEndpointUrl(aNODES) {
    return aNODES[Math.floor(Math.random() * aNODES.length)];
}

var endpoint = nem.model.objects.create("endpoint")(getEndpointUrl(NODES), nem.model.nodes.defaultPort);

//public
var fmnFecthGetLevelTotal = function(aUserPublicKey) {
    if (aUserPublicKey === undefined) {
        return;
    }
    if (!nem.utils.helpers.isPublicKeyValid(aUserPublicKey)) {
        return;
    }

    var _userAddress = nem.model.address.toAddress(aUserPublicKey, networkId);
    vueApp.address = _userAddress;
    nem.com.requests.account.mosaics.owned(endpoint, _userAddress)
        .then(function(res) {
            var _level = 0;
            for (var i = 0; i < res.data.length; i++) {
                var _mosaicId = res.data[i].mosaicId;
                if (_mosaicId.name == "level" && _mosaicId.namespaceId == "farmnem") {
                    var _quantity = res.data[i].quantity;
                    console.log("level:" + _quantity);
                    _level = _quantity;
                }
            }
            //vueAppがある前提
            vueApp.levelTotal = _level;
        });
};

function fmnIsSendUserToManagerTx(aTx, aUserPublicKey) {
    if (aTx === undefined) {
        return false;
    }
    if (aUserPublicKey === undefined) {
        return false;
    }
    if ((aTx.transaction.signer == aUserPublicKey) && (aTx.transaction.recipient == MGR_ADDRESS)) {
        return true;
    }
    return false;
}

function fmnConnectNis(aUserPublicKey) {
    if (aUserPublicKey === undefined) {
        return;
    }
    if (!nem.utils.helpers.isPublicKeyValid(aUserPublicKey)) {
        return;
    }


    var endpointWebsocket = nem.model.objects.create("endpoint")(getEndpointUrl(NODES), nem.model.nodes.websocketPort);
    var connector = nem.com.websockets.connector.create(endpointWebsocket, MGR_ADDRESS);
    console.log("fmnConnectNis check1");
    return connector.connect().then(function() {
        console.log("fmnConnectNis check2");
        nem.com.websockets.subscribe.account.transactions.confirmed(connector, function(res) {
            console.log("confirmed");
            // console.log(res);
            fmnCreateLevelRankNow(aUserPublicKey);
            fmnFecthGetLevelTotal(aUserPublicKey);
        });
        nem.com.websockets.subscribe.account.transactions.unconfirmed(connector, function(res) {
            console.log("unconfirmed");
            console.log(res);
            if (fmnIsSendUserToManagerTx(res, aUserPublicKey)) {
                startJouro();
            }
        });
    });
}

function fmnGetMosaicFmnLevel(aMosaics) {
    var _mosaics = aMosaics;
    if (_mosaics !== undefined) {
        for (var i = 0; i < _mosaics.length; i++) {
            if ((_mosaics[i].mosaicId.namespaceId == FMN_NS) && (_mosaics[i].mosaicId.name == FMN_NS_LV)) {
                // console.log(_mosaics[i]);
                return _mosaics[i];
            }
        }
    }
    return undefined;
}


function fmnTransactionAll(aFetchFunc, aPublicKey, aBeginTime, aEndTime, aHash) {
    console.log("fmnTransactionAll hash:" + aHash);
    var _address = nem.model.address.toAddress(aPublicKey, networkId);
    return nem.com.requests.account.transactions.all(endpoint, _address, aHash)
        .then(function(res) {
            console.log("fmnTransactionAll after transactions.all");
            var _isNext = true;
            for (var i = 0; i < res.data.length; i++) {
                var _data = res.data[i];
                console.log(_data);
                //範囲時間か
                if ((aBeginTime === undefined) || (aEndTime === undefined)) {
                    aFetchFunc(res.data[i], aPublicKey);
                } else {
                    if ((_data.transaction.timeStamp >= aBeginTime) &&
                        (_data.transaction.timeStamp < aEndTime)) {
                        aFetchFunc(res.data[i], aPublicKey);
                    } else {
                        _isNext = false;
                        break;
                    }
                }
            }
            if ((_isNext == true) && (res.data.length == 25)) {
                var _hash = res.data[res.data.length - 1].meta.hash.data;
                if (_hash !== undefined) {
                    // console.log("hash");
                    // console.log(_hash);
                    return fmnTransactionAll(aFetchFunc, aPublicKey, aBeginTime, aEndTime, _hash);
                }
            }
        });
}

var _levelCountListTotal = {};

function fmnLevelCountListTotal() {
    return _levelCountListTotal;
}

function fmnDataFuncRankingTotal(aTx, aPublicKey) {
    // console.log(aTx);
    //成長送信をピックアップ
    if (aTx.transaction.signer == aPublicKey) {
        var _mosaic = fmnGetMosaicFmnLevel(aTx.transaction.mosaics);
        if (_mosaic !== undefined) {
            if (fmnLevelCountListTotal()[aTx.transaction.recipient] === undefined) {
                fmnLevelCountListTotal()[aTx.transaction.recipient] = 0;
            }
            // console.log(fmnLevelCountListTotal()[aTx.transaction.recipient]);
            fmnLevelCountListTotal()[aTx.transaction.recipient] += _mosaic.quantity;
            // console.log(fmnLevelCountListTotal()[aTx.transaction.recipient]);
            // console.log(fmnLevelCountListTotal());
        }
    }
}

var _rankYear = 0;
var _rankMonth = 0;
var _rankDay = 0;
var _rankHour = 0;
var _levelCountListHour = {};

function fmnLevelCountListHour() {
    return _levelCountListHour;
}

function getNemTimeStamp(aTime) {
    return Math.floor((aTime / 1000) - (NEM_EPOCH / 1000));
}

function fmnDataFuncRankingHour(aTx, aPublicKey) {
    // console.log(aTx);
    //成長送信をピックアップ
    if (aTx.transaction.signer == aPublicKey) {
        var _mosaic = fmnGetMosaicFmnLevel(aTx.transaction.mosaics);
        if (_mosaic !== undefined) {
            //データ挿入
            if (fmnLevelCountListHour()[aTx.transaction.recipient] === undefined) {
                fmnLevelCountListHour()[aTx.transaction.recipient] = 0;
            }
            fmnLevelCountListHour()[aTx.transaction.recipient] += _mosaic.quantity;
            console.log(fmnLevelCountListHour());
        }
    }
}


function fmnCreateRankingTotal(aYear, aMonth, aDay, aHour) {
    _levelCountListTotal = [];
    return fmnTransactionAll(fmnDataFuncRankingTotal, MGR_PUBKEY)
        .then(function(res) {
            console.log("rankingTotal");
            console.log(_levelCountListTotal);
        });
}

function fmnCreateHourLevelList(aYear, aMonth, aDay, aHour) {
    _rankYear = aYear;
    _rankMonth = aMonth;
    _rankDay = aDay;
    _rankHour = aHour;
    var _targetDateBegin = new Date(_rankYear, _rankMonth, _rankDay, _rankHour, 0, 0, 0);
    var _targetTimeBegin = getNemTimeStamp(_targetDateBegin.getTime());
    var _targetTimeEnd = getNemTimeStamp(_targetDateBegin.setHours(_targetDateBegin.getHours() + 1));
    // console.log("_targetTimeStart:" + _targetTimeStart);
    // console.log("_targetTimeFinish:" + _targetTimeFinish);
    // console.log("timeStamp:" + aTx.transaction.timeStamp);

    _levelCountListHour = {};
    return fmnTransactionAll(fmnDataFuncRankingHour, MGR_PUBKEY, _targetTimeBegin, _targetTimeEnd)
        .then(function(res) {
            console.log("rankingHour");
            console.log(_levelCountListHour);
            return Promise.resolve(_levelCountListHour);
        });
}

var fmnCreateLevelRankNow = function(aUserPublicKey) {
    var _nowdt = new Date();
    fmnCreateHourLevelList(_nowdt.getFullYear(), _nowdt.getMonth(), _nowdt.getDate(), _nowdt.getHours())
        .then(function(levelList) {
            var _userAddress = nem.model.address.toAddress(aUserPublicKey, networkId);
            //vueAppがある前提
            if (aUserPublicKey != "") {
                vueApp.address = _userAddress;
            }
            if (levelList[_userAddress] !== undefined) {
                //vueAppがある前提
                vueApp.levelNow = levelList[_userAddress];

                var _seed = vueApp.publickey + vueApp.levelNow + _nowdt.getFullYear() + _nowdt.getMonth() + _nowdt.getDate() + _nowdt.getHours();
                // console.log("seed:" + _seed);
                Math.seedrandom(_seed);
                updateScene();
            }

            //ランキング作成
            var _rank = [];
            for (address in levelList) {
                _rank.push({ "address": address, "level": levelList[address] });
            }
            _rank.sort(function(a, b) {
                if (a.level < b.level) return 1;
                if (a.level > b.level) return -1;
                return 0;
            });
            vueApp.rankingNow = _rank;
            console.log(_rank);
        });
};



var farmnem_manager = {
    "connectNis": fmnConnectNis,
    "fetchLevelTotal": fmnFecthGetLevelTotal,
    "createRankingNow": fmnCreateLevelRankNow
}