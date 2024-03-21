import * as L from "leaflet";
import { MapDispatcher, MapControl, LayerWrapper } from "./controls/MapControl";
// import { Geocoder } from "./util/L.GeocoderMV";
import { Geocoder } from "./util/L.GeocoderGPSearch.MV";
import { LayerLoader } from "./LayerLoader";
import { AttributionCtrl } from "./controls/AttributionCtrl";
import { LegendControl } from "./controls/LegendControl";
import { getConf, MapDescription, Theme } from "./conf/MapDescription";
import { Nominatim } from "./util/L.GeocoderNomatim";
import Fuse from "../../node_modules/fuse.js/dist/fuse.mjs";

// import { EditLayer } from "./EditLayer";
// import { mv } from "./MV";

function createGeoCoder(objclass: "parcel" | "address" | "address,parcel", limit: number): Geocoder {
    // return new Geocoder("esDtb7H5Kh8zl5YXJ3iIP6xPnKEIb5Ch", {
    //     serviceUrl: "https://geo.sv.rostock.de/geocodr/query",
    //     geocodingQueryParams: {
    //         class: objclass,
    //         out_epsg: "4326",
    //         shape: "geometry",
    //         limit: limit,
    //     },
    //     reverseQueryParams: {
    //         class: objclass,
    //         in_epsg: "4326",
    //         limit: limit,
    //         shape: "centroid",
    //         out_epsg: "4326",
    //     },
    // });

    const geocoder = new Geocoder({
        serviceUrl: "https://www.geodaten-mv.de/geocoding-api/",
        geocodingQueryParams: {
            f: "application/geo+json",
        },
        reverseQueryParams: {},
    });
    return geocoder;
}

// function createGeoCoderNomatim(viewbox: L.LatLngBoundsExpression | undefined): Nominatim {
//     return new Nominatim({ viewbox: viewbox });
// }
function createGeoCoderNomatim(params: Record<string, unknown>): Nominatim {
    return new Nominatim({ geocodingQueryParams: params });
}
/**
 *
 * @param mapDescriptionUrl initialized the map with the map description file (Standard: layerdef.json) see:{@link MapDescription}
 * @returns
 */
export function initMap(mapDescriptionUrl?: string) {
    const mapApp = new MapApp(mapDescriptionUrl || "layerdef.json");
    mapApp.init();
}

export class MapApp {
    availableLayers?: string;

    map: L.Map;

    selectedLayerIds: string[];
    currentLayers: L.Layer[] = [];
    mapCtrl: MapControl;
    geocoderAdress: Geocoder | Nominatim;
    geocoderParcel: Geocoder;

    fuseSearch: Fuse<any>;

    layerLoader: LayerLoader;

    private mapDescriptionUrl: string;
    private mapDescription: MapDescription;
    geoCodePromise: Promise<any>;

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
        const selL = urlParams.get("layers");
        if (selL) {
            this.selectedLayerIds = selL.split(",");
        }

        // this.mapCtrl = new MapControl({
        //     position: "topleft",
        //     searchfieldplaceholder: this.mapDescription.searchfieldplaceholder,
        //     parentNode: document.getElementById("sidebar-mapctrl"),
        //     searchFct: (s) => this._search(s),
        //     resetMap: () => this._resetMap(),
        // });
    }

    _resetMap() {
        console.info("resetMap");
        if (this.mapDescription.mapOptions.center) {
            this.map.setZoom(this.mapDescription.mapOptions.zoom);
            this.map.panTo(this.mapDescription.mapOptions.center);
        }
    }

    _attachHomeCloseBttns() {
        const bttn1 = document.getElementById("close-home-overlay1");
        if (bttn1) {
            const bttn2 = document.getElementById("close-home-overlay2");
            const f = (ev: MouseEvent) => {
                const home = document.getElementById("home-overlay");
                home.style.display = "none";
            };
            const fCloseOverlayByClick = (ev: MouseEvent) => {
                if (ev.currentTarget === ev.target) {
                    (<HTMLElement>ev.currentTarget).style.display = "none";
                }
            };
            const fCloseOverlayByEscape = (ev: KeyboardEvent) => {
                if (ev.key === "Escape") {
                    document.querySelectorAll(".home-overlay").forEach((item) => {
                        (<HTMLElement>item).style.display = "none";
                    });
                }
            };
            bttn1.addEventListener("click", f);
            bttn2.addEventListener("click", f);

            document.getElementById("close-datenschutz-overlay").addEventListener("click", () => {
                const home = document.getElementById("datenschutz-overlay");
                home.style.display = "none";
            });
            document.getElementById("close-impressum-overlay").addEventListener("click", () => {
                const home = document.getElementById("impressum-overlay");
                home.style.display = "none";
            });
            document.getElementById("close-faq-overlay").addEventListener("click", () => {
                const home = document.getElementById("faq-overlay");
                home.style.display = "none";
            });
            document.getElementById("bttn_impressum").addEventListener("click", () => {
                const home = document.getElementById("impressum-overlay");
                home.style.display = "block";
            });
            document.getElementById("bttn_datenschutz").addEventListener("click", () => {
                const home = document.getElementById("datenschutz-overlay");
                home.style.display = "block";
            });
            document.getElementById("bttn_faq").addEventListener("click", () => {
                const home = document.getElementById("faq-overlay");
                home.style.display = "block";
            });

            document.querySelectorAll(".home-overlay").forEach((item) => {
                item.addEventListener("click", fCloseOverlayByClick);
            });
            window.addEventListener("keydown", fCloseOverlayByEscape);
        }
    }

    _init(mapDescr: MapDescription) {
        this.mapDescription = mapDescr;

        this.mapCtrl = new MapControl({
            position: "topleft",
            searchfieldplaceholder: this.mapDescription.searchfieldplaceholder,
            parentNode: document.getElementById("sidebar-mapctrl"),
            searchFct: (s) => this._search(s),
            resetMap: () => this._resetMap(),
        });

        // console.info("mapoptions", mapDescr.mapOptions);
        const mapOptions: L.MapOptions = {
            ...mapDescr.mapOptions,
            // preferCanvas: true,
            renderer: new L.SVG(),
            zoomControl: false,
            attributionControl: false,
        };
        const map = (this.map = new L.Map("map", mapOptions));
        this.layerLoader = new LayerLoader(map);
        map.addControl(new L.Control.Scale({ position: "bottomright", imperial: false }));
        map.addControl(this.mapCtrl);
        map.addControl(new AttributionCtrl());
        map.addControl(new LegendControl({ position: "bottomright" }));
        map.addControl(new L.Control.Zoom({ position: "bottomright" }));
        map.on("click", (ev) => {
            console.info("zoomLevel=" + map.getZoom());
        });
        this.initLayer(mapDescr);

        // map.addLayer(new EditLayer("http://localhost:8000"));
        // map.addLayer(new EditLayer("http://192.168.56.1:8000"));
        // window.setTimeout(()=>this.initLayer(mapDescr), 10);
    }

    getOverlays(themes: Theme[]): LayerWrapper[] {
        let overlays = [];
        for (let i = 0; i < themes.length; i++) {
            if (themes[i].layers) {
                overlays = overlays.concat(themes[i].layers);
            }
            if (themes[i].themes) {
                overlays = overlays.concat(this.getOverlays(themes[i].themes));
            }
        }
        return overlays;
    }

    private _search(s: string): Promise<any[]> {
        console.info("MapApp._search " + this.mapDescription);
        if (!this.geocoderAdress) {
            if (this.mapDescription?.geocoder?.type === "nominatim") {
                this.geocoderAdress = createGeoCoderNomatim(this.mapDescription.geocoder?.params);
            } else {
                this.geocoderAdress = createGeoCoder("address,parcel", 30);
            }
            const overlays = this.getOverlays(this.mapDescription.themes);
            console.info("overlays.length", overlays.length);
            this.fuseSearch = new Fuse(overlays, {
                isCaseSensitive: false,
                ignoreLocation: true,
                useExtendedSearch: false,
                includeScore: true,
                keys: ["layerDescription.abstract", "layerDescription.label"],
            });
            console.info("Fuse: ", this.fuseSearch);
        }

        if (this.geoCodePromise) {
            (<any>this.geoCodePromise).cancel();
        }

        const geoCodePromise = (this.geoCodePromise = this.geocoderAdress.geocode(s));
        // const geoCodePromise = new Promise<any[]>((resolve, reject) => {
        //     this.geocoderAdress.geocode(s).then(
        //         (result: any) => resolve(result)
        //     ).catch(
        //         (reason: any) => reject(reason)
        //     );
        // })
        const promiseCollector = Promise.all([
            new Promise<any[]>((resolve, reject) => {
                const fuseResults: any[] = this.fuseSearch.search(s);
                // console.info("fuseResults " + s, fuseResults);
                const results = [];
                fuseResults.forEach((element) => {
                    if (element.score < 0.2) {
                        // console.info("fuseResult", element, element.item.layerDescription.label, element.score, element.item.layerDescription.abstract);
                        results.push({
                            name: element.item.layerDescription.label,
                            group: "Thema",
                            layer: element.item,
                        });
                    }
                });
                resolve(results);
            }),
            geoCodePromise,
        ]);
        const p = new Promise<any[]>((resolve, reject) => {
            promiseCollector
                .then((result: any[][]) => {
                    let totalResult: any[];
                    for (let i = 0; i < result.length; i++) {
                        if (result[i]) {
                            totalResult = totalResult ? totalResult.concat(result[i]) : result[i];
                        }
                    }
                    resolve(totalResult);
                })
                .catch((reason: any) => reject(reason));
        });
        p["cancel"] = () => {
            geoCodePromise["cancel"]();
            console.info("promise canceled");
        };
        return p;
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
            layerDescr["layer"] = layer;
        });

        this.mapCtrl.setBaseLayers(mapDescr.baseLayers, { labelAttribute: "label" });
        this.mapCtrl.categorieLayerCtrl.addThemes(mapDescr.themes);

        if (this.selectedLayerIds) {
            if (this.selectedLayerIds.length === 1 && this.selectedLayerIds[0] === "all") {
                this.showAllThemes(mapDescr.themes);
            } else {
                this.showThemes(mapDescr.themes);
            }
        }

        // this.map.addEventListener("zoomend", (ev) => {
        //     console.info("resize", ev, this.map.getZoom());
        // });

        // this.map.addLayer(new L.Polygon(mv));
    }

    showAllThemes(themes: Theme[]) {
        themes.forEach((theme) => {
            theme.layers.forEach((layer) => {
                layer.isSelected = true;
                MapDispatcher.onLayerRequest.dispatch(this.mapCtrl, {
                    type: "request-layer",
                    layer: layer,
                });
            });
            if (theme.themes) {
                this.showThemes(theme.themes);
            }
        });
    }

    showThemes(themes: Theme[]) {
        themes.forEach((theme) => {
            theme.layers.forEach((layer) => {
                if (this.selectedLayerIds.indexOf(layer.layerDescription.label) >= 0) {
                    layer.isSelected = true;
                    MapDispatcher.onLayerRequest.dispatch(this.mapCtrl, {
                        type: "request-layer",
                        layer: layer,
                    });
                }
            });
            if (theme.themes) {
                this.showThemes(theme.themes);
            }
        });
    }
}
