import * as MapDescription from './conf/MapDescription';
import { LayerEvent, LayerWrapper, MapControl, MapDispatcher } from './controls/MapControl';
import { Expression, parseExpression } from './MapClassParser';
import * as Util from './Util';
import * as L from 'leaflet';
import * as geoJson from 'geojson';
import { CategoryCircleMarker, CategoryMarker, GeojsonLayer } from './controls/CategorieLayer';
import { createExpressionFct } from './util/FormatExpression';

type ClassifiedStyles = {
    classifiers:{exp:Expression; style:any;}[];
    standardStyle?:any;
}

function _createClassifiers(claszes:MapDescription.LayerClass[]):ClassifiedStyles {
    // const classifiers:{exp?:Expression; style:any;}[] = [];
    const result:ClassifiedStyles = {classifiers:[]};
    claszes.forEach(clasz=>{
        if (clasz.def) {
            const r = <Expression>parseExpression(clasz.def);
            result.classifiers.push({exp:r, style:clasz.style});
        } else {
            result.standardStyle = clasz.style;
        }
    });
    return result;
}

function _createStyleFct(layerDescr:MapDescription.LayerDescription):(feature:any)=>any {
    if (layerDescr.classes) {
        const styles = _createClassifiers(layerDescr.classes);
        return (feature:any) => {
            for (let i=0, count=styles.classifiers.length; i<count; i++) {
                if (styles.classifiers[i].exp.eval(feature.properties)) {
                    return styles.classifiers[i].style;
                }
            } 
            return styles.standardStyle ? styles.standardStyle : layerDescr.style;
        }
    } else {
        if (layerDescr.style && !layerDescr.style.fillColor) {
            layerDescr.style.fillColor = layerDescr.style.color;
        }
        return (feature:any) => layerDescr.style
    }
}

function getHighlightFct(layerDescr:MapDescription.LayerDescription) {
    
    if (layerDescr.geomType === 'Linestring') {
        return function(feature, highlight:boolean) {
            console.info("hFct Linestring", this, feature, highlight);
            if (highlight) {          
                feature.setStyle({color:'black'});
            } else {
                let style = this.options.style;
                if (typeof style === 'function') {
                    style = style(feature.feature);
                }
                console.info(style);
                feature.setStyle(style);
            }
        }

    } else if (layerDescr.geomType === 'Polygon') {        
        return function(feature, highlight:boolean) {
            console.info("hFct Polygon", this, feature, highlight);
            if (highlight) {          
                feature.setStyle({fillColor:'red'});
            } else {
                let style = this.options.style;
                if (typeof style === 'function') {
                    style = style(feature.feature);
                }
                console.info(style);
                feature.setStyle(style);
            }
        }
    }
}

// function highlight(layer:any, highlight:boolean) {
//     console.info("highlight", this, highlight);
//     if (this.LayerDescription) {
//         if (highlight) {          
//             layer.oldStyle = this.options.style;
//             layer.setStyle({fillColor:'red'});
//         } else {
//             let style = layer.oldStyle;
//             if (typeof style === 'function') {
// 				style = style(layer.feature);
// 			}
//             console.info(style);
//             layer.setStyle(style);
//         }
//     }
// }

export class LayerLoader {

    loadedLayers:LayerWrapper[] = [];

    constructor() {
        MapDispatcher.onLayerRequest.subscribe( (sender, evt) => this._layerRequested(sender, evt));
    }

    private _layerRequested(sender: MapControl, evt: LayerEvent): void {
        console.info(`_layerRequested id=${evt.layer.layerDescription.id} label=${evt.layer.layerDescription.label}`);
        if (!this.loadedLayers.includes(evt.layer)) {
            this.loadedLayers.push(evt.layer);
            this.createLayer(evt.layer.layerDescription).then(layer=>{
                evt.layer.layer = layer;
                MapDispatcher.onLayerReady.dispatch(this, {
                    type: 'layer-ready',
                    layer: evt.layer
                });
            }).catch(reason=>{
                console.error(`layer "${evt.layer.layerDescription.label}" konnte nicht geladen werden`, reason);
            });
        } else {
            console.error("already requested");
        }
    }


    _createPointLayer(layerDescr: MapDescription.LayerDescription, geoJson:geoJson.FeatureCollection):L.Layer {
        const layer = new GeojsonLayer({
            maxClusterRadius:(zoom)=>{
                return 15;
            },
            attribution: layerDescr.options.attribution
        });
        layer["LayerDescription"] = layerDescr;
        layer.on('click', (evt:L.LeafletMouseEvent)=>{MapDispatcher.onMapFeatureClick.dispatch(layer, evt)})

        if (layerDescr.icon) {
            const myIcon = L.icon(layerDescr.icon);
            const markerOpt = {icon:myIcon};        
            geoJson.features.forEach(
                (feature:geoJson.Feature<geoJson.Point>, idx)=> {
                    layer.addLayer(
                        new CategoryMarker(layer,{
                            lng:feature.geometry.coordinates[0],
                            lat:feature.geometry.coordinates[1],
                            ...feature.properties
                        }, markerOpt)
                    )
                }
            );
        } else {
            const styleFct = _createStyleFct(layerDescr);
            geoJson.features.forEach(
                (feature:geoJson.Feature<geoJson.Point>, idx)=> {
                    let markerOpt = styleFct(feature);
                    layer.addLayer(
                        new CategoryCircleMarker(layer,{
                            lng:feature.geometry.coordinates[0],
                            lat:feature.geometry.coordinates[1],
                            ...feature.properties
                        }, markerOpt)
                    )
                }
            );

        }
        return layer;
    }

    
    async createGeoJSONLayer(layerDescr: MapDescription.LayerDescription): Promise<L.Layer> {
        console.debug(`createJsonLayer ${layerDescr.label}`);
        
        // const fctPopup = layerDescr.popup ? createExpressionFct(layerDescr.popup) : undefined;
        // let fctPopup = undefined;
        // if (layerDescr.popup) {
        //     const expFct = createExpressionFct(layerDescr.popup);
        //     fctPopup = (layer:L.GeoJSON)=>{
        //         const f = <any>layer.feature;
        //         console.info('popupFct', f);
        //         if (f) {
        //             return expFct(f.properties);
        //         }
        //     };
        // }
        
        const json:any = await Util.loadJson(layerDescr.url, layerDescr.params);

        const fFeatureClicked = (evt:L.LeafletMouseEvent)=>MapDispatcher.onMapFeatureClick.dispatch(evt.target, evt);

        if (layerDescr.geomType == 'Point') {    
            const geoJson = <geoJson.FeatureCollection>json;
            return this._createPointLayer(layerDescr, geoJson);
        }  else {
            const styleFct = _createStyleFct(layerDescr);     
            const layer = new L.GeoJSON(
                json, <any>{
                style: styleFct,
                // renderer: L.canvas({tolerance: 2}),
                // onEachFeature: function (feature, _geojsonLayer:L.GeoJSON) {
                //     _geojsonLayer["LayerDescription"] = layerDescr;
                // }
            });
            
            if (layerDescr.popup) {
                const expFct = createExpressionFct(layerDescr.popup);
                const fctPopup = (layer:L.GeoJSON)=>{
                    const f = <any>layer.feature;
                    console.info('popupFct', f);
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
    
    private async createLayer(layerDescr: MapDescription.LayerDescription): Promise<L.Layer> {
        console.debug(`createLayer ${layerDescr.label}`);
        if (layerDescr.type == "GeoJSON") {
            return this.createGeoJSONLayer(layerDescr);
        } else if (layerDescr.type == "WMS") {
            return new L.TileLayer.WMS(layerDescr.url, <L.WMSOptions>layerDescr.options);
        } else {
            console.error(`not supported Layertype: ${layerDescr.type}`);
        }
        return undefined;
    }
    
}