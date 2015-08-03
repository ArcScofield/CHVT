define([
    "dojo/ready", "dojo/json", "dojo/_base/array",
    "dojo/_base/array", "dojo/_base/Color",
    "dojo/_base/declare", "dojo/_base/lang",
    "dojo/dom", "dojo/dom-geometry", "dojo/dom-attr",
    "dojo/dom-class", "dojo/dom-construct",
    "dojo/dom-style", "dojo/on",
    "dojo/Deferred", "dojo/promise/all",
    "dojo/query", "dijit/registry",
    "dijit/Menu", "dijit/CheckedMenuItem",
    "esri/arcgis/utils", "esri/lang",
    "esri/map", "esri/layers/ArcGISTiledMapServiceLayer", "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/geometry/Extent", "esri/layers/FeatureLayer",
    "esri/SpatialReference", "esri/dijit/LayerList",
    "esri/dijit/Legend", "esri/dijit/HomeButton",
    "esri/dijit/LocateButton", "esri/dijit/Scalebar",
    "esri/dijit/OverviewMap", "esri/dijit/BasemapGallery",
    "esri/dijit/Measurement", "esri/dijit/Bookmarks",
    "esri/dijit/Print", "esri/dijit/BasemapToggle",
    "esri/geometry/webMercatorUtils", "esri/geometry/Point",
    "esri/InfoTemplate", "extras/ClusterLayer", "extras/InfoWindow",
    "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleFillSymbol",
	"esri/symbols/SimpleLineSymbol", "esri/symbols/PictureMarkerSymbol",
    "esri/renderers/SimpleRenderer", "esri/renderers/ClassBreaksRenderer",
], function (
    ready, JSON, arrayUtils,
    array, Color,
    declare, lang,
    dom, domGeometry,
    domAttr, domClass,
    domConstruct, domStyle,
    on, Deferred,
    all, query,
    registry, Menu,
    CheckedMenuItem,
    arcgisUtils, esriLang,
    Map, ArcGISTiledMapServiceLayer, ArcGISDynamicMapServiceLayer,
    Extent, FeatureLayer,
    SpatialReference, LayerList,
    Legend, HomeButton,
    LocateButton, Scalebar,
    OverviewMap, BasemapGallery,
    Measurement, Bookmarks,
    Print, BasemapToggle,
    webMercatorUtils, Point,
    InfoTemplate, ClusterLayer, InfoWindow,
    SimpleMarkerSymbol, SimpleFillSymbol,
    SimpleLineSymbol, PictureMarkerSymbol,
    SimpleRenderer, ClassBreaksRenderer
    ) {
    return declare(null, {
        config: {},
        map: null,
        initExt: null,
        mapExt: null,
        editorDiv: null,
        editor: null,
        editableLayers: null,
        timeFormats: ["shortDateShortTime", "shortDateLEShortTime", "shortDateShortTime24", "shortDateLEShortTime24", "shortDateLongTime", "shortDateLELongTime", "shortDateLongTime24", "shortDateLELongTime24"],
        clusterLayerTown: {},//clusterͼ�㣨���ݶ�ȡ��Access���ݿ⣩

        //��������
        //TODO:�Ż��ṹ
        startup: function (defaultConfig) {
            if (defaultConfig) {
                this.config = defaultConfig;

                // document ready����ȡinitExt
                ready(lang.hitch(this, function () {

                    //����map����
                    this._createMap();

                    //����map���
                    this._createUI();

                    // make sure map is loaded
                    if (this.map.loaded) {

                        this._mapLoaded();// do something with the map
                    } else {
                        on.once(this.map,
                            "load",
                            lang.hitch(this, function () {

                                this._mapLoaded();// do something with the map
                            }));
                    }
                }));
            } else {
                var error = new Error("Main:: Config is not defined");
                this.reportError(error);
            }
        },

        _createMap: function () {
            var options = {};//��ͼ����ѡ��

            //���õ�ͼ��ʼ������
            this._setMapOptions(options);

            //������ͼ
            this.map = new Map("map-pane", options);

            //���ͼ�㵽��ͼ
            this._addLayersToMap(
                this.map,
                this.config,
                ArcGISTiledMapServiceLayer,
                ArcGISDynamicMapServiceLayer);

            this._addOperationLayer();
        },

        //���ͼ�㵽��ͼ
        _addLayersToMap: function (map, config, ArcGISTiledMapServiceLayer, ArcGISDynamicMapServiceLayer) {
            if (map !== null) {
                var baseMapServiceLayer = null,
                      proviceBoundryLayer = null,
                      villageTownLayer = null;

                if (config.baseMapUrl) {
                    baseMapServiceLayer = new ArcGISTiledMapServiceLayer(config.baseMapUrl);
                }
                if (config.proviceBoundryUrl) {
                    proviceBoundryLayer = new ArcGISTiledMapServiceLayer(config.proviceBoundryUrl);
                }
                if (config.villageTownUrl) {
                    villageTownLayer = new ArcGISDynamicMapServiceLayer(config.villageTownUrl);
                }

                map.addLayers([baseMapServiceLayer, proviceBoundryLayer, villageTownLayer]);
            }
        },

        //���õ�ͼ��ʼ������
        _setMapOptions: function (options) {

            //����map���Զ���infoWindow����������ʾ��ͼ��Ĳ�ѯģ��
            var infoWindow = new InfoWindow({
                domNode: domConstruct.create("div", null, dom.byId("map-pane"))
            });

            options.infoWindow = infoWindow;

            //���õ�ͼ����,��������ͼ
            //��ͼ�Ŵ󼶱�
            if (this.config.zoom) {
                options.zoom = this.config.zoom;
            }
            //��ͼ����
            if (this.config.center) {
                options.center = this.config.center;
            }
            options.slider = true;
            options.nav = false;
            options.logo = false;
            options.wrapAround180 = true;

            return options;
        },

        //���ҵ��ͼ�㣨�Ŵ�����ͼ�㣩
        _addOperationLayer: function () {

            //����handel/getData.ashx����ȡaccess���ݿ⣬��ȡ�����ݵ�JSON����
            var deferredResult = dojo.xhrPost({
                url: "handel/getData.ashx",
                timeout: 3000, //Dojo�ᱣ֤��ʱ�趨����Ч��
                handleAs: "json" //�õ���response������Ϊ��JSON�����Զ�תΪobject
            }).then(lang.hitch(this,
                this._addClusters),
            lang.hitch(this, function () {
                this.reportError();
            })
           ); //����Ӧ�������ʱ�ٵ��ûص�����
        },

        //���ͼ��Cluster
        _addClusters: function (resp) {

            var wgs = new SpatialReference({
                "wkid": 4326
            }),
                dataArray = [];

            arrayUtils.map(resp, function (p) {
                var latlng = new Point(parseFloat(p.x), parseFloat(p.y), wgs);
                var webMercator = webMercatorUtils.geographicToWebMercator(latlng);
                var attributes = {
                    "sName": p.sName,
                    "fullName": p.fullName,
                    "order": p.order,
                    "province": p.province,
                    "county": p.county,
                    "town": p.town,
                    "rsImage": p.rsImage,
                    "video": p.video,
                    "image": p.image,
                    "summary": p.summary,
                    "doc": p.doc,
                    "officialSite": p.officialSite,
                };

                var item = {
                    "x": webMercator.x,
                    "y": webMercator.y,
                    "attributes": attributes
                };
                dataArray.push(item);
                //FIXME:�����ι��ˣ�
            });

            var infoTemplate= new InfoTemplate("${sName}", "${*}");

            var data = dataArray.concat();
            this.clusterLayerTown = new ClusterLayer({
                "data": dataArray,
                "distance": 100,
                "id": "clusters1",
                "labelColor": "#fff",
                "labelOffset": 10,
                //"resolution": this.map.extent.getWidth() / this.map.width,
                "singleColor": "#333",
                "singleTemplate": infoTemplate
            });

            //clusterLayerTown��ӷּ���Ⱦ
            var defaultSym = new SimpleMarkerSymbol().setSize(4);
            var renderer1 = new ClassBreaksRenderer(defaultSym, "clusterCount");
            var picBaseUrl = "images/";
            var blue = new PictureMarkerSymbol(picBaseUrl + "red.png", 28, 28).setOffset(0, 8);
            var green = new PictureMarkerSymbol(picBaseUrl + "marker4.png", 38, 38).setOffset(0, 8);
            var red = new PictureMarkerSymbol(picBaseUrl + "marker4.png", 64, 64).setOffset(0, 8);
            renderer1.addBreak(0, 1, green);
            renderer1.addBreak(1, 30, green);
            renderer1.addBreak(30, 200, red);
            this.clusterLayerTown.setRenderer(renderer1);

            this.map.addLayer(this.clusterLayerTown);

            // close the info window when the map is clicked
            this.map.on("click", this._cleanUp);

            // close the info window when esc is pressed
            this.map.on("key-down", function (e) {
                if (e.keyCode === 27) {
                    this._cleanUp();
                }
            });

            //��ʼ�����ӻ������
            //creatList(data1);
        },

        //���infoWindow��clusterLayer
        _cleanUp: function () {
            if (this.map) {
                this.map.infoWindow.hide();
                if (this.clusterLayerTown) {
                    this.clusterLayerTown.clearSingles();
                }
            }
        },


        // Create UI��add map tools
        _createUI: function () {
            var layerList = null,
                  legend = null,
                  btnHome = null,
                  btnLocate = null,
                  scalebar = null,
                  overviewMapDijit = null,
                  basemapGallery = null,
                  printer = null;

            //Add tools to the toolbar. The tools are listed in the defaults.js file

            //add LayerList widget
            //TODO:�л���ͼ�󣬸���ͼ���б�
            layerList = new LayerList({
                map: this.map,
            }, "layer-list");
            layerList.startup();

            //add legend widget
            legend = new Legend({
                map: this.map,
                //layerInfos: [{ layer: baseLayer, title: "��ͼ" }],
                arrangement: esri.dijit.Legend.ALIGN_LEFT
            }, "legend");
            legend.startup();

            //add HomeButton Widget
            btnHome = new HomeButton({
                map: this.map
            },
           "button-home"
           );
            btnHome.startup();

            //add locatebutton widget
            btnLocate = new LocateButton({
                map: this.map,
                highlightLocation: true
            }, "button-locate");
            btnLocate.startup();

            //add scalebar widget
            scalebar = new Scalebar({
                map: this.map,
                //default value: bottom-left
                attachTo: "bottom-left",
                // "dual" displays both miles and kilmometers
                // "english" is the default, which displays miles
                // use "metric" for kilometers
                scalebarUnit: "dual"
            });

            //add overviewMap widget
            //todo:add to the div:dom.byId('overviewMapDiv')
            overviewMapDijit = new OverviewMap({
                map: this.map,
                attachTo: "bottom-right",
                visible: false,
                height: 200,
                width: 200,
                opacity: 0.40
            });
            overviewMapDijit.startup();


            //add basemap gallery widget
            //in this case we'll display maps from ArcGIS.com including bing maps
            basemapGallery = new BasemapGallery({
                showArcGISBasemaps: true,
                map: this.map
            }, "basemap-gallery");
            basemapGallery.startup();
            basemapGallery.on("error", function (msg) {
                console.log("basemap gallery error:  ", msg);
            });

            //add  printer widget
            //todo:��ӡԤ�����ܡ�����pdf��jpg��
            printer = new Print({
                map: this.map,
                url: "http://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
            }, dom.byId("print"));
            printer.startup();

            //TODO:�޷���ʾ��ǩ���
            var bookmarks = new Bookmarks({
                map: this.map
            }, domConstruct.create("div", {}, "bookmarks"));


            //����
            var measure = new Measurement({
                map: this.map
                //defaultAreaUnit: areaUnit,
                //defaultLengthUnit: lengthUnit
            }, dom.byId("measurement"));
            measure.startup();

            //BasemapToggle
            var toggle = new BasemapToggle({
                map: this.map,
                basemap: "satellite"
            }, "basemap-toggle");
            toggle.startup();
        },

        // map������ϣ�ȥ��loading��
        _mapLoaded: function () {

            // remove loading class from body
            domClass.remove(document.body, "app-loading");

            //window����ע��orientationchange
            on(window, "orientationchange", lang.hitch(this, this._adjustPopupSize));
            this._adjustPopupSize();
        },

        //�Զ�����map��С
        _adjustPopupSize: function () {
            if (!this.map) {
                return;
            }
            var box = domGeometry.getContentBox(this.map.container);

            var width = 270,
                height = 300,
                newWidth = Math.round(box.w * 0.50),
                newHeight = Math.round(box.h * 0.35);
            if (newWidth < width) {
                width = newWidth;
            }
            if (newHeight < height) {
                height = newHeight;
            }
            //this.map.infoWindow.resize(width, height);
        },

        reportError: function (error) {

            // remove loading class from body
            domClass.remove(document.body, "app-loading");
            domClass.add(document.body, "app-error");

            // an error occurred - notify the user. In this example we pull the string from the
            // resource.js file located in the nls folder because we've set the application up
            // for localization. If you don't need to support multiple languages you can hardcode the
            // strings here and comment out the call in index.html to get the localization strings.
            // set message
            var node = dom.byId("loading_message");
            if (node) {
                if (this.config && this.config.i18n) {
                    node.innerHTML = this.config.i18n.map.error + ": " + error.message;
                } else {
                    node.innerHTML = "�޷�������ͼ��ԭ���ǣ� " + error.message;
                }
            }
        },

        _setInitialExtent: function () {
            //���õ�ͼextent
            if (this.config.extent) {
                var extArray = decodeURIComponent(this.config.extent).split(",");
                if (extArray.length === 4) {
                    this.map.extent = new Extent(
                        parseFloat(extArray[0]),
                        parseFloat(extArray[1]),
                        parseFloat(extArray[2]),
                        parseFloat(extArray[3]),
                        new SpatialReference({ wkid: 102100 })
                        );
                } else if (extArray.length === 5) {
                    this.map.setExtent(new Extent(JSON.parse(this.config.extent)));
                }
            }
            else {
                //if (baseMapServiceLayer.initialExtent) {
                //    this.map.setExtent(baseMapServiceLayer.initialExtent);
            }
        },

        _addBasemapGallery: function (tool, toolbar, panelClass) {
            //Add the basemap gallery to the toolbar.
            var deferred = new Deferred();
            if (has("basemap")) {
                var basemapDiv = toolbar.createTool(tool, panelClass);
                var basemap = new BasemapGallery({
                    id: "basemapGallery",
                    map: this.map,
                    showArcGISBasemaps: true,
                    portalUrl: this.config.sharinghost,
                    basemapsGroup: this._getBasemapGroup()
                }, domConstruct.create("div", {}, basemapDiv));
                basemap.startup();
                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }

            return deferred.promise;
        },

        _addBookmarks: function (tool, toolbar, panelClass) {
            //Add the bookmarks tool to the toolbar. Only activated if the webmap contains bookmarks.
            var deferred = new Deferred();
            if (this.config.response.itemInfo.itemData.bookmarks) {
                //Conditionally load this module since most apps won't have bookmarks
                require(["application/has-config!bookmarks?esri/dijit/Bookmarks"], lang.hitch(this, function (Bookmarks) {
                    if (!Bookmarks) {
                        deferred.resolve(false);
                        return;
                    }
                    var bookmarkDiv = toolbar.createTool(tool, panelClass);
                    var bookmarks = new Bookmarks({
                        map: this.map,
                        bookmarks: this.config.response.itemInfo.itemData.bookmarks
                    }, domConstruct.create("div", {}, bookmarkDiv));

                    deferred.resolve(true);

                }));

            } else {
                deferred.resolve(false);
            }

            return deferred.promise;
        },
        _addDetails: function (tool, toolbar, panelClass) {
            //Add the default map description panel
            var deferred = new Deferred();
            if (has("details")) {
                var description = this.config.description || this.config.response.itemInfo.item.description || this.config.response.itemInfo.item.snippet;
                if (description) {
                    var descLength = description.length;
                    //Change the panel class based on the string length
                    if (descLength < 200) {
                        panelClass = "small";
                    } else if (descLength < 400) {
                        panelClass = "medium";
                    } else {
                        panelClass = "large";
                    }

                    var detailDiv = toolbar.createTool(tool, panelClass);
                    detailDiv.innerHTML = "<div class='desc'>" + description + "</div>";
                }
                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }

            return deferred.promise;

        },
        _addEditor: function (tool, toolbar, panelClass) {

            //Add the editor widget to the toolbar if the web map contains editable layers
            var deferred = new Deferred();
            this.editableLayers = this._getEditableLayers(this.config.response.itemInfo.itemData.operationalLayers);
            if (has("edit") && this.editableLayers.length > 0) {
                if (this.editableLayers.length > 0) {
                    this.editorDiv = toolbar.createTool(tool, panelClass);
                    return this._createEditor();
                } else {
                    console.log("No Editable Layers");
                    deferred.resolve(false);
                }
            } else {
                deferred.resolve(false);
            }

            return deferred.promise;
        },
        _createEditor: function () {
            var deferred = new Deferred();
            //Dynamically load since many apps won't have editable layers
            require(["application/has-config!edit?esri/dijit/editing/Editor"], lang.hitch(this, function (Editor) {
                if (!Editor) {
                    deferred.resolve(false);
                    return;
                }


                //add field infos if necessary. Field infos will contain hints if defined in the popup and hide fields where visible is set
                //to false. The popup logic takes care of this for the info window but not the edit window.
                array.forEach(this.editableLayers, lang.hitch(this, function (layer) {
                    if (layer.featureLayer && layer.featureLayer.infoTemplate && layer.featureLayer.infoTemplate.info && layer.featureLayer.infoTemplate.info.fieldInfos) {
                        //only display visible fields
                        var fields = layer.featureLayer.infoTemplate.info.fieldInfos;
                        var fieldInfos = [];
                        array.forEach(fields, lang.hitch(this, function (field) {

                            //added support for editing date and time
                            if (field.format && field.format.dateFormat && array.indexOf(this.timeFormats, field.format.dateFormat) > -1) {
                                field.format = {
                                    time: true
                                };
                            }

                            if (field.visible) {
                                fieldInfos.push(field);
                            }

                        }));

                        layer.fieldInfos = fieldInfos;
                    }
                }));
                var settings = {
                    map: this.map,
                    layerInfos: this.editableLayers,
                    toolbarVisible: has("edit-toolbar")
                };
                this.editor = new Editor({
                    settings: settings
                }, domConstruct.create("div", {}, this.editorDiv));


                this.editor.startup();
                deferred.resolve(true);

            }));
            return deferred.promise;

        },
        _destroyEditor: function () {
            if (this.editor) {
                this.editor.destroy();
                this.editor = null;
            }
        },
        _addLayers: function (tool, toolbar, panelClass) {
            //Toggle layer visibility if web map has operational layers
            var deferred = new Deferred();

            var layers = this.config.response.itemInfo.itemData.operationalLayers;

            if (layers.length === 0) {
                deferred.resolve(false);
            } else {
                if (has("layers")) {


                    //Use small panel class if layer layer is less than 5
                    if (layers.length < 5) {
                        panelClass = "small";
                    } else if (layers.length < 15) {
                        panelClass = "medium";
                    } else {
                        panelClass = "large";
                    }
                    var layersDiv = toolbar.createTool(tool, panelClass);

                    var toc = new TableOfContents({
                        map: this.map,
                        layers: layers
                    }, domConstruct.create("div", {}, layersDiv));
                    toc.startup();


                    deferred.resolve(true);
                } else {
                    deferred.resolve(false);
                }
            }
            return deferred.promise;
        },
        _addLegend: function (tool, toolbar, panelClass) {
            //Add the legend tool to the toolbar. Only activated if the web map has operational layers.
            var deferred = new Deferred();
            var layers = arcgisUtils.getLegendLayers(this.config.response);


            if (layers.length === 0) {
                deferred.resolve(false);
            } else {
                if (has("legend")) {
                    var legendLength = 0;
                    array.forEach(layers, lang.hitch(this, function (layer) {
                        if (layer.infos && layer.infos.length) {
                            legendLength += layer.infos.length;
                        }
                    }));

                    if (legendLength.length < 5) {
                        panelClass = "small";
                    } else if (legendLength.length < 15) {
                        panelClass = "medium";
                    } else {
                        panelClass = "large";
                    }

                    var legendDiv = toolbar.createTool(tool, panelClass);
                    var legend = new Legend({
                        map: this.map,
                        layerInfos: layers
                    }, domConstruct.create("div", {}, legendDiv));
                    domClass.add(legend.domNode, "legend");
                    legend.startup();
                    if (this.config.activeTool !== "") {
                        toolbar.activateTool(this.config.activeTool || "legend");
                    } else {
                        toolbar._closePage();
                    }
                    deferred.resolve(true);

                } else {
                    deferred.resolve(false);
                }


            }
            return deferred.promise;
        },

        _addMeasure: function (tool, toolbar, panelClass) {
            //Add the measure widget to the toolbar.
            var deferred = new Deferred();
            if (has("measure")) {

                var measureDiv = toolbar.createTool(tool, panelClass);
                var areaUnit = (this.config.units === "metric") ? "esriSquareKilometers" : "esriSquareMiles";
                var lengthUnit = (this.config.units === "metric") ? "esriKilometers" : "esriMiles";

                var measure = new Measurement({
                    map: this.map,
                    defaultAreaUnit: areaUnit,
                    defaultLengthUnit: lengthUnit
                }, domConstruct.create("div", {}, measureDiv));

                measure.startup();
                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }



            return deferred.promise;
        },
        _addOverviewMap: function (tool, toolbar, panelClass) {
            //Add the overview map to the toolbar
            var deferred = new Deferred();

            if (has("overview")) {
                var ovMapDiv = toolbar.createTool(tool, panelClass);


                domStyle.set(ovMapDiv, {
                    "height": "100%",
                    "width": "100%"
                });

                var panelHeight = this.map.height;
                if (panelClass === "small") {
                    panelHeight = 250;
                } else if (panelClass === "medium") {
                    panelHeight = 350;
                }

                var ovMap = new OverviewMap({
                    id: "overviewMap",
                    map: this.map,
                    height: panelHeight
                }, domConstruct.create("div", {}, ovMapDiv));

                ovMap.startup();

                on(this.map, "layer-add", lang.hitch(this, function (args) {
                    //delete and re-create the overview map if the basemap gallery changes
                    if (args.layer.hasOwnProperty("_basemapGalleryLayerType") && args.layer._basemapGalleryLayerType === "basemap") {
                        registry.byId("overviewMap").destroy();
                        var ovMap = new OverviewMap({
                            id: "overviewMap",
                            map: this.map,
                            height: panelHeight,
                            visible: false
                        }, domConstruct.create("div", {}, ovMapDiv));

                        ovMap.startup();
                    }
                }));
                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }


            return deferred.promise;
        },
        _addPrint: function (tool, toolbar, panelClass) {
            //Add the print widget to the toolbar. TODO: test custom layouts.
            var deferred = new Deferred(),
                legendNode = null,
                print = null;


            require(["application/has-config!print?esri/dijit/Print"], lang.hitch(this, function (Print) {
                //TODO Update this to have custom title text if specified by user. 
                //Add a new item to the print dialog that allows people to set this. 
                //By default it should show the web map text.
                var layoutOptions = {
                    "titleText": this.config.title,
                    "scalebarUnit": this.config.units,
                    "legendLayers": []
                };
                if (!Print) {
                    deferred.resolve(false);
                    return;
                }

                var printDiv = toolbar.createTool(tool, panelClass);

                //get format
                this.format = "PDF"; //default if nothing is specified
                for (var i = 0; i < this.config.tools.length; i++) {
                    if (this.config.tools[i].name === "print") {
                        var f = this.config.tools[i].format;
                        this.format = f.toLowerCase();
                        break;
                    }
                }

                if (this.config.hasOwnProperty("tool_print_format")) {
                    this.format = this.config.tool_print_format.toLowerCase();
                }
                //add text box for title to print dialog
                var titleNode = domConstruct.create("input", {
                    id: "print_title",
                    className: "printTitle",
                    placeholder: this.config.i18n.tools.print.titlePrompt
                }, domConstruct.create("div"));

                domConstruct.place(titleNode, printDiv);



                if (has("print-legend")) {
                    legendNode = domConstruct.create("input", {
                        id: "legend_ck",
                        className: "checkbox",
                        type: "checkbox",
                        checked: false
                    }, domConstruct.create("div", {
                        "class": "checkbox"
                    }));

                    var labelNode = domConstruct.create("label", {
                        "for": "legend_ck",
                        "className": "checkbox",
                        "innerHTML": "  " + this.config.i18n.tools.print.legend
                    }, domConstruct.create("div"));
                    domConstruct.place(legendNode, printDiv);
                    domConstruct.place(labelNode, printDiv);

                    on(legendNode, "change", lang.hitch(this, function (arg) {


                        if (legendNode.checked) {
                            var layers = arcgisUtils.getLegendLayers(this.config.response);
                            var legendLayers = array.map(layers, function (layer) {
                                return {
                                    "layerId": layer.layer.id
                                };
                            });
                            if (legendLayers.length > 0) {
                                layoutOptions.legendLayers = legendLayers;
                            }
                            array.forEach(print.templates, function (template) {
                                template.layoutOptions = layoutOptions;
                            });


                        } else {
                            array.forEach(print.templates, function (template) {
                                if (template.layoutOptions && template.layoutOptions.legendLayers) {
                                    template.layoutOptions.legendLayers = [];
                                }

                            });
                        }


                    }));
                } else {
                    domStyle.set("pageBody_print", "height", "90px");
                }

                require(["application/has-config!print-layouts?esri/request", "application/has-config!print-layouts?esri/tasks/PrintTemplate"], lang.hitch(this, function (esriRequest, PrintTemplate) {
                    if (!esriRequest && !PrintTemplate) {
                        //Use the default print templates
                        var templates = [{
                            layout: "Letter ANSI A Landscape",
                            layoutOptions: layoutOptions,
                            label: this.config.i18n.tools.print.layouts.label1 + " ( " + this.format + " )",
                            format: this.format
                        },
                        {
                            layout: "Letter ANSI A Portrait",
                            layoutOptions: layoutOptions,
                            label: this.config.i18n.tools.print.layouts.label2 + " ( " + this.format + " )",
                            format: this.format
                        },
                        {
                            layout: "Letter ANSI A Landscape",
                            layoutOptions: layoutOptions,
                            label: this.config.i18n.tools.print.layouts.label3 + " ( image )",
                            format: "PNG32"
                        },
                        {
                            layout: "Letter ANSI A Portrait",
                            layoutOptions: layoutOptions,
                            label: this.config.i18n.tools.print.layouts.label4 + " ( image )",
                            format: "PNG32"
                        }];



                        print = new Print({
                            map: this.map,
                            id: "printButton",
                            templates: templates,
                            url: this.config.helperServices.printTask.url
                        }, domConstruct.create("div"));
                        domConstruct.place(print.printDomNode, printDiv, "first");

                        print.on("print-start", lang.hitch(this, function () {
                            var printBox = dom.byId("print_title");
                            if (printBox.value) {
                                array.forEach(print.templates, lang.hitch(this, function (template) {
                                    template.layoutOptions.titleText = printBox.value;
                                }));
                            }
                        }));

                        print.startup();



                        deferred.resolve(true);
                        return;
                    }

                    esriRequest({
                        url: this.config.helperServices.printTask.url,
                        content: {
                            "f": "json"
                        },
                        "callbackParamName": "callback"
                    }).then(lang.hitch(this, function (response) {
                        var layoutTemplate, templateNames, mapOnlyIndex, templates;

                        layoutTemplate = array.filter(response.parameters, function (param, idx) {
                            return param.name === "Layout_Template";
                        });

                        if (layoutTemplate.length === 0) {
                            console.log("print service parameters name for templates must be \"Layout_Template\"");
                            return;
                        }
                        templateNames = layoutTemplate[0].choiceList;


                        // remove the MAP_ONLY template then add it to the end of the list of templates
                        mapOnlyIndex = array.indexOf(templateNames, "MAP_ONLY");
                        if (mapOnlyIndex > -1) {
                            var mapOnly = templateNames.splice(mapOnlyIndex, mapOnlyIndex + 1)[0];
                            templateNames.push(mapOnly);
                        }

                        // create a print template for each choice
                        templates = array.map(templateNames, lang.hitch(this, function (name) {
                            var plate = new PrintTemplate();
                            plate.layout = plate.label = name;
                            plate.format = this.format;
                            plate.layoutOptions = layoutOptions;
                            return plate;
                        }));


                        print = new Print({
                            map: this.map,
                            templates: templates,
                            url: this.config.helperServices.printTask.url
                        }, domConstruct.create("div"));
                        print.on("print-start", lang.hitch(this, function () {
                            var printBox = dom.byId("print_title");
                            if (printBox.value) {
                                array.forEach(print.templates, lang.hitch(this, function (template) {
                                    template.layoutOptions.titleText = printBox.value;
                                }));
                            }
                        }));
                        domConstruct.place(print.printDomNode, printDiv, "first");

                        print.startup();
                        deferred.resolve(true);

                    }));
                }));

            }));


            return deferred.promise;
        },
        _addShare: function (tool, toolbar, panelClass) {
            //Add share links for facebook, twitter and direct linking.
            //Add the measure widget to the toolbar.
            var deferred = new Deferred();

            if (has("share")) {

                var shareDiv = toolbar.createTool(tool, panelClass);

                var shareDialog = new ShareDialog({
                    bitlyLogin: this.config.bitlyLogin,
                    bitlyKey: this.config.bitlyKey,
                    map: this.map,
                    image: this.config.sharinghost + "/sharing/rest/content/items/" + this.config.response.itemInfo.item.id + "/info/" + this.config.response.itemInfo.thumbnail,
                    title: this.config.title,
                    summary: this.config.response.itemInfo.item.snippet || ""
                }, shareDiv);
                domClass.add(shareDialog.domNode, "pageBody");
                shareDialog.startup();

                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }


            return deferred.promise;

        },
        _getEditableLayers: function (layers) {
            var layerInfos = [];
            array.forEach(layers, lang.hitch(this, function (layer) {

                if (layer && layer.layerObject) {
                    var eLayer = layer.layerObject;
                    if (eLayer instanceof FeatureLayer && eLayer.isEditable()) {
                        layerInfos.push({
                            "featureLayer": eLayer
                        });
                    }
                }
            }));
            return layerInfos;
        },


        _getBasemapGroup: function () {
            //Get the id or owner and title for an organizations custom basemap group.
            var basemapGroup = null;
            if (this.config.basemapgroup && this.config.basemapgroup.title && this.config.basemapgroup.owner) {
                basemapGroup = {
                    "owner": this.config.basemapgroup.owner,
                    "title": this.config.basemapgroup.title
                };
            } else if (this.config.basemapgroup && this.config.basemapgroup.id) {
                basemapGroup = {
                    "id": this.config.basemapgroup.id
                };
            }
            return basemapGroup;
        },

        _createMapUI: function () {
            // Add map specific widgets like the Home  and locate buttons. Also add the geocoder.
            if (has("home")) {
                domConstruct.create("div", {
                    id: "panelHome",
                    className: "icon-color tool",
                    innerHTML: "<div id='btnHome'></div>"
                }, dom.byId("panelTools"), 0);
                var home = new HomeButton({
                    map: this.map
                }, dom.byId("btnHome"));

                if (!has("touch")) {
                    //add a tooltip
                    domAttr.set("btnHome", "data-title", this.config.i18n.tooltips.home);
                } else {
                    //remove no-touch class from body
                    domClass.remove(document.body, "no-touch");
                }

                home.startup();
            }


            //application/has-config!scalebar? �����Ϊfalse�������κδ���
            //hitch() returns a function that will execute a given function in a given context
            require(["application/has-config!scalebar?esri/dijit/Scalebar"], lang.hitch(this, function (Scalebar) {
                if (!Scalebar) {
                    return;
                }
                var scalebar = new Scalebar({
                    map: this.map,
                    scalebarUnit: this.config.units
                });

            }));


            if (has("locate")) {
                domConstruct.create("div", {
                    id: "panelLocate",
                    className: "icon-color tool",
                    innerHTML: "<div id='btnLocate'></div>"
                }, dom.byId("panelTools"), 1);
                var geoLocate = new LocateButton({
                    map: this.map
                }, dom.byId("btnLocate"));
                if (!has("touch")) {
                    //add a tooltip
                    domAttr.set("btnLocate", "data-title", this.config.i18n.tooltips.locate);
                }


                geoLocate.startup();

            }

            //Add the location search widget
            require(["application/has-config!search?esri/dijit/Search", "application/has-config!search?esri/tasks/locator"], lang.hitch(this, function (Search, Locator) {
                if (!Search && !Locator) {
                    //add class so we know we don't have to hide title since search isn't visible
                    domClass.add("panelTop", "no-search");
                    return;
                }

                var options = {
                    map: this.map,
                    addLayersFromMap: false
                };
                var searchLayers = false;
                var search = new Search(options, domConstruct.create("div", {
                    id: "search"
                }, "mapDiv"));
                var defaultSources = [];

                //setup geocoders defined in common config 
                if (this.config.helperServices.geocode && this.config.locationSearch) {
                    var geocoders = lang.clone(this.config.helperServices.geocode);
                    array.forEach(geocoders, lang.hitch(this, function (geocoder) {
                        if (geocoder.url.indexOf(".arcgis.com/arcgis/rest/services/World/GeocodeServer") > -1) {

                            geocoder.hasEsri = true;
                            geocoder.locator = new Locator(geocoder.url);

                            geocoder.singleLineFieldName = "SingleLine";
                            geocoder.placeholder = "Select a location";
                            geocoder.name = geocoder.name || "Esri World Geocoder";

                            if (this.config.searchExtent) {
                                geocoder.searchExtent = this.map.extent;
                                geocoder.localSearchOptions = {
                                    minScale: 300000,
                                    distance: 50000
                                };
                            }
                            defaultSources.push(geocoder);
                        } else if (esriLang.isDefined(geocoder.singleLineFieldName)) {

                            //Add geocoders with a singleLineFieldName defined 
                            geocoder.locator = new Locator(geocoder.url);

                            defaultSources.push(geocoder);
                        }
                    }));
                }
                //add configured search layers to the search widget 
                var configuredSearchLayers = (this.config.searchLayers instanceof Array) ? this.config.searchLayers : JSON.parse(this.config.searchLayers);

                array.forEach(configuredSearchLayers, lang.hitch(this, function (layer) {

                    var mapLayer = this.map.getLayer(layer.id);
                    if (mapLayer) {
                        var source = {};
                        source.featureLayer = mapLayer;

                        if (layer.fields && layer.fields.length && layer.fields.length > 0) {
                            source.searchFields = layer.fields;
                            source.displayField = layer.fields[0];
                            source.outFields = ["*"];
                            searchLayers = true;
                            defaultSources.push(source);
                            if (mapLayer.infoTemplate) {
                                source.infoTemplate = mapLayer.infoTemplate;
                            }
                        }
                    }
                }));
                //Add search layers defined on the web map item 
                if (this.config.response.itemInfo.itemData && this.config.response.itemInfo.itemData.applicationProperties && this.config.response.itemInfo.itemData.applicationProperties.viewing && this.config.response.itemInfo.itemData.applicationProperties.viewing.search) {
                    var searchOptions = this.config.response.itemInfo.itemData.applicationProperties.viewing.search;

                    array.forEach(searchOptions.layers, lang.hitch(this, function (searchLayer) {
                        //we do this so we can get the title specified in the item
                        var operationalLayers = this.config.itemInfo.itemData.operationalLayers;
                        var layer = null;
                        array.some(operationalLayers, function (opLayer) {
                            if (opLayer.id === searchLayer.id) {
                                layer = opLayer;
                                return true;
                            }
                        });

                        if (layer && layer.hasOwnProperty("url")) {
                            var source = {};
                            var url = layer.url;
                            var name = layer.title || layer.name;

                            if (esriLang.isDefined(searchLayer.subLayer)) {
                                url = url + "/" + searchLayer.subLayer;
                                array.some(layer.layerObject.layerInfos, function (info) {
                                    if (info.id == searchLayer.subLayer) {
                                        name += " - " + layer.layerObject.layerInfos[searchLayer.subLayer].name;
                                        return true;
                                    }
                                });
                            }

                            source.featureLayer = new FeatureLayer(url);


                            source.name = name;


                            source.exactMatch = searchLayer.field.exactMatch;
                            source.displayField = searchLayer.field.name;
                            source.searchFields = [searchLayer.field.name];
                            source.placeholder = searchOptions.hintText;
                            defaultSources.push(source);
                            searchLayers = true;
                        }

                    }));
                }

                search.set("sources", defaultSources);

                search.startup();

                //set the first non esri layer as active if search layers are defined. 
                var activeIndex = 0;
                if (searchLayers) {
                    array.some(defaultSources, function (s, index) {
                        if (!s.hasEsri) {
                            activeIndex = index;
                            return true;
                        }
                    });

                    if (activeIndex > 0) {
                        search.set("activeSourceIndex", activeIndex);
                    }
                }

                if (search && search.domNode) {
                    domConstruct.place(search.domNode, "panelGeocoder");
                }

            }));


            //Feature Search or find (if no search widget)
            if ((this.config.find || this.config.feature)) {
                require(["esri/dijit/Search"], lang.hitch(this, function (Search) {
                    //get the search value
                    var feature = null, find = null, source = null, value = null;
                    if (this.config.feature) {
                        feature = decodeURIComponent(this.config.feature);
                        if (feature) {
                            var splitFeature = feature.split(";");
                            if (splitFeature.length && splitFeature.length !== 3) {
                                splitFeature = feature.split(",");
                            }
                            feature = splitFeature;
                            if (feature && feature.length && feature.length === 3) {
                                var layerId = feature[0], attribute = feature[1], featureId = feature[2], searchLayer = null;
                                searchLayer = this.map.getLayer(layerId);
                                if (searchLayer) {
                                    source = {
                                        exactMatch: true,
                                        outFields: ["*"],
                                        featureLayer: searchLayer,
                                        displayField: attribute,
                                        searchFields: [attribute]
                                    };
                                    value = featureId;
                                }

                            }
                        }
                    }
                    if (this.config.find) {
                        value = decodeURIComponent(this.config.find);
                    }
                    var urlSearch = new Search({
                        map: this.map
                    });
                    urlSearch.sources;

                    if (source) {
                        urlSearch.set("sources", [source]);
                    }
                    urlSearch.on("load", lang.hitch(this, function () {
                        urlSearch.search(value).then(lang.hitch(this, function () {
                            on.once(this.map.infoWindow, "hide", lang.hitch(this, function () {
                                urlSearch.clear();
                                urlSearch.destroy();
                            }));
                        }));
                    }));
                    urlSearch.startup();

                }));
            }

            //create the tools
            this._createUI();

        },
        _updateTheme: function () {

            //Set the background color using the configured theme value
            query(".bg").style("backgroundColor", this.theme.toString());
            query(".esriPopup .pointer").style("backgroundColor", this.theme.toString());
            query(".esriPopup .titlePane").style("backgroundColor", this.theme.toString());


            //Set the font color using the configured color value
            query(".fc").style("color", this.color.toString());
            query(".esriPopup .titlePane").style("color", this.color.toString());
            query(".esriPopup. .titleButton").style("color", this.color.toString());


            //Set the Slider +/- color to match the icon style. Valid values are white and black
            // White is default so we just need to update if using black.
            //Also update the menu icon to match the tool color. Default is white.
            if (this.config.icons === "black") {
                query(".esriSimpleSlider").style("color", "#000");
                query(".icon-color").style("color", "#000");
            }

        },
        _checkExtent: function () {
            var pt = this.map.extent.getCenter();
            if (!this.initExt.contains(pt)) {
                this.map.setExtent(this.mapExt);
            } else {
                this.mapExt = this.map.extent;
            }
        }
    });
});
