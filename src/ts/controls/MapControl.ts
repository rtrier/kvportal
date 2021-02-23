/*
<a class="menu-button" style=""><div class="menu-button-block"></div></a>
*/
import * as L from 'leaflet';
import { EventDispatcher } from 'strongly-typed-events';
import autocomplete from '../util/Autocompleter';
import { createHtmlElement } from '../Util';
import { CategorieLayer, CategoryMarker, GeojsonLayer } from './CategorieLayer';
import { LayerControl } from './LayerControl';
import { View, ViewControl } from './ViewControl';
import { MarkerListView } from './MarkerListView';
import { Feature } from 'geojson';
import { LayerDescription } from '../conf/MapDescription';



export class MenuControlOptions implements L.ControlOptions {
    position?: L.ControlPosition;    
    baseLayerCtrl:LayerControl;
    categorieLayerCtrl:LayerControl;
    searchFct?: (s: string, cb: (results: any[]) => any)=>void;
}

export type LayerSelectionEvent = {
    layer:L.Layer;
    layerDescription:LayerDescription;
    isSelected: boolean;
}

class Dispatcher {    
    onListViewItemSelection = new EventDispatcher<MarkerListView, CategoryMarker<any>>();
    onItemOnMapSelection = new EventDispatcher<CategorieLayer<any, any>| GeojsonLayer, CategoryMarker<any>>();
    onItemOnMapUnselection = new EventDispatcher<CategorieLayer<any, any>|GeojsonLayer, CategoryMarker<any>>();

    onBaseLayerSelection = new EventDispatcher<LayerControl, L.Layer>();
    onThemeLayerSelection = new EventDispatcher<LayerControl, LayerSelectionEvent>();
}

export const MapDispatcher = new Dispatcher();

export class MenuControl extends L.Control {

    
    map:L.Map;
    dom: HTMLElement;
    baseLayerCtrl:LayerControl;
    categorieLayerCtrl:LayerControl;

    searchFct: (s: string, cb: (results: any[]) => any)=>void;

    closed:boolean = true;
    categorieLayers: { [id: string] : CategorieLayer<any, any>; } = {};

    viewCtrl: ViewControl;
    topDiv: HTMLElement;

    
    searchBox: HTMLInputElement;
    isMenuOpen: boolean;

    foundArea: L.GeoJSON<any>;
    selectedMarker: any;

    baseLayer: L.Layer;

    constructor(options:MenuControlOptions) {
        super(options);
        this.baseLayerCtrl=options.baseLayerCtrl;
        this.categorieLayerCtrl=options.categorieLayerCtrl;        
        this.searchFct = options.searchFct;
        this._subscribe();
    }
    private _subscribe() {
        console.info("subs onListViewItemSelection");
        MapDispatcher.onItemOnMapSelection.subscribe((sender, item)=>this.onItemOnMapSelection(sender, item));
        MapDispatcher.onItemOnMapUnselection.subscribe((sender, item)=>this.onItemOnMapUnselection(sender, item));

        MapDispatcher.onBaseLayerSelection.subscribe((sender, layer)=>this.onBaseLayerSelection(sender, layer));
        MapDispatcher.onThemeLayerSelection.subscribe((sender, layerSelectEvt)=>this.onThemeLayerSelection(sender, layerSelectEvt));
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
        const marker:CategoryMarker<any> = (<any>ev).marker;
        this.showData(layer, marker);        
    }
    itemUnselected(ev: L.LeafletEvent): void {
        console.info("itemUnselected", ev);
        this.viewCtrl.goBack();
    }    

    setContentView(v:View):void {
        this.viewCtrl.setContentView(v);        
    }
    

    onItemOnMapSelection(sender: CategorieLayer<any, any>|GeojsonLayer, item: CategoryMarker<any>): void {
        console.info('onItemOnMapSelection', sender, item, typeof item);

        if (this.selectedMarker) {
            this.onItemOnMapUnselection(sender, this.selectedMarker)
        }
        if (item) {
            this.showData(sender, item);
            this.selectedMarker = item;    
        } else {
            this.viewCtrl.goBack();
        }
    }  

    onItemOnMapUnselection(sender: CategorieLayer<any, any>|GeojsonLayer, item: CategoryMarker<any>): void {
        console.info('onItemOnMapUnSelection', sender, item);
        this.viewCtrl.goBack();
        this.selectedMarker = undefined;
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

    onThemeLayerSelection(sender:LayerControl, evt: LayerSelectionEvent):void {
        console.info("", evt);
        if (this.map) {
            if (evt.isSelected) {
                try {
                    this.map.addLayer(evt.layer);
                } catch (ex) {
                    console.info(`error adding layer "${evt.layerDescription.label}"`, ex);
                }
            } else {
                this.map.removeLayer(evt.layer);
            }
        }
    }

    showData(layer: CategorieLayer<any, any>|GeojsonLayer, marker: CategoryMarker<any>) {
        this.closeMenu();
        this.viewCtrl.setContentView(layer.renderData(marker));
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

            div.addEventListener("pointermove", (ev)=>{
                ev.stopPropagation();
                return true;
            }); 
            div.addEventListener("dblclick", (ev)=>{
                console.info("click");
                ev.cancelBubble = true;
                ev.stopPropagation();               
                return true;
            });
            div.addEventListener("click", (ev)=>{
                console.info("click");
                ev.cancelBubble = true;
                ev.stopPropagation();               
                return true;
            });
            div.addEventListener("mouseup", (ev)=>{
                console.info("mouseup");
                ev.stopPropagation();               
                return true;
            });
            div.addEventListener("pointerup", (ev)=>{
                console.info("pointerup");
                ev.stopPropagation();               
                return true;
            });
            div.addEventListener("wheel", (ev)=>{
                ev.stopPropagation();
                return true;
            }); 
            this.dom = div;

            this.viewCtrl = new ViewControl({position: 'topleft'});
            // const content = this.contentArea = document.createElement('div');
            // content.className = 'mapctrl-content';
            // this.dom.appendChild(content);


            autocomplete(searchBox, {
                onSelect: (item: any, input: HTMLInputElement) => this._found(item, input),
                onSearchStart: (input: HTMLInputElement)=>this._searchStart(input),
                fetch : this.searchFct,
                showOnFocus: true,
                labelAttr : 'bezeichnung'
            });
            
        }
         
        return this.dom;
    }
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
        if (item.group==='Kategorie') {            
        } else if (item.group==='Ort') {            
        } else if (item.group==='Einrichtung') {
            console.info('_foundEinrichtung', item); 
            const layer = this.categorieLayerCtrl.categorieLayers["Kategories"];
            if (layer) {
                const marker = layer.findMarker(item.id, "id");
                if (marker) {
                    this.showData(layer, marker);
                }
            }
        } else {
            const geoJ = this.showOrtschaft(item);
            console.info('found', item);
            const catL = this.categorieLayerCtrl.categorieLayers["Kategories"];
            catL.findMarkers(item.table, item.id).then(
                markers=>{
                    const view = new MarkerListView(geoJ, catL, markers);
                    this.setContentView(view);
                }
            );
        } 
    }
    



    showOrtschaft(item: any):L.GeoJSON {
        console.info("showOrtschaft", item);
        const geoJ = this.foundArea = L.geoJSON(item.geom, {
            style: function (feature) {
                return {color: '#888888', dashArray: '10 8', fillColor:'#555555'};
            }});
        this.map.addLayer(geoJ);
        console.info(geoJ.getBounds());
        console.info(this.map.getBounds());
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