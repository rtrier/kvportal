import * as L from 'leaflet';
import { MapDispatcher, MapControl, LayerWrapper } from './controls/MapControl'
import { Geocoder } from './util/L.GeocoderMV';
import { LayerLoader } from './LayerLoader';
import { AttributionCtrl } from './controls/AttributionCtrl';
import { LegendControl } from './controls/LegendControl';
import { getConf, MapDescription, Theme } from './conf/MapDescription';
import Fuse from 'fuse.js';


function createGeoCoder(objclass: 'parcel' | 'address' | 'address,parcel', limit: number): Geocoder {
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

/**
 * 
 * @param mapDescriptionUrl initialized the map with the map description file (Standard: layerdef.json) see:{@link MapDescription}
 * @returns 
 */
export function initMap(mapDescriptionUrl?: string) {
    const mapApp = new MapApp(mapDescriptionUrl || 'layerdef.json');
    mapApp.init();
}

export class MapApp {

    availableLayers?: string;

    map: L.Map;

    selectedLayerIds: string[];
    currentLayers: L.Layer[] = [];
    mapCtrl: MapControl;
    geocoderAdress: Geocoder;
    geocoderParcel: Geocoder;


    fuseSearch:Fuse<any>;

    layerLoader:LayerLoader;

    private mapDescriptionUrl: string;
    private mapDescription: MapDescription;

    /**
     * 
     * @param mapDescription url to the mapdescription-file see:{@link MapDescription}
     * 
     */
    constructor(mapDescription?: string) {
        this.mapDescriptionUrl = mapDescription;
    }

    init() {
        getConf(this.mapDescriptionUrl).then((mapDescr) => this._init(mapDescr));
        this._attachHomeCloseBttns();

        const urlParams = new URLSearchParams(window.location.search);
        const selL = urlParams.get('layers');
        if (selL) {
            this.selectedLayerIds = selL.split(',');
        }

        this.mapCtrl = new MapControl({
            position: 'topleft',
            parentNode: document.getElementById("sidebar-mapctrl"),
            searchFct: (s) => this._search(s)
        });
    }

    _attachHomeCloseBttns() {
        const bttn1 = document.getElementById('close-home-overlay1'); 
        if (bttn1) {
            const bttn2 = document.getElementById('close-home-overlay2'); 
            const f = (ev:MouseEvent) => {
                const home = document.getElementById('home-overlay');
                home.style.display = 'none';
            }
            const fCloseOverlayByClick = (ev:MouseEvent) => {
                if (ev.currentTarget === ev.target) {
                    (<HTMLElement>ev.currentTarget).style.display = 'none';
                }
            }
            const fCloseOverlayByEscape  = (ev:KeyboardEvent) => {
                if (ev.key === 'Escape') {                
                    document.querySelectorAll('.home-overlay').forEach(item =>  {
                        (<HTMLElement>item).style.display = 'none';              
                    });
                }
            }
            bttn1.addEventListener('click', f);
            bttn2.addEventListener('click', f);

            document.getElementById('close-datenschutz-overlay').addEventListener('click', ()=>{
                const home = document.getElementById('datenschutz-overlay');
                home.style.display = 'none';                
            })
            document.getElementById('close-impressum-overlay').addEventListener('click', ()=>{
                const home = document.getElementById('impressum-overlay');
                home.style.display = 'none';
            })
            document.getElementById('bttn_impressum').addEventListener('click', ()=>{
                const home = document.getElementById('impressum-overlay');
                home.style.display = 'block';
            })
            document.getElementById('bttn_datenschutz').addEventListener('click', ()=>{
                const home = document.getElementById('datenschutz-overlay');
                home.style.display = 'block';
            })

            document.querySelectorAll('.home-overlay').forEach(item =>  {
                item.addEventListener('click', fCloseOverlayByClick);                
            });
            window.addEventListener('keydown', fCloseOverlayByEscape);

        }
    }

    _init(mapDescr: MapDescription) {
        this.mapDescription = mapDescr;
        const mapOptions:L.MapOptions = {...mapDescr.mapOptions, 
            // preferCanvas: true,
            renderer: new L.SVG(),
            zoomControl: false,
            attributionControl: false
        };        
        const map = this.map = new L.Map('map', mapOptions);
        this.layerLoader = new LayerLoader(map);
        map.addControl(this.mapCtrl);
        map.addControl(new AttributionCtrl());
        map.addControl(new LegendControl({position:'bottomright'}))
        map.addControl(new L.Control.Zoom({ position: 'bottomright' }));        
        this.initLayer(mapDescr);
        // window.setTimeout(()=>this.initLayer(mapDescr), 10);
    }


    getOverlays(themes:Theme[]):LayerWrapper[] {
        let overlays = [];
        for (let i=0; i<themes.length; i++) {
            if (themes[i].layers) {
                overlays = overlays.concat(themes[i].layers)
            } 
            if (themes[i].themes) {
                overlays = overlays.concat(this.getOverlays(themes[i].themes))
            }
        }
        return overlays;
    }

    private async _search(s: string): Promise<any[]> {
        console.info("MapApp._search");
        if (!this.geocoderAdress) {
            this.geocoderAdress = createGeoCoder('address,parcel', 30);
            const overlays = this.getOverlays(this.mapDescription.themes);
            console.info('overlays.length', overlays.length);
            this.fuseSearch = new Fuse(overlays, {
                isCaseSensitive:false, 
                ignoreLocation:true, 
                useExtendedSearch: true,
                includeScore: true,
                keys: ['layerDescription.abstract']});
        }
        
        const promiseCollector =  Promise.all([
            new Promise<any[]>((resolve, reject) => {
                const fuseResults:any[] = this.fuseSearch.search(s);
                console.info('fuseResults', fuseResults);
                const results= [];
                fuseResults.forEach(element => {
                    if (element.score < 0.1) {
                        results.push({
                            name: element.item.layerDescription.label,
                            group: "Thema",
                            layer: element.item
                        })
                    }
                });                
                resolve(results);
            }),
            new Promise<any[]>((resolve, reject) => {
                this.geocoderAdress.geocode(s).then(
                    (result: any) => resolve(result)
                ).catch(
                    (reason: any) => reject(reason)
                );
            })
        ]);
        return new Promise<any[]>((resolve, reject) => {
            promiseCollector.then(
                (result:any[][]) => {
                    let totalResult:any[];
                    for (let i=0; i<result.length; i++)  {
                        if (result[i]) {
                            totalResult = totalResult? totalResult.concat(result[i]) : result[i];
                        }
                    }
                    resolve(totalResult);
                }
            ).catch(
                (reason: any) => reject(reason)
            );
        });
        // return new Promise<any[]>((resolve, reject) => {
        //     this.geocoderAdress.geocode(s).then(
        //         (result: any) => resolve(result)
        //     ).catch(
        //         (reason: any) => reject(reason)
        //     );
        // });
    }
    initLayer(mapDescr: MapDescription): void {
        mapDescr.baseLayers.forEach((layerDescr) => {
            const layer = L.tileLayer(layerDescr.url, layerDescr.options);
            layerDescr['layer'] = layer;
        });

        this.mapCtrl.setBaseLayers(
            mapDescr.baseLayers,
            { labelAttribute: 'label' }   
        );
        this.mapCtrl.categorieLayerCtrl.addThemes(mapDescr.themes);

        mapDescr.themes.forEach((theme) => {
            theme.layers.forEach((layer) => {
                if (this.selectedLayerIds && this.selectedLayerIds.indexOf(layer.layerDescription.label) >= 0) {
                    layer.isSelected = true;
                    MapDispatcher.onLayerRequest.dispatch(this.mapCtrl, {
                        type: 'request-layer',
                        layer: layer
                    });
                }
            });
        });
    }


}
