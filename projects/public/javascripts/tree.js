var FRUITS_POS_TBL = [
    { "x": 50, "y": 100 }, { "x": 130, "y": 100 }, { "x": 210, "y": 100 }, { "x": 290, "y": 100 },
    { "x": 90, "y": 150 }, { "x": 170, "y": 150 }, { "x": 250, "y": 150 },
    { "x": 130, "y": 200 }, { "x": 210, "y": 200 },
    { "x": 170, "y": 250 },
];

var treeSprites = {};
var treeLabels = {};
var treeDate = new Date();

window.onload = function() {
    cc.game.onStart = function() {
        cc.director.setDisplayStats(false); //debug info
        //load resources
        setLoaderImage(cc);
        var resources = [
            "images/jyumoku_base.png",
            "images/fruits.png",
            "images/bg.png",
            "images/sun.png",
            "images/moon.png",
            "images/bg_hatake.png",
            "images/jouro.png"
        ];
        cc.LoaderScene.preload(resources, function() {
            var MyScene = cc.Scene.extend({
                onEnter: function() {
                    this._super();
                    //sprites
                    this.addChild(cc.Node.create());
                    treeSprites["bg"] = cc.Sprite.create("images/bg.png");
                    this.addChild(treeSprites["bg"], 0);
                    treeSprites["sun"] = cc.Sprite.create("images/sun.png");
                    this.addChild(treeSprites["sun"], 0);
                    treeSprites["moon"] = cc.Sprite.create("images/moon.png");
                    this.addChild(treeSprites["moon"], 0);

                    treeSprites["bg_hatake"] = cc.Sprite.create("images/bg_hatake.png");
                    this.addChild(treeSprites["bg_hatake"], 0);
                    treeSprites["tree"] = cc.Sprite.create("images/jyumoku_base.png");
                    this.addChild(treeSprites["tree"], 0);
                    for (var i = 0; i < FRUITS_POS_TBL.length; i++) {
                        treeSprites["fruits" + i] = cc.Sprite.create("images/fruits.png");
                        this.addChild(treeSprites["fruits" + i], 0);
                    }
                    treeSprites["totalLogo"] = cc.Sprite.create("images/fruits.png");
                    this.addChild(treeSprites["totalLogo"], 0);
                    treeSprites["jouro"] = cc.Sprite.create("images/jouro.png");
                    this.addChild(treeSprites["jouro"], 0);

                    //labels
                    treeLabels["levelNow"] = new cc.LabelTTF(vueApp.levelNow, "Arial", 32);
                    this.addChild(treeLabels["levelNow"], 0);
                    treeLabels["levelTotal"] = new cc.LabelTTF(vueApp.levelTotal, "Arial", 32);
                    this.addChild(treeLabels["levelTotal"], 0);

                    //初期描画
                    updateScene();
                }
            });
            cc.director.runScene(new MyScene());
            setInterval(function() {
                treeDate = new Date();
                updateScene();
            }, 1000);
        }, this);
    };
    cc.game.run("gameCanvas");
}

function updateScene() {
    var _secondsInInterval = (treeDate.getMinutes() * 60) + treeDate.getSeconds();
    updateSun(treeSprites["sun"], _secondsInInterval);
    updateMoon(treeSprites["moon"], _secondsInInterval);
    updateSky(treeSprites["bg"], _secondsInInterval);
    var size = cc.director.getWinSize();
    updateBg(treeSprites["bg_hatake"]);

    var _treeX = size.width / 2;
    var _treeY = 200;
    updateTreeBase(treeSprites["tree"], _treeX, _treeY);
    var _levelNow = vueApp.levelNow;
    if (isNaN(_levelNow)) {
        _levelNow = 0;
    }
    var _targetFruits = Math.floor(_levelNow / 10);
    var _targetFruitsMod = _levelNow % 10;
    var _offsetX = 130;
    var _offsetY = 80;
    var _opacity = 255;
    var _opacityStart = 20;
    var _prio = 0;
    for (var i = 0; i < FRUITS_POS_TBL.length; i++) {
        if (i >= _targetFruits) {
            _opacity = _opacityStart;
            if (i == _targetFruits) {
                _opacity = _targetFruitsMod * 10 + _opacityStart;
                _prio = 1;
            }
        } else {
            _prio = 1;
        }
        updateFruits(treeSprites["fruits" + i],
            FRUITS_POS_TBL[i].x + _offsetX,
            FRUITS_POS_TBL[i].y + _offsetY,
            _opacity,
            _prio);
    }

    updateStr(treeLabels["levelNow"], _levelNow, size.width / 2, 80);

    var _totalX = 530;
    var _totalY = 80;
    updateTotalNemLogo(treeSprites["totalLogo"], _totalX, _totalY);
    updateStr(treeLabels["levelTotal"], vueApp.levelTotal, _totalX, _totalY);

    updateJouro(treeSprites["jouro"]);
}


var hourColorTbl = [{
        "name": "morning",
        "begin": { "seconds": 0, "color": [192, 235, 243] },
        "end": { "seconds": 15 * 60, "color": [105, 183, 220] }
    }, //朝
    {
        "name": "noon",
        "begin": { "seconds": 15 * 60, "color": [105, 183, 220] },
        "end": { "seconds": 45 * 60, "color": [220, 136, 68] }
    }, //昼
    {
        "name": "evening",
        "begin": { "seconds": 45 * 60, "color": [220, 136, 68] },
        "end": { "seconds": 55 * 60, "color": [13, 27, 75] }
    }, //夕
    {
        "name": "night",
        "begin": { "seconds": 55 * 60, "color": [13, 27, 75] },
        "end": { "seconds": 60 * 60, "color": [192, 235, 243] }
    }, //晩
];

function isInHourTbl(aTbl, aSecondsInInterval) {
    if ((aTbl.begin.seconds <= aSecondsInInterval) && (aTbl.end.seconds > aSecondsInInterval)) {
        return true;
    }
    return false;
}

function getHourTbl(aTbls, aName) {
    for (var i = 0; i < hourColorTbl.length; i++) {
        var _tbl = hourColorTbl[i];
        if (_tbl.name == aName) {
            return _tbl;
        }
    }
    return undefined;
}

function updateSun(aSprite, aSecondsInInterval) {
    var _morningTbl = getHourTbl(hourColorTbl, "morning");
    var _eveningTbl = getHourTbl(hourColorTbl, "evening");
    for (var i = 0; i < hourColorTbl.length; i++) {
        var _tbl = hourColorTbl[i];
        if (isInHourTbl(_tbl, aSecondsInInterval)) {
            if (_tbl.name != "night") {
                aSprite.setPosition(cc.director.getWinSize().width / 2, 100);
                var _rate = ((aSecondsInInterval - _morningTbl.begin.seconds) / (_eveningTbl.end.seconds - _morningTbl.begin.seconds));
                var _rotate = 180 * _rate;
                aSprite.setRotation(_rotate);
                // console.log("sun_rotate:" + _rotate);
                aSprite.visible = true;
            } else {
                aSprite.visible = false;
            }
        }
    }
}

function updateMoon(aSprite, aSecondsInInterval) {
    var _nightTbl = getHourTbl(hourColorTbl, "night");
    for (var i = 0; i < hourColorTbl.length; i++) {
        var _tbl = hourColorTbl[i];
        if (isInHourTbl(_tbl, aSecondsInInterval)) {
            if (_tbl.name == "night") {
                aSprite.setPosition(cc.director.getWinSize().width / 2, 100);
                var _rate = ((aSecondsInInterval - _nightTbl.begin.seconds) / (_nightTbl.end.seconds - _nightTbl.begin.seconds));
                var _rotate = 180 * _rate;
                aSprite.setRotation(_rotate);
                // console.log("moon_rotate:" + _rotate);
                aSprite.visible = true;
            } else {
                aSprite.visible = false;
            }
        }
    }
}

function updateSky(aSprite, aSecondsInInterval) {
    var size = cc.director.getWinSize();
    // console.log("aSprite");
    // console.log(aSprite);
    aSprite.setPosition(size.width / 2, size.height / 2);
    aSprite.setScale(600);
    var _color = [0, 0, 0];
    for (var i = 0; i < hourColorTbl.length; i++) {
        var _tbl = hourColorTbl[i];
        // console.log("[" + i + "]" + _tbl);
        if (isInHourTbl(_tbl, aSecondsInInterval)) {
            var _interval = _tbl.end.seconds - _tbl.begin.seconds;
            var _rate = (aSecondsInInterval - _tbl.begin.seconds) / _interval;
            for (var _ci = 0; _ci < _color.length; _ci++) {
                _color[_ci] = (_tbl.begin.color[_ci] * (1.0 - _rate)) + (_tbl.end.color[_ci] * (_rate));
            }
            break;
        }
    }
    // console.log("aSecondsInInterval:" + aSecondsInInterval);
    // console.log("color");
    // console.log(_color);
    aSprite.setColor(cc.color(_color[0], _color[1], _color[2]));
}

function updateBg(aSprite) {
    var size = cc.director.getWinSize();
    aSprite.setPosition(size.width / 2, 100);
}

function updateTreeBase(aSprite, aX, aY) {
    aSprite.setPosition(aX, aY);
    aSprite.setScale(1.0);
}

function updateFruits(aSprite, aX, aY, aOpacity, aPrio) {
    aSprite.setPosition(aX, aY);
    aSprite.setScale(1.0);
    aSprite.setOpacity(aOpacity);
    aSprite.setGlobalZOrder(aPrio);
}

function updateTotalNemLogo(aSprite, aX, aY) {
    aSprite.setPosition(aX, aY);
    aSprite.setScale(1.5);
}

function updateStr(aLabel, aStr, aX, aY) {
    aLabel.setString("" + aStr);
    aLabel.x = aX;
    aLabel.y = aY;
    aLabel.setColor(cc.color(255, 255, 255, 255));
}

var _jouroOpacity = 0;

function startJouro() {
    _jouroOpacity = 255;
}

function updateJouro(aSprite) {
    _jouroOpacity -= 20;
    if (_jouroOpacity < 0) {
        _jouroOpacity = 0;
    }
    // console.log("updateJouro");
    // console.log("_jouroOpacity:" + _jouroOpacity);
    aSprite.setOpacity(_jouroOpacity);
    aSprite.setPosition(400, 100);
    aSprite.setScale(0.2);
}