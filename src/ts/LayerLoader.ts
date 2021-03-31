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
        return (feature:any) => layerDescr.style
    }
}

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
                console.error(`layer "${evt.layer.layerDescription.id}" konnte nicht geladen werden`, reason);
            });
        } else {
            console.error("already requested");
        }
    }

    // _createGlifyPointLayer(map:L.Map, layerDescr: MapDescription.LayerDescription, geoJson:geoJson.FeatureCollection):L.Layer {
    //     glify.glify.points({
    //         map: map,
    //         data: geoJson,
    //         click: (e, pointOrGeoJsonFeature, xy): boolean | void => {
    //           // do something when a point is clicked
    //           // return false to continue traversing
    //         },
    //         hover: (e, pointOrGeoJsonFeature, xy): boolean | void => {
    //           // do something when a point is hovered
    //         }
    //       });
    // }

    _createPointLayer(layerDescr: MapDescription.LayerDescription, geoJson:geoJson.FeatureCollection):L.Layer {
        const layer = new GeojsonLayer({
            maxClusterRadius:(zoom)=>{
                return 15;
            },
            attribution: layerDescr.options.attribution
        });
        layer["LayerDescription"] = layerDescr;

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
        console.error(`createJsonLayer ${layerDescr.label}`);
        const f = (evt:L.LeafletMouseEvent)=>{
            console.info(evt);
            MapDispatcher.onItemOnMapSelection.dispatch(evt.target, evt.target.feature);
        }

        

        // const fPopup = (feature:any):string => {
        //     function substitute(literals: TemplateStringsArray, ...placeholders: string[]) {
        //         let result = "";
        //         for (let i=0; i<literals.length-1; i++) {
        //             console.info(`lit ${i} "${literals[i]}"`);
        //             console.info(`lit ${i} "${placeholders[i]}"`);
        //             // result += placeholders[i]
        //         }
        //         result += literals[literals.length-1];
        //         return result;
        //     }
        //     const s = substitute`layerDescr.popup`;
        //     return s;
        // };

        const fctPopup = layerDescr.popup ? createExpressionFct(layerDescr.popup) : undefined;

        const fClick = (evt:L.LeafletMouseEvent)=>{
            console.info("fClick", evt);
            const layer = evt.target;
            // const feature = layer.feature;
            if (layer.selected) {
                layer.selected = false;
                MapDispatcher.onItemOnMapUnselection.dispatch(layer, layer);
            } else {
                layer.selected = true;
                MapDispatcher.onItemOnMapSelection.dispatch(layer, layer);
            }
            // fPopup(evt?.target?.feature);
            // const popupString = layerDescr.popup;
            // console.info("fClick", evt, evt?.target?.feature);
            // if (marker.selected) {
            //     MapDispatcher.onItemOnMapUnselection.dispatch(this, marker);
            //     // this.selectedMarker = undefined;
            // } else {
            //     // if (this.selectedMarker) {
            //     //     MenuControl.DISPATCHER.onItemOnMapSelection.dispatch(this, undefined);
            //     //     this.selectedMarker = undefined;
            //     // }
            //     MapDispatcher.onItemOnMapSelection.dispatch(this, marker);
            //     this.selectedMarker = marker;
            // }
        }
    
        const json:any = await Util.loadJson(layerDescr.url, layerDescr.params);
        console.info(json);
        // const myIcon = L.icon(layerDescr.icon);
        if (layerDescr.geomType == 'Point') {
    
            const geoJson = <geoJson.FeatureCollection>json;
            
            // const layer = new GeojsonLayer({
            //     maxClusterRadius:(zoom)=>{
            //     // console.info("zoom="+zoom+"  "+L.CRS.EPSG3857.scale(zoom));
            //         return 15;
            //     },
            //     attribution: layerDescr.options.attribution
            // });
            
            // const markerOpt = myIcon? {icon:myIcon} : undefined;
            // geoJson.features.forEach(
            //     (feature:geoJson.Feature<geoJson.Point>, idx)=> {
            //         layer.addLayer(
            //             new CategoryMarker(layer,{
            //                 lng:feature.geometry.coordinates[0],
            //                 lat:feature.geometry.coordinates[1],
            //                 ...feature.properties
            //             }, markerOpt)
            //         )
            //     }
            // );
            // return layer;
            return this._createPointLayer(layerDescr, geoJson);
        } else {
            const styleFct = _createStyleFct(layerDescr);
            
            const layer = new L.GeoJSON(
                json, {
                style: styleFct,
                onEachFeature: function (feature, _geojsonLayer) {
                    // _geojsonLayer.on('click', fClick);
                    // console.info(feature, _geojsonLayer);
                    
                    // var p = feature.properties;
                    // if (feature.properties && p[layerDescr.infoAttribute]) {
                    //     console.info(feature, layerDescr.infoAttribute);
                    if (layerDescr.popup) {                       
                        const s = fctPopup(feature.properties);
                        _geojsonLayer.bindPopup(s);
                        // _geojsonLayer.bindPopup(feature.properties[layerDescr.infoAttribute]);
                    } else {
                        _geojsonLayer.on('click', fClick);
                    }
                    // }
                }
            });
            layer["layerDescr"] = layerDescr;
            return layer;
        }
    }
    
    private async createLayer(layerDescr: MapDescription.LayerDescription): Promise<L.Layer> {
        console.error(`createLayer ${layerDescr.label}`);
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