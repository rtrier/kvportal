/*
<a class="menu-button" style=""><div class="menu-button-block"></div></a>
*/
import * as L from 'leaflet';
import { EventDispatcher } from 'strongly-typed-events';
import autocomplete from '../util/Autocompleter';
import { createHtmlElement } from '../Util';
import { CategorieLayer, CategoryMapObject, GeojsonLayer, InteractiveLayer } from './CategorieLayer';
import { LayerControl } from './LayerControl';
import { View, ViewControl } from './ViewControl';
import { MarkerListView, MarkerView } from './MarkerListView';
import { Feature } from 'geojson';
import { LayerDescription } from '../conf/MapDescription';
import { LayerLoader } from '../LayerLoader';



export class MenuControlOptions implements L.ControlOptions {
    position?: L.ControlPosition;    
    baseLayerCtrl:LayerControl;
    categorieLayerCtrl:LayerControl;
    // searchFct?: (s: string, cb: (results: any[]) => any)=>void;
    searchFct?: (s: string)=>Promise<any[]>;
}

export type LayerEvent = {
    type: 'select'|'request-layer'|'layer-ready'|'create-start'|'created'|'added-to-map'|'removed-from-map';
    layer: LayerWrapper
    // layer:L.Layer;
    // layerDescription:LayerDescription;
    // isSelected: boolean;
}

export class LayerWrapper {    
    layer:L.Layer;
    layerDescription:LayerDescription;
    isSelected = false;
    isVisible = false;

    constructor(layerDescription:LayerDescription) {        
        this.layerDescription = layerDescription;
    }

    setSelected(selected:boolean):void {
        // console.error(`LayerWrapper.setSelected(${selected})`)
        if (this.isSelected !== selected) {
            this.isSelected = selected;
            MapDispatcher.onThemeLayerSelection.dispatch(this, {
                type:'select', layer:this
            });
        }
    }
}

class Dispatcher {    
    onListViewItemSelection = new EventDispatcher<MarkerListView, CategoryMapObject<any>>();
    // onItemOnMapSelection = new EventDispatcher<CategorieLayer<any, any>| GeojsonLayer, CategoryMapObject<any>>();
    // onItemOnMapUnselection = new EventDispatcher<CategorieLayer<any, any>|GeojsonLayer, CategoryMapObject<any>>();

    // onShowPopup = new EventDispatcher<any, L.LeafletMouseEvent>();
    onViewRemove = new EventDispatcher<ViewControl, View>();

    onMapFeatureClick = new EventDispatcher<any, L.LeafletMouseEvent>();

    onBaseLayerSelection = new EventDispatcher<LayerControl, L.Layer>();
    onThemeLayerSelection = new EventDispatcher<LayerWrapper, LayerEvent>();

    onLayerCreationStart = new EventDispatcher<LayerLoader, LayerEvent>();

    onLayerCreationEnd = new EventDispatcher<LayerLoader, LayerEvent>();

    onLayerAdded = new EventDispatcher<MapControl, LayerEvent>();
    onLayerRemoved = new EventDispatcher<MapControl, LayerEvent>();

    onLayerRequest = new EventDispatcher<MapControl, LayerEvent>();

    onLayerReady = new EventDispatcher<LayerLoader, LayerEvent>();
}



export const MapDispatcher = new Dispatcher();

export class MapControl extends L.Control {

    
    map:L.Map;
    dom: HTMLElement;
    baseLayerCtrl:LayerControl;
    categorieLayerCtrl:LayerControl;

    // searchFct: (s: string, cb: (results: any[]) => any)=>void;
    searchFct: (s: string)=>Promise<any[]>;

    closed:boolean = true;
    categorieLayers: { [id: string] : CategorieLayer<any, any>; } = {};

    viewCtrl: ViewControl;
    topDiv: HTMLElement;

    searchBox: HTMLInputElement;
    isMenuOpen: boolean;

    foundArea: L.GeoJSON<any>;

    baseLayer: L.Layer;

    selectedItem:{featureLayer:InteractiveLayer, feature:CategoryMapObject<any>};

    constructor(options:MenuControlOptions) {
        super(options);
        this.baseLayerCtrl=options.baseLayerCtrl;
        this.categorieLayerCtrl=options.categorieLayerCtrl;        
        this.searchFct = options.searchFct;
        this._subscribe();
    }
    private _subscribe() { 
        // MapDispatcher.onItemOnMapSelection.subscribe((sender, item)=>this.onItemOnMapSelection(sender, item));
        // MapDispatcher.onItemOnMapUnselection.subscribe((sender, item)=>this.onItemOnMapUnselection(sender, item));

        MapDispatcher.onMapFeatureClick.subscribe((sender, evt)=>this.onMapFeatureClick(sender, evt));

        MapDispatcher.onBaseLayerSelection.subscribe((sender, layer)=>this.onBaseLayerSelection(sender, layer));
        MapDispatcher.onThemeLayerSelection.subscribe((sender, layerSelectEvt)=>this.onThemeLayerSelection(sender, layerSelectEvt));

        MapDispatcher.onLayerReady.subscribe((sender, evt)=>this.onLayerReady(sender, evt));

        MapDispatcher.onViewRemove.subscribe((sender, evt)=>this.onViewRemove(sender, evt));

        // MapDispatcher.onShowPopup.subscribe((sender, evt)=>this._showPopup(evt));
    }


    addCategorieLayer(categorieLayer:CategorieLayer<any, any>, showAll:boolean) {
        categorieLayer.once("CategoriesLoaded", (evt)=>{
            console.info('App CategoriesLoaded', categorieLayer);
            this.categorieLayerCtrl.addCategorieLayer("Kategories", categorieLayer, showAll);
            this.map.addLayer(categorieLayer);
        });
        categorieLayer.loadCategories();
        this.categorieLayers["Kategories"] = categorieLayer;   
        // categorieLayer.on('itemselected', (ev)=>this.itemSelected(ev));     
        // categorieLayer.on('itemunselected', (ev)=>this.itemUnselected(ev));
    }
    itemSelected(ev: L.LeafletEvent): void {
        console.info("MenuCtrl.itemSelected", ev);
        const layer:CategorieLayer<any, any> = ev.target;
        const marker:CategoryMapObject<any> = (<any>ev).marker;
        this.showData(layer, marker);        
    }
    itemUnselected(ev: L.LeafletEvent): void {
        console.info("itemUnselected", ev);
        this.viewCtrl.goBack();
    }    

    setContentView(v:View):void {
        this.viewCtrl.setContentView(v);        
    }

    onViewRemove(sender: ViewControl, view: View): void {
        console.info('onViewRemove', sender, view);
        if (view && view instanceof MarkerView) {
            if (view.layer?.highlightMarker) {
                view.layer.highlightMarker(view.marker, false);
                if (this.selectedItem && this.selectedItem.feature === view.marker) {
                    this.selectedItem = undefined;
                }
            }
        }        
    }
    
    onMapFeatureClick(sender:any, evt:L.LeafletMouseEvent) {       
        console.info('onMapFeatureClick', evt);
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
                popup.once('remove', (evt)=>{
                    geoJsonL.highlightMarker(layer, false);
                });                
            } else {
                this.showData(geoJsonL, layer);   
            }
            this.selectedItem = {featureLayer:geoJsonL, feature:layer};
        }
    }

    onBaseLayerSelection(sender:LayerControl, nBaseLayer: L.Layer): void {
        console.info('onBaseLayerSelection', sender, nBaseLayer);
        if (this.baseLayer) { 
            if (this.baseLayer===nBaseLayer) {
                return;
            }          
            this.baseLayer.remove();
        }
        if (this.map) {
            console.info('baseLayerChanged new', nBaseLayer);
            console.info("before addLayer", nBaseLayer);
            this.map.addLayer(nBaseLayer);
            console.info("layer added", nBaseLayer);
            this.baseLayer = nBaseLayer;
        } else {
            console.info('baseLayerChanged map==null');
        }


    }

    onLayerReady(sender:LayerLoader, evt: LayerEvent):void {
        console.info('onLayerReady', evt);
        if (evt.layer.isSelected) {
            this.map.addLayer(evt.layer.layer);
            MapDispatcher.onLayerAdded.dispatch(this, {
                type : 'added-to-map',                
                layer: evt.layer
            });
        }
    }    

    onThemeLayerSelection(sender:LayerWrapper, evt: LayerEvent):void {
        console.info("onThemeLayerSelection", evt);
        if (this.map) {
            if (evt.layer.isSelected) {
                try {
                    if (evt.layer && evt.layer.layer) {
                        this.map.addLayer(evt.layer.layer);
                        MapDispatcher.onLayerAdded.dispatch(this, {
                            type: 'added-to-map',
                            layer: evt.layer
                        });
                    } else {
                        MapDispatcher.onLayerRequest.dispatch(this, {
                            type: 'request-layer',
                            layer: evt.layer
                        });
                    }
                } catch (ex) {
                    console.info(`error adding layer "${evt.layer.layerDescription.label}"`, ex);
                }
            } else {
                if (evt.layer.layer) {
                    this.map.removeLayer(evt.layer.layer);
                    MapDispatcher.onLayerRemoved.dispatch(this, {
                        type: 'removed-from-map',
                        layer: evt.layer
                    });
                }
            }
        }
    }

    showData(layer: CategorieLayer<any, any>|GeojsonLayer, marker: CategoryMapObject<any>|any) {
        this.closeMenu();
        if (layer?.renderData) {
            this.viewCtrl.setContentView(layer.renderData(marker));
        } else {
            if (marker?.feature) {
                this.viewCtrl.setContentView(new MarkerView(layer, marker));
            } else {
                console.info(layer, marker);
            }
        }
    }

    addTo(map:L.Map):this {
        super.addTo(map);
        this.searchBox.focus();
        map.addControl(this.viewCtrl);
        return this;
    }


    onAdd(map:L.Map):HTMLElement	{
        console.info("MenuControl.onAdd");
        this.map = map;
        if (!this.dom) {
            const div = createHtmlElement('div', undefined, "mapctrl");
            const divTop = this.topDiv = createHtmlElement('div', div, "mapctrl-top closed");
            const anchor = createHtmlElement('a', divTop, 'menu-button');
            anchor.addEventListener('pointerup', (p)=>this._menuClicked(p));
            createHtmlElement('div', anchor);

            const searchWrapper = document.createElement('div');
            L.DomEvent.disableClickPropagation(searchWrapper);
            L.DomEvent.disableScrollPropagation(searchWrapper);
            searchWrapper.className = 'search-wrapper';
            divTop.appendChild(searchWrapper);

            const searchBox = this.searchBox = document.createElement('input');
            searchWrapper.appendChild(searchBox);
            searchBox.type = 'text';
            // searchBox.addEventListener('keyup', (ev)=>this._searchInput(ev));
            searchBox.addEventListener('focusin', (ev)=>this._searchFocusIn(ev));
            searchBox.placeholder = 'Suche';

            const searchBoxClear = document.createElement('i');
            searchBoxClear.className = 'search-input-clear';
            searchWrapper.appendChild(searchBoxClear);
            searchBoxClear.addEventListener('click', (ev)=>{
                searchBox.value = '';
                this.viewCtrl.clear();
            });

            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);

            // div.addEventListener("pointermove", (ev)=>{
            //     ev.stopPropagation();
            //     return true;
            // }); 
            // div.addEventListener("dblclick", (ev)=>{
            //     console.info("click");
            //     ev.cancelBubble = true;
            //     ev.stopPropagation();               
            //     return true;
            // });
            // div.addEventListener("click", (ev)=>{
            //     console.info("click");
            //     ev.cancelBubble = true;
            //     ev.stopPropagation();               
            //     return true;
            // });
            // div.addEventListener("mouseup", (ev)=>{
            //     console.info("mouseup");
            //     ev.stopPropagation();               
            //     return true;
            // });
            // div.addEventListener("pointerup", (ev)=>{
            //     console.info("pointerup");
            //     ev.stopPropagation();               
            //     return true;
            // });
            // div.addEventListener("wheel", (ev)=>{
            //     ev.stopPropagation();
            //     return true;
            // }); 
            this.dom = div;

            this.viewCtrl = new ViewControl({position: 'topleft'});
            // const content = this.contentArea = document.createElement('div');
            // content.className = 'mapctrl-content';
            // this.dom.appendChild(content);


            autocomplete(searchBox, {
                onSelect: (item: any, input: HTMLInputElement) => this._found(item, input),
                onSearchStart: (input: HTMLInputElement)=>this._searchStart(input),
                fetch : this.searchFct,
                minLength : 3,
                showOnFocus: true,
                labelAttr : 'name'
            });

            // map.on('layeradd', (evt)=>this.onLayerAdded(evt));
            // map.on('layerremove', (evt)=>this.onLayerRemoved(evt));
            
        }
         
        return this.dom;
    }
    // onLayerAdded(evt: L.LeafletEvent): void {
        
    //     console.info("onLayerAdded", evt);
    // }
    // onLayerRemoved(evt: L.LeafletEvent): void {
    //     if (this.selectedItem?.popup) {            
    //         console.info("onLayerRemoved popup", evt);
    //         console.info("onLayerRemoved popup", this.selectedItem.popup);
    //         // this.selectedItem.featureLayer.highlightMarker(this.selectedItem.feature, false);
    //         this.selectedItem = undefined;
    //     } else {
    //         console.info("onLayerRemoved", evt);
    //     }
    // }

    private _searchStart(input: HTMLInputElement): void {
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
        this.closeMenu();
        const geoJ = this.showGeojson(item);
        console.info("found", item);

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
    



    showGeojson(item: any):L.GeoJSON {        
        const geoJ = this.foundArea = L.geoJSON(item.feature.geometry, {
            style: function (feature) {
                return {color: '#888888', dashArray: '10 8', fillColor:'#555555'};
            }});
        this.map.addLayer(geoJ);
        this.map.fitBounds(geoJ.getBounds());
        return geoJ;
    }
    
    private _searchFocusIn(ev: FocusEvent): any {
        console.info('_searchFocusIn', ev);

    }
    
    private _menuClicked(p: PointerEvent): any {
        console.info('_menuClicked');       
        if (this.closed) {
            this.openMenu();
        } else {
           this.closeMenu();            
        }
    }

    closeMenu() {
        if (this.isMenuOpen) {
            this.closed = true;
            this.topDiv.classList.replace('opened', 'closed');            
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
            this.topDiv.classList.replace('closed', 'opened');
            this.map.addControl(this.baseLayerCtrl);
            this.map.addControl(this.categorieLayerCtrl);
            // this.contentArea.style.display = 'none';
            this.map.removeControl(this.viewCtrl);
            this.isMenuOpen = true;
        }
    }

    onRemove(map:L.Map){
        console.info("MenuControl.onRemove");
        this.map = null;
    }
}