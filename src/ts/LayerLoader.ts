import * as MapDescription from './conf/MapDescription';
import { LayerEvent, LayerWrapper, MapControl, MapDispatcher } from './controls/MapControl';
import { Expression, parseExpression } from './MapClassParser';
import * as Util from './Util';
import * as L from 'leaflet';
import * as geoJson from 'geojson';
import { CategoryMarker, GeojsonLayer } from './controls/CategorieLayer';

function _createClassifiers(claszes:MapDescription.LayerClass[]):{exp:Expression; style:any;}[] {
    const classifiers:{exp:Expression; style:any;}[] = [];
    claszes.forEach(clasz=>{
        const r = <Expression>parseExpression(clasz.def);
        classifiers.push({exp:r, style:clasz.style});
    });
    return classifiers;
}

function _createStyleFct(layerDescr:MapDescription.LayerDescription):(feature:any)=>any {
    if (layerDescr.classes) {
        const classifiers = _createClassifiers(layerDescr.classes);
        return (feature:any) => {
            for (let i=0, count=classifiers.length; i<count; i++) {
                if (classifiers[i].exp.eval(feature.properties)) {
                    return classifiers[i].style;
                }
            }
            return layerDescr.style;
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

    
    async createGeoJSONLayer(layerDescr: MapDescription.LayerDescription): Promise<L.Layer> {
        console.error(`createJsonLayer ${layerDescr.label}`);
        const f = (evt:L.LeafletMouseEvent)=>{
            console.info(evt);
            MapDispatcher.onItemOnMapSelection.dispatch(evt.target, evt.target.feature);
        }

        

        const fPopup = (feature:any) => {
            function substitute(literals: TemplateStringsArray, ...placeholders: string[]) {
                let result = "";
                for (let i=0; i<literals.length-1; i++) {
                    console.info(`lit ${i} "${literals[i]}"`);
                    console.info(`lit ${i} "${placeholders[i]}"`);
                    // result += placeholders[i]
                }
                result += literals[literals.length-1];
            }
            const s = substitute`layerDescr.popup`
            return s;
        }

        const fClick = (evt:L.LeafletMouseEvent)=>{
            
            fPopup(evt?.target?.feature);
            const popupString = layerDescr.popup;
            console.info("fClick", evt, evt?.target?.feature);
        }
    
        const json:any = await Util.loadJson(layerDescr.url, layerDescr.params);
        console.info(json);
        const myIcon = L.icon(layerDescr.icon);
        if (layerDescr.geomType == 'Point') {
            // return new L.GeoJSON(
            //     json, {
            //     pointToLayer: function (feature, latlng) {
            //         return L.marker(
            //             latlng, {
            //             icon: myIcon
            //         }
            //         );
            //     },
            //     onEachFeature: function (feature, _geojsonLayer) {
            //         var p = feature.properties;
            //         _geojsonLayer.on('click', f);
            //         if (feature.properties && p[layerDescr.infoAttribute]) {
            //             _geojsonLayer.bindPopup(feature.properties[layerDescr.infoAttribute]);
            //         }
            //     }
            // }
            // );
    
            const geoJson = <geoJson.FeatureCollection>json;
            
            const layer = new GeojsonLayer({
                maxClusterRadius:(zoom)=>{
                // console.info("zoom="+zoom+"  "+L.CRS.EPSG3857.scale(zoom));
                    return 15;
                },
                attribution: layerDescr.options.attribution
            });
            
            const markerOpt = myIcon? {icon:myIcon} : undefined;
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
            return layer;
        } else {
            const styleFct = _createStyleFct(layerDescr);
            
            return new L.GeoJSON(
                json, {
                style: styleFct,
                onEachFeature: function (feature, _geojsonLayer) {
                    _geojsonLayer.on('click', fClick);
                    // console.info(feature, _geojsonLayer);
                    
                    // var p = feature.properties;
                    // if (feature.properties && p[layerDescr.infoAttribute]) {
                    //     console.info(feature, layerDescr.infoAttribute);
                    //     _geojsonLayer.bindPopup(feature.properties[layerDescr.infoAttribute]);
                    // }
                }
            }
            );
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