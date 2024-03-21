import * as L from "leaflet";
import { EventDispatcher } from "strongly-typed-events";
import autocomplete from "../util/Autocompleter";
import { createHtmlElement } from "../Util";
import { CategorieLayer, CategoryMapObject, GeojsonLayer, InteractiveLayer } from "./CategorieLayer";
import { LayerControl } from "./LayerControl";
import { View, ViewControl } from "./ViewControl";
import { MarkerListView, MarkerView } from "./MarkerListView";
import { LayerDescription } from "../conf/MapDescription";
import { LayerLoader } from "../LayerLoader";
import { LeafletMouseEvent } from "leaflet";
import { BaseLayerSelectorCtrl } from "./BaselayerSelectorCtrl";
import { LayerControlVar, SCALES } from "./LayerControlVar";
import { SearchControl } from "./SearchCtrl";
import { ChangeFontSizeCtrl, IconActionCtrl } from "./IconAction";

export class MenuControlOptions implements L.ControlOptions {
    position?: L.ControlPosition;
    parentNode?: HTMLElement;
    searchfieldplaceholder?: string;
    searchFct?: (s: string) => Promise<any[]>;
    resetMap?: () => void;
}

export type LayerEvent = {
    type: "select" | "request-layer" | "layer-ready" | "create-start" | "created" | "added-to-map" | "removed-from-map" | "layer-error";
    layer: LayerWrapper;
};

export type LayerOrderChangeEvent = {
    type: "order-changed";
    layers: LayerWrapper[];
};

export class LayerWrapper {
    private static idCounter = 0;

    layer: L.Layer;
    layerDescription: LayerDescription;
    isSelected = false;

    id: number;
    /**
     * order 1 ist unten ...
     */
    idx: number = -1;
    loadError: boolean;

    constructor(layerDescription: LayerDescription) {
        this.layerDescription = layerDescription;
        this.id = LayerWrapper.idCounter++;
    }

    setSelected(selected: boolean): void {
        // console.error(`LayerWrapper.setSelected(${selected})`)
        if (this.isSelected !== selected) {
            this.isSelected = selected;
            MapDispatcher.onThemeLayerSelection.dispatch(this, {
                type: "select",
                layer: this,
            });
        }
    }
}

class Dispatcher {
    // map: L.Map;

    onListViewItemSelection = new EventDispatcher<MarkerListView, CategoryMapObject<any>>();

    onViewRemove = new EventDispatcher<ViewControl, View>();

    onMapFeatureClick = new EventDispatcher<any, LeafletMouseEvent>();

    onBaseLayerSelection = new EventDispatcher<LayerControl, L.Layer>();
    onThemeLayerSelection = new EventDispatcher<LayerWrapper, LayerEvent>();

    onLayerCreationStart = new EventDispatcher<LayerLoader, LayerEvent>();

    onLayerCreationEnd = new EventDispatcher<LayerLoader, LayerEvent>();

    onLayerAdded = new EventDispatcher<MapControl, LayerEvent>();
    onLayerRemoved = new EventDispatcher<MapControl, LayerEvent>();

    onLayerOrderChanged = new EventDispatcher<any, LayerOrderChangeEvent>();

    onLayerRequest = new EventDispatcher<MapControl, LayerEvent>();

    onLayerReady = new EventDispatcher<LayerLoader, LayerEvent>();

    onLayerError = new EventDispatcher<LayerLoader, LayerEvent>();

    onShowLayerInfoRequest = new EventDispatcher<any, LayerWrapper>();
}

export const MapDispatcher = new Dispatcher();

const LayerInfoAttr: Array<{ attrName: string; attrLabel: string }> = [
    { attrName: "contactPersonName", attrLabel: "Ansprechpartner:" },
    { attrName: "contactEMail", attrLabel: "E-Mail:" },
    { attrName: "contactPhon", attrLabel: "Tel:" },
    { attrName: "actuality", attrLabel: "Aktualität:" },
    { attrName: "actualityCircle", attrLabel: "Aktualisierungszyklus:" },
];

export class MapControl extends L.Control {
    map: L.Map;
    dom: HTMLElement;
    baseLayerCtrl: LayerControl | BaseLayerSelectorCtrl;
    categorieLayerCtrl: LayerControl | LayerControlVar;

    searchFct: (s: string) => Promise<any[]>;
    resetMap: () => void;
    searchfieldplaceholder: string;

    closed: boolean = true;
    categorieLayers: { [id: string]: CategorieLayer<any, any> } = {};

    viewCtrl: ViewControl;
    topDiv: HTMLElement;

    searchBox: HTMLInputElement;
    isMenuOpen: boolean;

    foundArea: L.GeoJSON<any>;

    baseLayer: L.Layer;

    selectedItem: { featureLayer: InteractiveLayer; feature: CategoryMapObject<any> };

    parentNode: HTMLElement;

    layerOnMapList: LayerWrapper[] = [];

    mapCtrlContentContainer: HTMLDivElement;
    _sidebarClosed: boolean;
    currZoomClass: string;
    searchCtrl: SearchControl;

    constructor(options: MenuControlOptions) {
        super(options);

        if (options.parentNode) {
            this.parentNode = options.parentNode;
            options.parentNode.classList.add("mapctrl_parent");
            this.categorieLayerCtrl = new LayerControlVar({ parentNode: options.parentNode });
            this.baseLayerCtrl = new BaseLayerSelectorCtrl({ position: "bottomright" });

            const container = (this.mapCtrlContentContainer = document.createElement("div"));
            container.className = "mapctrl_content";
        } else {
            this.categorieLayerCtrl = new LayerControl({ position: "topleft" });
            this.baseLayerCtrl = new LayerControl({
                position: "topleft",
                className: "flex-no-shrink",
            });
        }

        this.searchFct = options.searchFct;
        this.resetMap = options.resetMap;
        this.searchfieldplaceholder = options.searchfieldplaceholder;
        this._subscribe();
    }
    private _subscribe() {
        MapDispatcher.onMapFeatureClick.subscribe((sender, evt) => this.onMapFeatureClick(sender, evt));

        MapDispatcher.onBaseLayerSelection.subscribe((sender, layer) => this.onBaseLayerSelection(sender, layer));
        MapDispatcher.onThemeLayerSelection.subscribe((sender, layerSelectEvt) => this.onThemeLayerSelection(sender, layerSelectEvt));

        MapDispatcher.onLayerReady.subscribe((sender, evt) => this.onLayerReady(sender, evt));

        MapDispatcher.onViewRemove.subscribe((sender, evt) => this.onViewRemove(sender, evt));

        MapDispatcher.onShowLayerInfoRequest.subscribe((sender, layerDescr) => this.onShowLayerInfoRequest(sender, layerDescr));
    }

    addCategorieLayer(categorieLayer: CategorieLayer<any, any>, showAll: boolean) {
        categorieLayer.once("CategoriesLoaded", (evt) => {
            this.categorieLayerCtrl.addCategorieLayer("Kategories", categorieLayer, showAll);
            this.map.addLayer(categorieLayer);
        });
        categorieLayer.loadCategories();
        this.categorieLayers["Kategories"] = categorieLayer;
    }
    itemSelected(ev: L.LeafletEvent): void {
        const layer: CategorieLayer<any, any> = ev.target;
        const marker: CategoryMapObject<any> = (<any>ev).marker;
        this.showData(layer, marker);
    }
    itemUnselected(ev: L.LeafletEvent): void {
        this.viewCtrl.goBack();
    }

    setContentView(v: View, replace: boolean): void {
        this.viewCtrl.setContentView(v, replace);
    }

    onShowLayerInfoRequest(sender: any, layer: LayerWrapper): void {
        console.info("onShowLayerInfoRequest", sender, layer);
        const self = this;
        const v: View = {
            getDom: function () {
                console.info("getDom", this);
                if (!this.dom) {
                    const d = (this.dom = document.createElement("div"));
                    d.className = "layerinfo";
                    if (layer.layerDescription.label) {
                        createHtmlElement("span", d, "layerinfo-title", {
                            innerText: layer.layerDescription.label,
                        });
                    }
                    if (layer.loadError) {
                        const txt = layer.layerDescription.type === "WMS" ? "Beim Zugriff auf den externen Dienst ist ein Fehler aufgetreten. Versuchen Sie es später erneut." : "Beim Laden des Themas ist ein Fehler aufgetreten. Versuchen Sie es später erneut.";
                        createHtmlElement("span", d, "layerinfo-error", {
                            innerText: txt,
                        });
                    }
                    const layerDescr = layer.layerDescription;
                    if (layerDescr.abstract) {
                        createHtmlElement("span", d, "layerinfo-subtitle", {
                            innerText: "Beschreibung:",
                        });
                        createHtmlElement("span", d, "layerinfo-text", {
                            innerText: layerDescr.abstract,
                        });
                    }
                    if (layerDescr.contactOrganisation) {
                        createHtmlElement("span", d, "layerinfo-subtitle", {
                            innerText: "Quelle:",
                        });
                        createHtmlElement("span", d, "layerinfo-text", {
                            innerText: layerDescr.contactOrganisation,
                        });
                    }
                    for (let i = 0, count = LayerInfoAttr.length; i < count; i++) {
                        const layerInfoAttr = LayerInfoAttr[i];
                        if (layerDescr[layerInfoAttr.attrName]) {
                            const p = createHtmlElement("p", d, "layerinfo-row");
                            createHtmlElement("span", p, "layerinfo-row-head", {
                                innerText: layerInfoAttr.attrLabel,
                            });
                            createHtmlElement("span", p, "layerinfo-row-content", {
                                innerText: layerDescr[layerInfoAttr.attrName],
                            });
                        }
                    }

                    let txt: string;
                    let f: (evt: MouseEvent) => void;
                    const vc = this.viewCtc;
                    if (layer.isSelected) {
                        txt = "ausblenden";
                        f = (evt) => {
                            layer.setSelected(false);
                            //  MapDispatcher.onThemeLayerSelection.dispatch(layer, {type:'removed-from-map', layer:layer})
                            self.viewCtrl.goBack();
                        };
                    } else {
                        txt = "einblenden";
                        f = (evt) => {
                            layer.setSelected(true);
                            self.viewCtrl.goBack();
                            // MapDispatcher.onThemeLayerSelection.dispatch(layer, {type:'select', layer:layer})
                        };
                    }
                    const bttnDiv = createHtmlElement("div", d);
                    const bttn = createHtmlElement("button", bttnDiv);
                    bttn.addEventListener("click", f);
                    bttn.innerText = txt;
                }
                return this.dom;
            },
        };
        this.showView(v);
    }

    onViewRemove(sender: ViewControl, view: View): void {
        console.info("onViewRemove", sender, view);
        if (view && view instanceof MarkerView) {
            if (view.layer?.highlightMarker) {
                view.layer.highlightMarker(view.marker, false);
                if (this.selectedItem && this.selectedItem.feature === view.marker) {
                    this.selectedItem = undefined;
                }
            }
        }
        if (this.parentNode) {
            this.map.removeControl(this.viewCtrl);
            this.map.addControl(this.categorieLayerCtrl);
        }
        if (this._sidebarClosed) {
            document.getElementById("main").classList.add("sidebar-collapsed");
        }
    }

    onMapFeatureClick(sender: any, evt: LeafletMouseEvent) {
        console.info("onMapFeatureClick", evt);
        const layer = evt.propagatedFrom;
        const geoJsonL = evt.target;
        let isOtherItem = true;
        if (this.selectedItem) {
            isOtherItem = this.selectedItem.feature !== layer;
            if (geoJsonL.fctPopup) {
                this.selectedItem.featureLayer.highlightMarker(this.selectedItem.feature, false);
            } else {
                this.viewCtrl.goBack();
            }
        }
        if (isOtherItem) {
            geoJsonL.highlightMarker(layer, true);
            if (geoJsonL.fctPopup) {
                const s = geoJsonL.fctPopup(layer.feature.properties);
                const popup = L.popup().setContent(s).setLatLng(evt.latlng).openOn(geoJsonL._map);
                popup.once("remove", (evt) => {
                    geoJsonL.highlightMarker(layer, false);
                });
            } else {
                this.showData(geoJsonL, layer);
            }
            this.selectedItem = { featureLayer: geoJsonL, feature: layer };
        }
    }

    onBaseLayerSelection(sender: LayerControl, nBaseLayer: L.Layer): void {
        // console.info("onBaseLayerSelection", sender, nBaseLayer);
        if (this.baseLayer) {
            if (this.baseLayer === nBaseLayer) {
                return;
            }
            this.baseLayer.remove();
        }
        if (this.map) {
            // console.info("baseLayerChanged new", nBaseLayer);
            // console.info("before addLayer", nBaseLayer);
            (<any>nBaseLayer).setZIndex(0);
            this.map.addLayer(nBaseLayer);
            // console.info("layer added", nBaseLayer);
            this.baseLayer = nBaseLayer;
        }
    }

    addOverlayToMap(lw: LayerWrapper): void {
        console.info("MapControl.addOverlayToMap");

        lw.idx = this.layerOnMapList.length;
        this.layerOnMapList.push(lw);

        if (lw.layerDescription.minScale || lw.layerDescription.maxScale) {
            console.debug("jshsdhidhakdhaks");

            const minScale = lw.layerDescription.minScale || 0;
            const maxScale = lw.layerDescription.maxScale || 20000000;

            const f = (ev) => {
                const zoomL = ev.target.getZoom();
                const currScale = SCALES[zoomL];
                if (currScale <= minScale || currScale >= maxScale) {
                    if (lw["visible"]) {
                        lw["visible"] = false;
                        this.map.removeLayer(lw.layer);
                    }
                } else {
                    if (!lw["visible"]) {
                        lw["visible"] = true;
                        this.map.addLayer(lw.layer);
                    }
                }
            };
            lw["zoomFct"] = f;
            this.map.on("zoom", f);

            const currScale = SCALES[this.map.getZoom()];
            if (currScale >= minScale && currScale <= maxScale) {
                this.map.addLayer(lw.layer);
                lw["visible"] = true;
            } else {
                lw["visible"] = false;
            }
        } else {
            this.map.addLayer(lw.layer);
        }

        MapDispatcher.onLayerAdded.dispatch(this, {
            type: "added-to-map",
            layer: lw,
        });
        // this.printLayerInfo();
    }

    onLayerReady(sender: LayerLoader, evt: LayerEvent): void {
        console.info("MapControl.onLayerReady");
        if (evt.layer.isSelected) {
            this.addOverlayToMap(evt.layer);
        }
    }

    removeLayerFromMap(lw: LayerWrapper) {
        this.map.removeLayer(lw.layer);
        if (lw["zoomFct"]) {
            this.map.off("zoom", lw["zoomFct"]);
        }
        MapDispatcher.onLayerRemoved.dispatch(this, {
            type: "removed-from-map",
            layer: lw,
        });
        const arr: LayerWrapper[] = [];
        for (let i = 0; i < this.layerOnMapList.length; i++) {
            if (lw !== this.layerOnMapList[i]) {
                this.layerOnMapList[i].idx = arr.length;
                arr.push(this.layerOnMapList[i]);
            }
        }
        lw.idx = -1;
        this.layerOnMapList = arr;
        // this.printLayerInfo();
    }

    // printLayerInfo() {
    //     console.error('printLayerInfo');
    //     this.map.eachLayer(item => {
    //         console.warn(item);
    //     })
    //     console.error('printLayerInfo2');
    //     this.layerOnMapList.forEach(item => {
    //         console.warn(item);
    //     })
    // }

    onThemeLayerSelection(sender: LayerWrapper, evt: LayerEvent): void {
        // console.error("onThemeLayerSelection", evt);
        if (this.map) {
            if (evt.layer.isSelected) {
                try {
                    if (evt.layer && evt.layer.layer) {
                        this.addOverlayToMap(evt.layer);
                    } else {
                        MapDispatcher.onLayerRequest.dispatch(this, {
                            type: "request-layer",
                            layer: evt.layer,
                        });
                    }
                } catch (ex) {
                    console.info(`error adding layer "${evt.layer.layerDescription.label}"`, ex);
                }
            } else {
                if (evt.layer.layer) {
                    this.removeLayerFromMap(evt.layer);
                }
            }
        }
    }

    showView(view: View) {
        if (this.parentNode) {
            console.info("MapCtrl.showData");
            this.categorieLayerCtrl.remove();
            this.map.addControl(this.viewCtrl);
        } else {
            this.closeMenu();
        }
        this.viewCtrl.setContentView(view, true);
        if (document.getElementById("main")?.classList.contains("sidebar-collapsed")) {
            document.getElementById("main").classList.remove("sidebar-collapsed");
            this._sidebarClosed = true;
        } else {
            this._sidebarClosed = false;
        }
    }

    showData(layer: CategorieLayer<any, any> | GeojsonLayer, marker: CategoryMapObject<any> | any) {
        if (layer?.renderData) {
            this.showView(layer.renderData(marker));
        } else {
            if (marker?.feature) {
                this.showView(new MarkerView(layer, marker));
            } else {
                console.info(layer, marker);
            }
        }
    }

    addTo(map: L.Map): this {
        // console.error("MapControl.addTo", this.parentNode);
        if (this.parentNode) {
            this.remove();
            this.map = map;
            const container = ((<any>this)._container = this.onAdd(map));
            this.parentNode.appendChild(container);
            this.map.on("unload", this.remove, this);
            this.map.addControl(this.baseLayerCtrl);
            this.map.addControl(this.categorieLayerCtrl);
            // this.map.addControl(this.baseLayerCtrl2);
            this.parentNode.appendChild(this.mapCtrlContentContainer);
            // this.parentNode.appendChild(this.layCtrlContainer);
            // this.parentNode.appendChild(this.viewCtrlContainer);
            // this.viewCtrlContainer.style.display = 'none';
            return this;
        } else {
            // return super.addTo(map);
            super.addTo(map);
            this.searchBox.focus();
            map.addControl(this.viewCtrl);
            return this;
        }
    }

    onAdd(map: L.Map): HTMLElement {
        console.info("MenuControl.onAdd");
        // MapDispatcher.map = map;
        this.map = map;
        if (!this.dom) {
            const div = createHtmlElement("div", undefined, "mapctrl");
            const divTop = (this.topDiv = createHtmlElement("div", div, "mapctrl-top closed"));
            const searchTop = document.getElementById("searchwrapper");

            if (!this.parentNode) {
                const anchor = createHtmlElement("a", divTop, "menu-button");
                anchor.addEventListener("pointerup", (p) => this._menuClicked(p));
                createHtmlElement("div", anchor);
                const searchWrapper = document.createElement("div");
                L.DomEvent.disableClickPropagation(searchWrapper);
                L.DomEvent.disableScrollPropagation(searchWrapper);
                searchWrapper.className = "search-wrapper";

                if (searchTop) {
                    searchTop.appendChild(searchWrapper);
                } else {
                    divTop.appendChild(searchWrapper);
                }

                const searchBox = (this.searchBox = document.createElement("input"));
                searchWrapper.appendChild(searchBox);
                searchBox.type = "text";
                // searchBox.addEventListener('keyup', (ev)=>this._searchInput(ev));
                searchBox.addEventListener("focusin", (ev) => this._searchFocusIn(ev));
                searchBox.placeholder = "Suche";

                const searchBoxClear = document.createElement("i");
                searchBoxClear.className = "search-input-clear";
                searchWrapper.appendChild(searchBoxClear);
                searchBoxClear.addEventListener("click", (ev) => {
                    searchBox.value = "";
                    this.viewCtrl.clear();
                });

                autocomplete(searchBox, {
                    onSelect: (item: any, input: HTMLInputElement) => this._found(item, input),
                    onSearchStart: (input: HTMLInputElement) => this._searchStart(input),
                    fetch: this.searchFct,
                    minLength: 3,
                    showOnFocus: true,
                    labelAttr: "name",
                });
            } else {
                const searchCtrl = (this.searchCtrl = new SearchControl({
                    onSelect: (item: any, input: HTMLInputElement) => this._found(item, input),
                    onSearchStart: (input: HTMLInputElement) => this._searchStart(input),
                    fetch: this.searchFct,
                    searchfieldplaceholder: this.searchfieldplaceholder,
                    minLength: 3,
                    showOnFocus: true,
                    labelAttr: "name",
                }));
                map.addControl(searchCtrl);
                map.addControl(
                    new IconActionCtrl({
                        position: "topright",
                        className: "home-icon",
                        action: (ctrl) => {
                            this.showHome(ctrl);
                        },
                    })
                );
                map.addControl(
                    new ChangeFontSizeCtrl({
                        position: "topright",
                    })
                );
            }

            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);

            this.dom = div;

            if (this.parentNode) {
                this.viewCtrl = new ViewControl({ parentNode: this.mapCtrlContentContainer });
            } else {
                this.viewCtrl = new ViewControl({ position: "topleft" });
            }
        }

        const currZoomClass = (this.currZoomClass = "zoom" + map.getZoom());
        this.parentNode.classList.add(currZoomClass);
        map.addEventListener("zoomend", (ev) => {
            this.parentNode.classList.remove(this.currZoomClass);
            const currZoomClass = (this.currZoomClass = "zoom" + map.getZoom());
            this.parentNode.classList.add(currZoomClass);
        });

        return this.dom;
    }

    showHome(ctrl: L.Control) {
        console.info("showHome", this);
        document.getElementById("home-overlay").style.display = "";
        if (this.categorieLayerCtrl instanceof LayerControlVar) {
            this.categorieLayerCtrl.clearThemes();
        }
        this.searchCtrl.clearClicked();
        this.viewCtrl.clear();
        if (this.resetMap) {
            this.resetMap();
        }
        this.baseLayerCtrl.selectBaseLayer(0);
    }

    private _searchStart(input: HTMLInputElement): void {
        console.info("_searchStart");
        this.clearResults();
    }
    clearResults() {
        console.info("clearResults");
        this.viewCtrl.clear();
        if (this.categorieLayerCtrl.categorieLayers["Kategories"]) {
            this.categorieLayerCtrl.categorieLayers["Kategories"].removeSearchResults();
        }
        if (this.foundArea) {
            this.foundArea.remove();
            this.foundArea = undefined;
        }
    }

    /* TODO */
    private _found(item: any, input: HTMLInputElement): void {
        console.error("_found", item);

        this.clearResults();

        this.closeMenu();
        if (item?.group === "Thema") {
            MapDispatcher.onShowLayerInfoRequest.dispatch(this, item.layer);
        } else if (item) {
            const geoJ = this.showGeojson(item);
            console.info("found", item);
        }

        // if (item.group==='Kategorie') {
        // } else if (item.group==='Ort') {
        // } else if (item.group==='Einrichtung') {
        //     console.info('_foundEinrichtung', item);
        //     const layer = this.categorieLayerCtrl.categorieLayers["Kategories"];
        //     if (layer) {
        //         const marker = layer.findMarker(item.id, "id");
        //         if (marker) {
        //             this.showData(layer, marker);
        //         }
        //     }
        // } else {
        //     const geoJ = this.showOrtschaft(item);
        //     console.info('found', item);
        //     const catL = this.categorieLayerCtrl.categorieLayers["Kategories"];
        //     catL.findMarkers(item.table, item.id).then(
        //         markers=>{
        //             const view = new MarkerListView(geoJ, catL, markers);
        //             this.setContentView(view);
        //         }
        //     );
        // }
    }

    showGeojson(item: any): L.GeoJSON {
        console.info("showGeojson");
        const geoJ = (this.foundArea = L.geoJSON(item.feature.geometry, {
            style: function (feature) {
                return { color: "#000", dashArray: "10 8", fillColor: "#555" };
            },
        }));
        this.map.addLayer(geoJ);
        this.map.fitBounds(geoJ.getBounds());
        return geoJ;
    }

    private _searchFocusIn(ev: FocusEvent): any {
        console.info("_searchFocusIn", ev);
    }

    private _menuClicked(p: PointerEvent): any {
        console.info("_menuClicked");
        if (this.closed) {
            this.openMenu();
        } else {
            this.closeMenu();
        }
    }

    closeMenu() {
        if (this.isMenuOpen) {
            this.closed = true;
            this.topDiv.classList.replace("opened", "closed");
            this.map.removeControl(this.baseLayerCtrl);
            this.map.removeControl(this.categorieLayerCtrl);
            // this.contentArea.style.display = '';
            this.map.addControl(this.viewCtrl);
            this.isMenuOpen = false;
        }
    }
    openMenu() {
        if (!this.isMenuOpen) {
            this.closed = false;
            this.topDiv.classList.replace("closed", "opened");
            this.map.addControl(this.baseLayerCtrl);
            this.map.addControl(this.categorieLayerCtrl);
            // this.contentArea.style.display = 'none';
            this.map.removeControl(this.viewCtrl);
            this.isMenuOpen = true;
        }
    }

    onRemove(map: L.Map) {
        console.info("MenuControl.onRemove");
        this.map = null;
    }

    setBaseLayers(baseLayers: LayerDescription[], options: { labelAttribute: string }) {
        this.baseLayerCtrl.setBaseLayers(baseLayers, options);
    }
}
