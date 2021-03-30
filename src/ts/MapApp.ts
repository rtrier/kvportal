import * as L from 'leaflet';
import * as Util from './Util';
import * as MapDescription from './conf/MapDescription';
import { MapDispatcher, MapControl, LayerWrapper } from './controls/MapControl'
import { LayerControl, LayerControlOptions } from './controls/LayerControl';

import { CategorieLayer, CategoryMarker, GeojsonLayer } from './controls/CategorieLayer';
import { LegendControl } from './controls/LegendControl';
import { Geocoder } from './util/L.GeocoderMV';
import { Expression, parseExpression } from './MapClassParser';
import { LayerLoader} from './LayerLoader';


function createGeoCoder(objclass:'parcel'|'address'|'address,parcel', limit:number):Geocoder {
    return new Geocoder('esDtb7H5Kh8zl5YXJ3iIP6xPnKEIb5Ch', {
        serviceUrl: 'https://geo.sv.rostock.de/geocodr/query',
        geocodingQueryParams: {
            'class': objclass,
            'out_epsg': '4326',
            'shape': 'geometry',
            'limit': limit
        },
        reverseQueryParams: {
            'class': objclass,
            'in_epsg': '4326',
            'limit': limit,
            'shape': 'centroid',
            'out_epsg': '4326'
        }
    }); 
}


export function initMap() {
    (new MapApp()).init();
}


class MapApp {

    availableLayers?: string;

    map: L.Map;

    baseLayers: { [id: string]: L.Layer } = {};
    baseLayer: L.Layer;

    overlayLayers: { [id: string]: LayerWrapper } = {};
    selectedLayerIds: string[];
    currentLayers: L.Layer[] = [];
    menuCtrl: MapControl;
    geocoderAdress: Geocoder;
    geocoderParcel: Geocoder;

    layerLoader = new LayerLoader();

    init() {
        const map = this.map = new L.Map('map', {
            // maxBounds: [[53, 9.8], [55,15]],
            // maxZoom: 18,
            // minZoom: 9,
            zoomControl: false
        });
        map.setView([53.9, 12.45], 9);

        /*
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            //maxZoom: 18,
            //attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
            //	'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            id: 'OSM',
            //tileSize: 512,
            //zoomOffset: -1
        }).addTo(map);

        L.tileLayer('https://sgx.geodatenzentrum.de/wmts_webatlasde.light/tile/1.0.0/webatlasde.light/default/DE_EPSG_25832_LIGHT/{z}/{y}/{x}.png', {
            //maxZoom: 18,
            //attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
            //	'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            id: 'webatlasde.light',
            minZoom: 5,
            maxZoom: 15,
            zoomOffset: -5,
            //tileSize: 512,
            // zoomOffset: 0
        }).addTo(map);
        */

        

        MapDescription.getConf('layerdef.json').then((mapDescr)=>this.initLayer(mapDescr));

        const urlParams = new URLSearchParams(window.location.search);
        // ?layers=Windenergieanlagen%20Onshore,Biogasanlagen,Freiflächenanlagen,Freiflächenanlagen%20ATKIS,Strassennetz,Freileitungen%20ab%20110kV,Umspannwerke
        const selL = urlParams.get('layers');
        if (selL) {
            this.selectedLayerIds = selL.split(',');
        }

        // const layerCtrlOptions: LayerControlOptions = {
        //     position: 'topleft',
        //     className: 'flex-no-shrink'
        // }

        const baseLayerCtrl = new LayerControl({
            position: 'topleft',
            className: 'flex-no-shrink'
        });
        const categorieLayerCtrl = new LayerControl({position: 'topleft'});

        this.menuCtrl = new MapControl({
            position: 'topleft',
            baseLayerCtrl: baseLayerCtrl,
            categorieLayerCtrl: categorieLayerCtrl,
            searchFct: (s) => this._search(s)
        });
        map.addControl(this.menuCtrl);

        map.addControl(new LegendControl({ position: 'topright' }));
        map.addControl(new L.Control.Zoom({ position: 'topright' }));

    }
    private async _search(s: string): Promise<any[]> {
        if (!this.geocoderAdress) {
            this.geocoderAdress = createGeoCoder('address,parcel',30);
        }
        // if (!this.geocoderParcel) {
        //     this.geocoderParcel = createGeoCoder('parcel');
        // }
        return new Promise<any[]>((resolve, reject) => {
            this.geocoderAdress.geocode(s).then(
                (result:any) => resolve(result)
            ).catch(
                (reason:any) => reject(reason)
            );
        });
        // const promise02 = new Promise<any[]>((resolve, reject) => {
        //     this.geocoderParcel.geocode(s).then(
        //         (result:any) => resolve(result)
        //     ).catch(
        //         (reason:any) => reject(reason)
        //     );
        // });

        // return new Promise<any>((resolve, reject) => {
        //     Promise.all([promise01, promise02]).then( (results:any[][]) =>
        //         resolve( [].concat(...results) )
        //     ).catch(
        //         (reason:any) => reject(reason)
        //     );
        // });
        // console.error('Method "search" not implemented.');
    }
    initLayer(mapDescr: MapDescription.MapDescription): void {
        console.info('mapDescr', mapDescr);
        mapDescr.baseLayers.forEach((layerDescr) => {
            console.info("BaseLayer:", layerDescr.options)
            const layer = L.tileLayer(layerDescr.url, layerDescr.options);
            layerDescr['layer'] = layer;
            this.baseLayers[layerDescr.label] = layer;
            // if (!this.baseLayer) {
            //     this.baseLayer = layer;
            //     this.map.addLayer(layer);
            // }
        });
        this.menuCtrl.baseLayerCtrl.setBaseLayers(
            mapDescr.baseLayers,
            { labelAttribute: 'label' }
        );

        // this.menuCtrl.categorieLayerCtrl.addThemes(
        //     mapDescr.themes, {
        //     createLayer: (l:MapDescription.LayerDescription)=>this.layerLoader.createLayer(l)
        // });
        this.menuCtrl.categorieLayerCtrl.addThemes( mapDescr.themes );

        mapDescr.themes.forEach((theme) => {
            theme.layers.forEach((layer) => {
                this.overlayLayers[layer.layerDescription.label] = layer;
                if (this.selectedLayerIds && this.selectedLayerIds.indexOf(layer.layerDescription.label) >= 0) {
                    // this.layerLoader.createLayer(layerDescr).then(layer => {
                    //     this.currentLayers.push(layer);
                    //     console.info("before addLayer Themes");
                    //     this.map.addLayer(layer);
                        layer.isSelected = true;
                        MapDispatcher.onLayerRequest.dispatch(this.menuCtrl, {
                            type:'request-layer',
                            layer: layer
                        });
                        // this.menuCtrl.categorieLayerCtrl.selectThemeLayer(layerDescr);
                    //     console.info(`Layer ${layerDescr.label} added.`);
                    // }).catch(reason => {
                    //     console.info(`Layer ${layerDescr.label} konnte nicht hinzugefügt werden.`, reason);
                    // });
                }
            });
        });

    }


}
