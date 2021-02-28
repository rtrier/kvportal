import * as L from 'leaflet';
import * as Util from './Util';
import * as MapDescription from './conf/MapDescription';
import { MapDispatcher, MenuControl } from './controls/MapControl'
import { LayerControl, LayerControlOptions } from './controls/LayerControl';
import * as geoJson from 'geojson';
import { CategorieLayer, CategoryMarker, GeojsonLayer } from './controls/CategorieLayer';
import { LegendControl } from './controls/LegendControl';
import { Geocoder } from './util/L.GeocoderMV';
import { Expression, parseExpression } from './MapClassParser';


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

export async function createGeoJSONLayer(layerDescr: MapDescription.LayerDescription): Promise<L.Layer> {

    const f = (evt:L.LeafletMouseEvent)=>{
        console.info(evt);
        MapDispatcher.onItemOnMapSelection.dispatch(undefined, evt.target.feature);
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
                var p = feature.properties;
                if (feature.properties && p[layerDescr.infoAttribute]) {
                    _geojsonLayer.bindPopup(feature.properties[layerDescr.infoAttribute]);
                }
            }
        }
        );
    }
}

export async function createLayer(layerDescr: MapDescription.LayerDescription): Promise<L.Layer> {
    if (layerDescr.type == "GeoJSON") {
        return createGeoJSONLayer(layerDescr);
    } else if (layerDescr.type == "WMS") {
        return new L.TileLayer.WMS(layerDescr.url, <L.WMSOptions>layerDescr.options);
    } else {
        console.error(`not supported Layertype: ${layerDescr.type}`);
    }
    return undefined;
}

class MapApp {

    availableLayers?: string;

    map: L.Map;

    baseLayers: { [id: string]: L.Layer } = {};
    baseLayer: L.Layer;

    overlayLayers: { [id: string]: MapDescription.LayerDescription } = {};
    selectedLayerIds: string[];
    currentLayers: L.Layer[] = [];
    menuCtrl: MenuControl;
    geocoderAdress: Geocoder;
    geocoderParcel: Geocoder;

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

        this.menuCtrl = new MenuControl({
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

        this.menuCtrl.categorieLayerCtrl.addThemes(
            mapDescr.themes, {
            createLayer:createLayer
        });

        mapDescr.themes.forEach((theme) => {
            theme.layers.forEach((layerDescr) => {
                this.overlayLayers[layerDescr.label] = layerDescr;
                if (this.selectedLayerIds && this.selectedLayerIds.indexOf(layerDescr.label) >= 0) {
                    createLayer(layerDescr).then(layer => {
                        this.currentLayers.push(layer);
                        console.info("before addLayer Themes");
                        // this.map.addLayer(layer);
                        this.menuCtrl.categorieLayerCtrl.selectThemeLayer(layerDescr);
                        console.info(`Layer ${layerDescr.label} added.`);
                    }).catch(reason => {
                        console.info(`Layer ${layerDescr.label} konnte nicht hinzugefügt werden.`, reason);
                    });
                }
            });
        });

    }


}
