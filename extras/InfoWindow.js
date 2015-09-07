
define([
    "dojo/Evented",
    "dojo/parser",
    "dojo/on",
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/dom-style",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/fx/Toggler",
    "dojo/fx",
    "dojo/Deferred",
    "esri/domUtils",
    "esri/InfoWindowBase"
],
function (
    Evented,
    parser,
    on,
    declare,
    domConstruct,
    array,
    domStyle,
    lang,
    domClass,
    Toggler,
    coreFx,
    Deferred,
    domUtils,
    InfoWindowBase
) {
    return declare([InfoWindowBase, Evented], {

        isContentShowing: false,
        initMapCenter: null,
        initScreenCenter: null,
        showMapPoint: null,
        showScreenPoint: null,
        constructor: function (parameters) {
            lang.mixin(this, parameters);
            domClass.add(this.domNode, "myInfoWindow");
            this._closeButton = domConstruct.create("div", { "class": "close", "title": "Close" }, this.domNode);
            this._title = domConstruct.create("div", { "class": "title" }, this.domNode);
            this._content = content = domConstruct.create("div", { "class": "content" }, this.domNode);
            // this._toggleButton = domConstruct.create("div",{"class": "toggleOpen", "title": "Toggle"}, this.domNode);
            this._arrow = domConstruct.create("div", { "class": "arrow", "title": "Arrow" }, this.domNode);

            on(this._closeButton, "click", lang.hitch(this, function () {
                //hide the content when the info window is toggled close.
                this.hide();

            }));
            //hide initial display 
            domUtils.hide(this.domNode);
            this.isShowing = false;

        },

        setMap: function (map) {
            this.inherited(arguments);
            // map.on("zoom-start", //this, this.hide);
            map.on("pan", lang.hitch(this, function (pan) {
                var movePoint = pan.delta;
                if (this.isShowing) {
                    if (showScreenPoint != null) {
                        this._showInfoWindow(showScreenPoint.x + movePoint.x, showScreenPoint.y + movePoint.y);
                    }
                }
            }));
            map.on("pan-end", lang.hitch(this, function (panend) {
                var movedelta = panend.delta;
                if (this.isShowing) {
                    showScreenPoint.x = showScreenPoint.x + movedelta.x;
                    showScreenPoint.y = showScreenPoint.y + movedelta.y;
                }
            }));
            map.on("zoom-start", lang.hitch(this, function () {
                domUtils.hide(this.domNode);
                this.onHide();
            }));
            map.on("zoom-end", lang.hitch(this, function () {
                if (this.isShowing) {
                    showScreenPoint = this.map.toScreen(showMapPoint);
                    this._showInfoWindow(showScreenPoint.x, showScreenPoint.y);
                }
            }));

        },
        setTitle: function (title) {
            this.place(title, this._title);

        },
        setContent: function (content) {
            this.place(content, this._content);
        },
        _showInfoWindow: function (x, y) {
            //Position 10x10 pixels away from the specified location
            domStyle.set(this.domNode, {
                "left": x - 115 + "px",
                "top": y - 283 + "px"
            });
            //display the info window
            domUtils.show(this.domNode);
        },

        //设置InfoWindow的内容
        _setFeature: function (graphic) {
            //获取信息
            var Imgsrc = graphic.attributes.image.replace('"', "");
            var name = graphic.attributes.sName.replace('"', "");
            var src = Imgsrc + "/main.jpg";
            var order = graphic.attributes.order.replace('"', "");
            var province = graphic.attributes.province.replace('"', "");
            var summary = graphic.attributes.summary.replace('"', "");
            //信息内容框
            var infoDiv = document.createElement("DIV");
            infoDiv.setAttribute("class", "infoDiv");
            //基本信息（照片简介）
            var infoContent = document.createElement("DIV");
            infoContent.setAttribute("class", "infoContent");

            //古镇标志图片
            var infoImg = document.createElement("img");
            infoImg.setAttribute("class", "infoImg");
            infoImg.src = src;
            infoContent.appendChild(infoImg);
            infoContent.innerHTML += "<div style='float:left;margin-top:5px;margin-left:15px;width:120px;height:70px;line-height:22px'>" + "<b>批次：</b>" + order + "<br><b>省份：</b>" + province + "<br><b>详情：</div>";
            //功能按钮
            var infoMenu = document.createElement("ul");
            infoMenu.setAttribute("class", "infoMenu");

            //到这里去
            var infoItem1 = document.createElement("li");
            infoItem1.setAttribute("id", "infoItem1");
            infoItem1.setAttribute("class", "on");
            infoItem1.addEventListener("click", function () {
                switchTab2(1);
            }, false);
            var linkzlq = document.createElement("a");
            linkzlq.setAttribute("class", "info_link");
            linkzlq.innerHTML = "到这里去";
            infoItem1.appendChild(linkzlq);

            //从这里出发
            var infoItem2 = document.createElement("li");

            infoItem2.setAttribute("id", "infoItem2");
            infoItem2.addEventListener("click", function () {
                switchTab2(2);
            }, false);
            var linkqzl = document.createElement("a");
            linkqzl.setAttribute("class", "info_link2");
            linkqzl.innerHTML = "从这里出发";
            infoItem2.appendChild(linkqzl);

            //在附近查找
            var infoItem3 = document.createElement("li");

            infoItem3.setAttribute("id", "infoItem3");
            infoItem3.addEventListener("click", function () {
                switchTab2(3);
            }, false);
            var linkfjz = document.createElement("a");
            linkfjz.setAttribute("class", "info_link3");
            linkfjz.innerHTML = "在附近查找";
            infoItem3.appendChild(linkfjz);

            //功能面板
            var infoPane = document.createElement("ul");
            infoPane.setAttribute("class", "infoPane");

            //到这里去
            var infoCon1 = document.createElement("li");
            infoCon1.setAttribute("class", "infoCon");
            infoCon1.setAttribute("id", "infoCon1");
            infoCon1.style = "display:block";
            var infoCon_span = document.createElement("span");
            infoCon_span.innerHTML = "起点  ";
            var infoCon_put = document.createElement("input");
            infoCon_put.style = "width:180px;height:22px;border:1px solid #C2CFE8;line-height:22px;color:#777";
            var infoCon_btn = document.createElement("input");
            infoCon_btn.type = "button";                       //设置元素的类型
            infoCon_btn.value = "驾车";
            infoCon_btn.style = "margin-left:10px;padding-bttom:2px;width:60px;height:25px;border:1px solid #C2CFE8;cursor:pointer;color:#777;background-color:#eff";
            infoCon1.appendChild(infoCon_span);
            infoCon1.appendChild(infoCon_put);
            infoCon1.appendChild(infoCon_btn);

            //从这里出发
            var infoCon2 = document.createElement("li");
            infoCon2.setAttribute("class", "infoCon");
            infoCon2.setAttribute("id", "infoCon2");
            var infoCon_span = document.createElement("span");
            infoCon_span.innerHTML = "终点  ";
            var infoCon_put = document.createElement("input");
            infoCon_put.style = "width:180px;height:22px;border:1px solid #C2CFE8;line-height:22px;color:#777";
            var infoCon_btn = document.createElement("input");
            infoCon_btn.type = "button";                       //设置元素的类型
            infoCon_btn.value = "驾车";
            infoCon_btn.style = "margin-left:10px;padding-bttom:2px;width:60px;height:25px;border:1px solid #C2CFE8;cursor:pointer;color:#777;background-color:#eff";
            infoCon2.appendChild(infoCon_span);
            infoCon2.appendChild(infoCon_put);
            infoCon2.appendChild(infoCon_btn);

            //在附近查找
            var infoCon3 = document.createElement("li");
            infoCon3.setAttribute("class", "infoCon");
            infoCon3.setAttribute("id", "infoCon3");

            infoMenu.appendChild(infoItem1);
            infoMenu.appendChild(infoItem2);
            infoMenu.appendChild(infoItem3);

            infoPane.appendChild(infoCon1);
            infoPane.appendChild(infoCon2);
            infoPane.appendChild(infoCon3);

            infoDiv.appendChild(infoContent);
            infoDiv.appendChild(infoMenu);
            infoDiv.appendChild(infoPane);

            this.setContent(infoDiv);
        },
        show: function (location) {
            showMapPoint = location;
            initMapCenter = this.map.extent.getCenter();
            initScreenCenter = this.map.toScreen(initMapCenter);
            if (location.spatialReference) {
                location = this.map.toScreen(location);
            }

            var left = location.x - 115;
            var top = location.y - 283;
            showScreenPoint = location;

            if (top < 5) {
                initScreenCenter.y = initScreenCenter.y + top - 5;
            }
            if (left < 5) {
                initScreenCenter.x = initScreenCenter.x + left - 5;
            }
            this._showInfoWindow(showScreenPoint.x, showScreenPoint.y);
            initMapCenter = this.map.toMap(initScreenCenter);
            this.map.centerAt(initMapCenter);
            this.isShowing = true;
            this.onShow();
        },
        hide: function () {
            domUtils.hide(this.domNode);
            this.isShowing = false;
            this.onHide();
        },
        resize: function (width, height) {
            domStyle.set(this.domNode, {
                "width": width + "px",
                "height": height + "px"
            });
            //          domStyle.set(this._title,{
            //            "width": width + "px"
            //          });
        },
        destroy: function () {
            domConstruct.destroy(this.domNode);
            this._closeButton = this._title = this._content = null;
        }
    });

});
