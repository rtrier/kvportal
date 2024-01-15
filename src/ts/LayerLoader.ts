import * as MapDescription from "./conf/MapDescription";
import { LayerEvent, LayerWrapper, MapControl, MapDispatcher } from "./controls/MapControl";
import { Expression, parseExpression } from "./MapClassParser";
// import * as Util from './Util';
import * as L from "leaflet";
import * as geoJson from "geojson";
import { CategoryCircleMarker, CategoryMarker, FeatureClickEvent, GeojsonLayer } from "./controls/CategorieLayer";
import { createExpressionFct } from "./util/FormatExpression";
import { LeafletMouseEvent } from "leaflet";
import { loadJson } from "./Util";
import { PiechartLayer, PiechartMarker } from "./PiechartLayer";

type ClassifiedStyles = {
    classifiers: { exp: Expression; style?: any; icon?: any }[];
    standardStyle?: any;
};

function _createClassifiers(claszes: MapDescription.LayerClass[]): ClassifiedStyles {
    const result: ClassifiedStyles = { classifiers: [] };
    claszes.forEach((clasz) => {
        const icon = clasz.icon ? L.icon(clasz.icon) : undefined;
        if (clasz.def) {
            const r = <Expression>parseExpression(clasz.def);
            result.classifiers.push({ exp: r, style: clasz.style, icon: icon });
        } else {
            result.standardStyle = clasz.style ? clasz.style : { icon: icon };
        }
    });
    return result;
}

function _createStyleFct(layerDescr: MapDescription.LayerDescription): (feature: any) => any {
    if (layerDescr.classes) {
        const styles = _createClassifiers(layerDescr.classes);
        return (feature: any) => {
            for (let i = 0, count = styles.classifiers.length; i < count; i++) {
                if (styles.classifiers[i].exp.eval(feature.properties)) {
                    if (styles.classifiers[i].icon) {
                        return { icon: styles.classifiers[i].icon };
                    } else {
                        return styles.classifiers[i].style;
                    }
                }
            }
            return styles.standardStyle ? styles.standardStyle : layerDescr.style || { color: "#3388ff", fillColor: "#3388ff" };
        };
    } else {
        if (layerDescr.style && !layerDescr.style.fillColor) {
            layerDescr.style.fillColor = layerDescr.style?.color;
        }
        return (feature: any) => layerDescr.style;
    }
}

function getHighlightFct(layerDescr: MapDescription.LayerDescription) {
    if (layerDescr.geomType === "Linestring") {
        return function (feature, highlight: boolean) {
            console.info("hFct Linestring", this, feature, highlight);
            if (highlight) {
                feature.setStyle({ color: "black" });
            } else {
                let style = this.options.style;
                if (typeof style === "function") {
                    style = style(feature.feature);
                }
                console.info(style);
                feature.setStyle(style);
            }
        };
    } else if (layerDescr.geomType === "Polygon") {
        return function (feature, highlight: boolean) {
            // console.error("hFct Polygon", this, feature, highlight);
            if (highlight) {
                feature.setStyle({ fillColor: "red" });
            } else {
                let style = feature.options.style;
                if (typeof style === "function") {
                    style = style(feature.feature);
                }
                console.info(style);
                feature.setStyle(style);
            }
        };
    }
}

export class LayerLoader {
    loadedLayers: LayerWrapper[] = [];
    map: L.Map;
    layerNr = 401;

    constructor(map: L.Map) {
        MapDispatcher.onLayerRequest.subscribe((sender, evt) => this._layerRequested(sender, evt));
        this.map = map;
    }

    private _layerRequested(sender: MapControl, evt: LayerEvent): void {
        console.info(`_layerRequested id=${evt.layer.layerDescription.id} label=${evt.layer.layerDescription.label}`);
        if (!this.loadedLayers.includes(evt.layer)) {
            this.createLayer(evt.layer.layerDescription)
                .then((layer) => {
                    evt.layer.layer = layer;
                    evt.layer.loadError = false;
                    this.loadedLayers.push(evt.layer);
                    MapDispatcher.onLayerReady.dispatch(this, {
                        type: "layer-ready",
                        layer: evt.layer,
                    });
                })
                .catch((reason) => {
                    console.error(`layer "${evt.layer.layerDescription.label}" konnte nicht geladen werden`, reason);
                    evt.layer.loadError = true;
                    MapDispatcher.onLayerError.dispatch(this, {
                        type: "layer-error",
                        layer: evt.layer,
                    });
                });
        } else {
            console.error("already requested");
        }
    }

    _createPiechartLayer(layerDescr: MapDescription.LayerDescription, geoJson: geoJson.FeatureCollection): L.Layer {
        const layer = new PiechartLayer(null, <any>{
            attribution: layerDescr.options.attribution,
            layerDescription: layerDescr,
        });
        layer["LayerDescription"] = layerDescr;
        layer.on("click", (evt: LeafletMouseEvent) => {
            MapDispatcher.onMapFeatureClick.dispatch(layer, evt);
        });
        geoJson.features.forEach((feature: geoJson.Feature<geoJson.Point>, idx) => {
            if (feature?.geometry?.coordinates) {
                layer.addLayer(
                    new PiechartMarker(
                        layer,
                        {
                            lng: feature.geometry.coordinates[0],
                            lat: feature.geometry.coordinates[1],
                        },
                        feature.properties
                    )
                );
            }
        });
        return layer;
    }

    /**
     *
     * @param layerDescr create a PointLayer
     * @param geoJson
     * @returns
     */
    _createPointLayer(layerDescr: MapDescription.LayerDescription, geoJson: geoJson.FeatureCollection): L.Layer {
        console.info("_createPointLayer", layerDescr);
        const paneId = this._createPane();
        const layer = new GeojsonLayer({
            maxClusterRadius: (zoom) => {
                // return 15;
                return 50;
            },
            attribution: layerDescr.options.attribution,
            pane: paneId,
            layerDescription: layerDescr,
        });
        layer["LayerDescription"] = layerDescr;
        // layer.on('featureclicked', (evt:FeatureClickEvent)=>{MapDispatcher.onMapFeatureClick.dispatch(evt.feature, evt)})
        layer.on("click", (evt: LeafletMouseEvent) => {
            MapDispatcher.onMapFeatureClick.dispatch(layer, evt);
        });

        if (layerDescr.icon) {
            const myIcon = L.icon(layerDescr.icon);
            const markerOpt = { icon: myIcon, pane: paneId };
            console.info("geoJson", geoJson);
            geoJson.features.forEach((feature: geoJson.Feature<geoJson.Point>, idx) => {
                // const feature = <geoJson.Feature<geoJson.Point>>geoJson.features[i];
                try {
                    layer.addLayer(
                        new CategoryMarker(
                            layer,
                            {
                                lng: feature.geometry.coordinates[0],
                                lat: feature.geometry.coordinates[1],
                            },
                            feature.properties,
                            markerOpt
                        )
                    );
                } catch (ex) {
                    console.error(ex);
                }
            });
        } else {
            const styleFct = _createStyleFct(layerDescr);
            geoJson.features.forEach((feature: geoJson.Feature<geoJson.Point>, idx) => {
                // TODO  const markerOpt = {...styleFct(feature), pane:paneId};
                if (feature?.geometry?.coordinates) {
                    const markerOpt = { ...styleFct(feature) };
                    if (markerOpt.icon) {
                        layer.addLayer(
                            new CategoryMarker(
                                layer,
                                {
                                    lng: feature.geometry.coordinates[0],
                                    lat: feature.geometry.coordinates[1],
                                },
                                feature.properties,
                                markerOpt
                            )
                        );
                    } else {
                        layer.addLayer(
                            new CategoryCircleMarker(
                                layer,
                                {
                                    lng: feature.geometry.coordinates[0],
                                    lat: feature.geometry.coordinates[1],
                                },
                                feature.properties,
                                markerOpt
                            )
                        );
                    }
                    // console.info(feature);
                } else {
                    console.error("Featur without coordinates", feature);
                }
            });
        }
        return layer;
    }

    async createWMSLayer(layerDescr: MapDescription.LayerDescription): Promise<L.Layer> {
        // console.error(`createWMSLayer`, layerDescr);
        const doc: any = await getCapabilities(layerDescr.url, <L.WMSOptions>layerDescr.options);
        if (doc) {
            console.info("requested " + layerDescr.id, doc, layerDescr);
            console.info(doc);
            const l = new L.TileLayer.WMS(layerDescr.url, {
                ...(<L.WMSOptions>layerDescr.options),
            });
            console.info("WMS", l);
            return l;
        }
    }

    async createGeoJSONLayer(layerDescr: MapDescription.LayerDescription): Promise<L.Layer> {
        // console.debug(`createJsonLayer ${layerDescr.label}`);
        console.info("requested " + layerDescr.id, layerDescr);
        const json: any = await loadJson(layerDescr.url, layerDescr.params);

        const fFeatureClicked = (evt: L.LeafletMouseEvent) => {
            MapDispatcher.onMapFeatureClick.dispatch(evt.target, evt);
        };

        if (layerDescr.geomType == "Point") {
            return this._createPointLayer(layerDescr, <geoJson.FeatureCollection>json);
        } else if (layerDescr.geomType == "Chart") {
            return this._createPiechartLayer(layerDescr, <geoJson.FeatureCollection>json);
        } else {
            const styleFct = _createStyleFct(layerDescr);
            const layer = new L.GeoJSON(json, <any>{
                style: styleFct,
                pane: this._createPane(),
                attribution: layerDescr.options.attribution,
            });

            if (layerDescr.popup) {
                const expFct = createExpressionFct(layerDescr.popup);
                const fctPopup = (layer: L.GeoJSON) => {
                    const f = <any>layer.feature;
                    // console.info('popupFct', f);
                    if (f) {
                        return expFct(f.properties);
                    }
                };
                layer.bindPopup(fctPopup);
                layer.on("click", fFeatureClicked);
            } else {
                layer.on("click", fFeatureClicked);
            }
            layer["highlightMarker"] = getHighlightFct(layerDescr);
            layer["LayerDescription"] = layerDescr;
            return layer;
        }
    }

    private _createPane(): string {
        const paneId = "lp_" + this.layerNr;
        const pane = this.map.createPane("lp_" + this.layerNr);
        console.info("this.layerNr.toString()=" + this.layerNr, pane);
        pane.style.zIndex = this.layerNr.toString();
        this.layerNr++;
        return paneId;
    }

    private async createLayer(layerDescr: MapDescription.LayerDescription): Promise<L.Layer> {
        // console.error(`createLayer ${layerDescr.label}`);

        if (layerDescr.type == "GeoJSON") {
            return this.createGeoJSONLayer(layerDescr);
        } else if (layerDescr.type == "WMS") {
            return this.createWMSLayer(layerDescr);
            // return getCapabilities(layerDescr.url, <L.WMSOptions>layerDescr.options).then((v) => {
            //     console.info("sddsjhak");
            //     console.info(v);
            //     const l = new L.TileLayer.WMS(layerDescr.url, {
            //         ...(<L.WMSOptions>layerDescr.options),
            //     });
            //     console.info("WMS", l);
            //     return l;
            // });
        } else {
            console.error(`not supported Layertype: ${layerDescr.type}`);
        }
        return undefined;
    }
}

async function getCapabilities(url: string, options: L.WMSOptions): Promise<Document> {
    // https://maps.dwd.de/geoserver/dwd/wms?version=1.3.0&request=GetCapabilities&service=WMS
    const cUrl = url + "?version=1.3.0&request=GetCapabilities&service=WMS";
    const result = await window
        .fetch(cUrl)
        .then((response) => response.text())
        .then((text) => {
            let xml: any;
            try {
                if (window.DOMParser) {
                    const parser = new window.DOMParser();
                    xml = parser.parseFromString(text, "text/xml");
                    // } else if (window.ActiveXObject) {
                    //     xml = new window.ActiveXObject("Microsoft.XMLDOM");
                    //     xml.async = "false";
                    //     xml.loadXML(text);
                }
                return xml;
            } catch (e) {
                return null;
            }
        });
    return result;
}
