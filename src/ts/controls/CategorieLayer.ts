require("leaflet");
require("@glartek/leaflet.markercluster");

import * as L from "leaflet";
import { View } from "./ViewControl";
import { MapDispatcher } from "./MapControl";
import { MarkerView } from "./MarkerListView";
import { LeafletEvent, LeafletEventHandlerFn, LeafletMouseEvent, LeafletMouseEventHandlerFn } from "leaflet";
import { LayerDescription } from "../conf/MapDescription";
import { createCSSSelector } from "../Util";
// import {MarkerClusterGroup} from "@glartek/leaflet.markercluster";

function createIcon(code: number): L.Icon {
    return <L.Icon>L.divIcon({ html: '<i class="afas">' + String.fromCharCode(code) + "</i>", iconSize: new L.Point(20, 20), iconAnchor: new L.Point(10, 10), className: "mapDivIcon" });
}
function createSelectedIcon(code: number): L.Icon {
    return <L.Icon>L.divIcon({ html: '<i class="afas">' + String.fromCharCode(code) + "</i>", iconSize: new L.Point(40, 40), iconAnchor: new L.Point(20, 20), className: "mapDivIconHighligted" });
}

export interface Category {
    id: any;
    parentId: any;
    bezeichnung: string;
    childs: Category[];
}

export interface CategorieLayerOptions<T extends L.LatLngExpression, N> extends L.MarkerClusterGroupOptions {
    categorieUrl: string;
    url: string;
    selector: CategorieSelector<T, N>;
    popupFactory: PopupCreator<T>;
}

export type Path<T> = T[];

export interface CategorieSelector<T, N> {
    isOfCategory(data: T, katId: Path<N>[]): boolean;
}

export interface PopupCreator<T extends L.LatLngExpression> {
    renderDataView(layer: InteractiveLayer, marker: CategoryMapObject<T>): HTMLElement;
    renderListItem(layer: InteractiveLayer, marker: CategoryMapObject<T>): HTMLElement;
}

export interface CategoryMarkerOptions extends L.MarkerOptions {
    selectIcon?: L.Icon;
    standardIcon?: L.Icon;
}

/*
export class CategoryPopup<T extends L.LatLngExpression> extends L.Popup {
    marker: CategoryMarker<T>;

    constructor(marker:CategoryMarker<T>, options:L.PopupOptions) {
        super(options);
    }

}
*/

export interface CategoryMapObject<T extends L.LatLngExpression> extends L.Layer {
    data: T;
    selected: boolean;

    isVisible(): boolean;

    setVisible(visible: boolean): void;

    highlight(highlight: boolean): void;

    getLatLng(): L.LatLng;
}

export class CategoryCircleMarker<T extends L.LatLngExpression> extends L.CircleMarker implements CategoryMapObject<T> {
    visible: boolean = false;

    data: T;
    private _clickClosure: (ev: any) => void;
    selected = false;

    constructor(parentLayer: CategorieLayer<T, any> | InteractiveLayer, coord: L.LatLngExpression, data: any, options?: CategoryMarkerOptions) {
        super(coord, options);
        this.data = data;
    }

    setVisible(visible: boolean) {
        this.visible = visible;
    }

    isVisible(): boolean {
        return this.visible;
    }

    highlight(highlight: boolean) {
        console.info(`CategoryCircleMarker.highlight ${highlight} ${this.data["id"]}`);

        if (highlight) {
            this["fillColor"] = this.options.fillColor || this.options.color;
            this.setStyle({ fillColor: "red" });
        } else {
            const fillColor = this["fillColor"];
            this.setStyle({ fillColor: fillColor });
        }
    }
}

export class CategoryMarker<T extends L.LatLngExpression> extends L.Marker implements CategoryMapObject<T> {
    visible: boolean = false;

    static icon = createIcon(0xf024);
    static selectedIcon = createSelectedIcon(0xf024);

    parentLayer: CategorieLayer<T, any> | InteractiveLayer;
    data: T;
    // private _clickClosure: (ev: any) => void;
    selected = false;
    private _icon: HTMLImageElement;
    // icon:L.Icon;

    constructor(parentLayer: CategorieLayer<T, any> | InteractiveLayer, coord: L.LatLngExpression, data: any, options?: CategoryMarkerOptions) {
        super(coord, options);
        // if (!this.getLatLng()) {
        //     debugger;
        // }
        this.data = data;
        this.parentLayer = parentLayer;

        if (!options || !options.icon) {
            this.options["standardIcon"] = CategoryMarker.icon;
            this.setIcon(CategoryMarker.icon);
        }
        if (!options || !options.selectIcon) {
            this.options["selectIcon"] = CategoryMarker.selectedIcon;
        }
    }

    setVisible(visible: boolean) {
        this.visible = visible;
    }

    isVisible(): boolean {
        return this.visible;
    }

    // highLight(highlight: boolean) {
    //     console.info('CategoryMarker.highlight', this.data['id'], highlight);
    //     this.selected = highlight;
    //     try {
    //         if (highlight) {
    //             (<HTMLElement>(<any>this)._icon).classList.add('highlight');
    //         }
    //         else {
    //             (<HTMLElement>(<any>this)._icon).classList.remove('highlight');
    //         }
    //     } catch (ex) {
    //         // console.error(ex);
    //     }
    // }
    highlight(highlight: boolean) {
        console.info("CategoryMarker.highlight", this.data["id"], highlight);
        this.selected = highlight;
        if (this._icon) {
            if (highlight) {
                this._icon.classList.add("icon-highlighted");
            } else {
                this._icon.classList.remove("icon-highlighted");
            }
        }
        console.info("this", this);
        // if (highlight) {
        //     this.setIcon((<CategoryMarkerOptions>this.options).selectIcon);
        // } else {
        //     this.setIcon((<CategoryMarkerOptions>this.options).standardIcon);
        // }
    }
}

export interface FeatureClickEvent extends LeafletMouseEvent {
    layer: L.Layer;
    feature: CategoryMapObject<any>;
}
export type FeatureClickEventHandlerFn = (event: FeatureClickEvent) => void;

export interface InteractiveLayer {
    map?: L.Map;
    popupFactory?: PopupCreator<any>;

    highlightMarker: (marker: CategoryMapObject<any>, highlight: boolean) => void;
    mapItemClicked: (marker: CategoryMapObject<any>, ev: L.LeafletEvent) => void;

    // on: (type: 'itemclicked', fn: LeafletMouseEventHandlerFn, context?: any)=> this;
    on(type: "featureclicked", fn: FeatureClickEventHandlerFn | LeafletEventHandlerFn, context?: any): this;
    on(type: string, fn: LeafletEventHandlerFn | FeatureClickEventHandlerFn, context?: any): this;
}

export interface GeojsonLayerOptions extends L.MarkerClusterGroupOptions {
    layerDescription: LayerDescription;
}

var nrCSSSelector = 0;
export class GeojsonLayer extends L.MarkerClusterGroup implements InteractiveLayer {
    selectedMarker: CategoryMapObject<any>;
    layerDescription: LayerDescription;

    markerClass: string;

    constructor(options?: GeojsonLayerOptions) {
        super(options);
        this.layerDescription = options.layerDescription;
    }

    highlightMarker(marker: CategoryMapObject<any>, highlight: boolean) {
        marker.highlight(highlight);
    }

    mapItemClicked(marker: CategoryMapObject<any>, ev: L.LeafletMouseEvent): void {
        // MapDispatcher.onMapFeatureClick.dispatch(marker, {...ev, layer:this, feature:marker});
        MapDispatcher.onMapFeatureClick.dispatch(marker, ev);
    }

    renderData(marker: CategoryMapObject<any>): View {
        return new MarkerView(this, marker);
    }

    _defaultIconCreateFunction(cluster: any) {
        const childCount = cluster.getChildCount();

        // var c = " marker-cluster-";
        // if (childCount < 10) {
        //     c += "small";
        // } else if (childCount < 100) {
        //     c += "medium";
        // } else {
        //     c += "large";
        // }

        if (!this.markerClass) {
            let c: string;

            if (this.layerDescription.icon?.iconUrl) {
                // c = "cluster_" + this.layerDescription.label.replace(/[^\w]/g, "");
                c = "cluster_" + nrCSSSelector++;
                createCSSSelector("." + c, `background-image: url("${this.layerDescription.icon.iconUrl}");`);
            } else if (this.layerDescription.theme?.icon) {
                // c = "cluster_" + this.layerDescription.theme.thema.replace(" ", "");
                c = "cluster_" + nrCSSSelector++;
                createCSSSelector("." + c, `background-image: url("${this.layerDescription.theme.icon}");`);
            } else if (this.layerDescription.classes) {
                if (this.layerDescription.theme?.icon) {
                    c = "cluster_" + nrCSSSelector++;
                    // c = "cluster_" + this.layerDescription.theme.thema.replace(" ", "");
                    createCSSSelector("." + c, `background-image: url("${this.layerDescription.theme.icon}");`);
                }
            }
            if (c) {
                this.markerClass = "marker-cluster marker-cluster-icon marker-cluster-small " + c;
            } else {
                this.markerClass = "marker-cluster marker-cluster-small";
            }
        }
        return new L.DivIcon({ html: "<div><span>" + childCount + "</span></div>", className: this.markerClass, iconSize: new L.Point(40, 40) });
        // return new L.DivIcon({ html: "<div><span>" + childCount + "</span></div>", className: "marker-cluster marker-cluster-small " + c, iconSize: new L.Point(40, 40) });
        // return new L.DivIcon({ html: "<div><span>" + childCount + "</span></div>", className: "marker-cluster-small", iconSize: new L.Point(40, 40) });
    }

    // on1(type: 'bll', fn: L.LeafletEventHandlerFn, context?: any): this {
    //     return super.on(type, fn, context);
    // }
}

// export class CategorieLayer<T extends L.LatLngExpression> extends L.LayerGroup {
export class CategorieLayer<T extends L.LatLngExpression, N> extends L.MarkerClusterGroup implements InteractiveLayer {
    categorieUrl: string;
    url: string;

    categories: Category[];

    selectedCategories: Path<N>[];

    data: T;
    selector: CategorieSelector<T, N>;
    popupFactory: PopupCreator<T>;

    markerMap: { [id: number]: CategoryMapObject<T> } = {};
    markers: CategoryMapObject<T>[] = [];
    // selectedMarker: CategoryMapObject<T>;
    foundMarkers: CategoryMapObject<T>[];
    map: L.Map;
    enqueueSpiderfy: boolean;

    //
    selectedMarker: CategoryMapObject<T>;

    constructor(options?: CategorieLayerOptions<T, N>) {
        super(options);
        this.categorieUrl = options.categorieUrl;
        this.url = options.url;
        this.selector = options.selector;
        this.popupFactory = options.popupFactory;
    }

    loadCategories() {
        window.fetch(this.categorieUrl).then((response) => {
            response.json().then((data) => {
                this.categories = data;
                this.fire("CategoriesLoaded");
                this._loadData();
            });
        });
    }
    private _loadData() {
        window.fetch(this.url).then((response) => {
            response.json().then((data) => {
                this.data = data;
                for (let i = 0; i < data.length; i++) {
                    const marker = new CategoryMarker(this, { lat: data[i].lat, lng: data[i].lng }, data[i]);
                    this.markers.push(marker);
                    this.markerMap[data[i].id] = marker;
                }
                this._update();
            });
        });
    }

    onAdd(map: L.Map): this {
        console.info("o0nAdd", this);
        super.onAdd(map);
        this.map = map;
        map.on("zoomend", (evt) => {
            this.enqueueSpiderfy = true;
        });
        return this;
    }
    onRemove(map: L.Map): this {
        super.onRemove(map);
        this.map = undefined;
        return this;
    }

    private _findMarker(value: any, prop: string) {
        const markers = this.markers;
        for (let i = 0, count = markers.length; i < count; i++) {
            const marker = markers[i];
            if (marker.data[prop] === value) {
                return marker;
            }
        }
    }

    async findMarkers(att: string, value: any): Promise<CategoryMapObject<T>[]> {
        const response = await window.fetch(this.url + "/search?" + att + "=" + value);
        const data: number[] = await response.json();
        const result: CategoryMapObject<T>[] = [];
        for (let i = 0; i < data.length; i++) {
            const marker = this.markerMap[data[i]];
            if (marker) {
                result.push(marker);
                if (!marker.isVisible()) {
                    if (!this.foundMarkers) {
                        this.foundMarkers = [];
                    }
                    this.foundMarkers.push(marker);
                    this.addLayer(marker);
                }
            }
        }
        return result;
    }

    removeSearchResults() {
        console.info("removeSearchResults");
        if (this.foundMarkers) {
            this.foundMarkers.forEach((item) => {
                this.removeLayer(item);
            });
            this.foundMarkers = undefined;
        }
    }

    // mapItemClickedOrg(marker: CategoryMapObject<T>, ev: L.LeafletMouseEvent): void {
    //     console.info("mapItemClicked", marker.data['id'], ev);
    //     MapDispatcher.onMapFeatureClick.dispatch(marker, ev);
    // }

    mapItemClicked(marker: CategoryMapObject<T>, ev: L.LeafletMouseEvent): void {
        console.error("mapItemClicked", marker, ev);

        if (marker.selected) {
            if (this.map.getZoom()) {
                const lat = (<any>marker.data).lat;
                const lng = (<any>marker.data).lng;
                const c = new L.LatLng(lat, lng);

                this._map.setView(c, 18);

                this.once("animationend", (evt) => {
                    console.info(`animationend=>map.setView(${c})`);
                    window.setTimeout(() => {
                        this.map.setView(c);
                    });
                });
            } else {
                // MapDispatcher.onMapFeatureClick.dispatch(marker, {...ev, layer:this, feature:marker});
                // MapDispatcher.onItemOnMapUnselection.dispatch(this, marker);
                MapDispatcher.onMapFeatureClick.dispatch(marker, ev);
            }
        } else {
            // MapDispatcher.onItemOnMapSelection.dispatch(this, marker);
            // MapDispatcher.onMapFeatureClick.dispatch(marker, {...ev, layer:this, feature:marker});
            MapDispatcher.onMapFeatureClick.dispatch(marker, ev);
            this.selectedMarker = marker;
        }
    }

    highlightMarker(marker: CategoryMarker<T>, highlight: boolean) {
        console.info(`CategorieLayer.highlightMarker ${marker.data["id"]} ${highlight}`);

        if (highlight) {
            this.removeLayer(marker);
            console.info("marker.options.pane=" + marker.options.pane);
            marker.options["oldPane"] = marker.options.pane;
            marker.options.pane = "highlightPane";
            this._map.addLayer(marker);
            marker.highlight(highlight);
        } else {
            this._map.removeLayer(marker);
            const oldPane = marker.options["oldPane"];
            if (oldPane) {
                marker.options.pane = oldPane;
            }
            this.addLayer(marker);
            marker.highlight(highlight);
        }
    }

    findMarker(value: any, prop: string): CategoryMapObject<T> {
        return this._findMarker(value, prop);
    }

    showMarker(value: any, prop: string): CategoryMapObject<T> {
        console.info("showMarker");
        const marker = this._findMarker(value, prop);
        if (marker) {
            if (!marker.isVisible()) {
                this.addLayer(marker);
            }
            if (this._map.getZoom() < 12) {
                this._map.setZoomAround(marker.getLatLng(), 12);
            } else {
                this._map.panTo(marker.getLatLng());
            }
        }
        return marker;
    }

    renderData(marker: CategoryMapObject<T>): View {
        return new MarkerView(this, marker);
    }

    getItems(path: Path<any>): CategoryMapObject<any>[] {
        console.info("_update");
        const selector = this.selector;
        const markers = this.markers;

        const results: CategoryMapObject<T>[] = [];
        for (let i = 0, count = markers.length; i < count; i++) {
            const marker = markers[i];

            if (selector.isOfCategory(marker.data, [path])) {
                results.push(marker);
            }
        }
        return results;
    }

    _update() {
        console.info("_update");
        const selector = this.selector;
        const markers = this.markers;

        if (this.selectedCategories) {
            const selectedCats = this.selectedCategories;
            // let s = "\n";
            // for (let i=0; i<selectedCats.length; i++) {
            //     s += i.toString()+"\t"+selectedCats[i]+"\n";
            // }
            // console.info("_categorieSelected", s, "markers.length="+markers.length);

            for (let i = 0, count = markers.length; i < count; i++) {
                const marker = markers[i];

                if (selector.isOfCategory(marker.data, selectedCats)) {
                    if (!marker.isVisible()) {
                        // console.info(marker.data["id"], selector.isOfCategory(marker.data, this.selectedCategories));
                        this.addLayer(marker);
                        marker.setVisible(true);
                    }
                } else {
                    if (marker.isVisible()) {
                        // console.info(marker.data["id"], selector.isOfCategory(marker.data, this.selectedCategories));
                        this.removeLayer(marker);
                        marker.setVisible(false);
                    }
                }
            }
        } else {
            for (let i = 0, count = markers.length; i < count; i++) {
                const marker = markers[i];
                if (marker.isVisible()) {
                    this.removeLayer(marker);
                    marker.setVisible(false);
                }
            }
        }
    }

    setKategories(ids: Path<N>[]) {
        this.selectedCategories = ids;
        this._update();
    }

    getCategories() {
        return this.categories;
    }
}
