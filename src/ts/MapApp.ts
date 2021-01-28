import * as L from 'leaflet';
import * as Util from './Util';
import * as MapDescription from './conf/MapDescription';
import {MenuControl} from './controls/MapControl'
import { LayerControl, LayerControlOptions } from './controls/LayerControl';

export function initMap() {
    (new MapApp()).init();
}

export async function createGeoJSONLayer(layerDescr:MapDescription.LayerDescription):Promise<L.Layer> {

    const json = await Util.loadJson(layerDescr.url, layerDescr.params);
    const myIcon = L.icon(layerDescr.icon);
    if (layerDescr.geomType == 'Point') {
        return new L.GeoJSON(
                json, {
                pointToLayer: function(feature, latlng) {                    
                    return L.marker(
                        latlng, {
                            icon: myIcon
                        }
                    );
                },
                onEachFeature: function(feature, _geojsonLayer) {
                    var p = feature.properties;
                    if (feature.properties && p[layerDescr.infoAttribute]) {
                        _geojsonLayer.bindPopup(feature.properties[layerDescr.infoAttribute]);
                    }
                }
            }
        );
    } else {
        return new L.GeoJSON(
            json, {
                style: function(feature) {
                    return layerDescr.style
                },
                onEachFeature: function(feature, _geojsonLayer) {
                    var p = feature.properties;
                    if (feature.properties && p[layerDescr.infoAttribute]) {
                        _geojsonLayer.bindPopup(feature.properties[layerDescr.infoAttribute]);
                    }
                }
            }
        );
    }
}

export async function createLayer(layerDescr:MapDescription.LayerDescription):Promise<L.Layer> {
    if (layerDescr.type == "GeoJSON") {
        return createGeoJSONLayer(layerDescr);
    } else if (layerDescr.type == "WMS") {
        return  new L.TileLayer.WMS(layerDescr.url, layerDescr.options);
    } else {
        console.error(`not supported Layertype: ${layerDescr.type}`);
    }
    return undefined;
}

class MapApp {

    availableLayers?:string;

    map:L.Map;

    baseLayers:{ [id: string] : L.Layer } = {};
    baseLayer:L.Layer;

    overlayLayers:{ [id: string] : MapDescription.LayerDescription } = {};
    selectedLayerIds: string[];
    currentLayers:L.Layer[] = [];
    menuCtrl: MenuControl;

    init() {
        const map = this.map = new L.Map('map', {
            maxBounds: [[53, 9.8], [55,15]],
            maxZoom: 18,
            minZoom: 9,
            zoomControl: false
        });
        map.setView([53.9, 12.45], 9);

        map.addControl(new L.Control.Zoom({position:'topright'}));

        MapDescription.getConf('layerdef_neu.json').then((mapDescr)=>this.initLayer(mapDescr));

        const urlParams = new URLSearchParams(window.location.search);
        // ?layers=Windenergieanlagen%20Onshore,Biogasanlagen,Freiflächenanlagen,Freiflächenanlagen%20ATKIS,Strassennetz,Freileitungen%20ab%20110kV,Umspannwerke
        const selL = urlParams.get('layers');
        if (selL) {
            this.selectedLayerIds = selL.split(',');
        }

        const layerCtrlOptions:LayerControlOptions = {            
            position: 'topleft',
            className: 'flex-no-shrink'
        }

        
        const baseLayerCtrl = new LayerControl(layerCtrlOptions);
        const categorieLayerCtrl = new LayerControl(layerCtrlOptions);


        this.menuCtrl = new MenuControl({
            position:'topleft', 
            baseLayerCtrl:baseLayerCtrl,
            categorieLayerCtrl: categorieLayerCtrl,
            searchFct: (s, cb)=>this._search(s, cb)
        });
        map.addControl(this.menuCtrl);


    }
    private _search(s: string, cb: (results: any[]) => any): void {
        console.error('Method "search" not implemented.');
    }
    initLayer(mapDescr: MapDescription.MapDescription):void {
        console.info(mapDescr);        
        mapDescr.baseLayers.forEach((layer) => {
            const l = L.tileLayer(layer.url, layer.options);
            this.baseLayers[layer.label] = l;
            if (!this.baseLayer) {
                this.baseLayer = l;
                this.map.addLayer(l);
            }
        });
        // this.menuCtrl.baseLayerCtrl.setBaseLayers(mapDescr.baseLayers);

        // this.menuCtrl.categorieLayerCtrl.setOverlays(mapDescr.themes);

        mapDescr.themes.forEach((theme) => {
            theme.layers.forEach((layerDescr) => {
                this.overlayLayers[layerDescr.label] = layerDescr;
                if (this.selectedLayerIds && this.selectedLayerIds.indexOf(layerDescr.label)>=0) {
                    createLayer(layerDescr).then(layer=>{
                        this.currentLayers.push(layer);
                        this.map.addLayer(layer);
                        console.info(`Layer ${layerDescr.label} added.`);
                    }).catch(reason=>{
                        console.info(`Layer ${layerDescr.label} konnte nicht hinzugefügt werden.`, reason);
                    });
                }
            });
        });

    }
   
    
}
