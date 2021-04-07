require('leaflet');
require('@glartek/leaflet.markercluster');

import * as L from 'leaflet';
import { View } from './ViewControl';
import {MapDispatcher} from './MapControl'
import { MarkerView } from './MarkerListView';
// import {MarkerClusterGroup} from "@glartek/leaflet.markercluster";

function createIcon(code:number):L.Icon {
    return <L.Icon>L.divIcon(
        {html: '<i class="afas">'+String.fromCharCode(code)+'</i>', 
        iconSize: new L.Point(20, 20),
        iconAnchor: new L.Point(10,10),
        className: 'mapDivIcon'}
    );
}
function createSelectedIcon(code:number):L.Icon {
    return <L.Icon>L.divIcon(
        {html: '<i class="afas">'+String.fromCharCode(code)+'</i>', 
        iconSize: new L.Point(40, 40),
        iconAnchor: new L.Point(20,20),
        className: 'mapDivIconHighligted'}
    );
}


export interface Category {
    id: any,
    parentId: any,
    bezeichnung: string,
    childs: Category[]
}


export interface CategorieLayerOptions<T extends L.LatLngExpression, N> extends L.MarkerClusterGroupOptions {
    categorieUrl:string,
    url:string,
    selector: CategorieSelector<T, N>,
    popupFactory: PopupCreator<T>;
}

export type Path<T> = T[];

export interface CategorieSelector<T, N> {
    isOfCategory(data:T, katId:Path<N>[]):boolean;
}

export interface PopupCreator<T extends L.LatLngExpression> {
    renderDataView(layer:InteractiveLayer, marker:CategoryMapObject<T>):HTMLElement;
    renderListItem(layer:InteractiveLayer, marker:CategoryMapObject<T>):HTMLElement;
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
    data:T;
    selected:boolean;

    isVisible():boolean;

    setVisible(visible:boolean):void;

    getLatLng():L.LatLng;
}

export class CategoryCircleMarker<T extends L.LatLngExpression> extends L.CircleMarker implements CategoryMapObject<T> {
    visible:boolean=false;

    parentLayer: CategorieLayer<T, any>|InteractiveLayer;
    data: T;
    private _clickClosure: (ev: any) => void;
    selected = false;

    constructor(parentLayer:CategorieLayer<T, any>|InteractiveLayer, data:T, options?:CategoryMarkerOptions) {
        super(data, options);        
        this.data = data;
        this.parentLayer = parentLayer;
    }

    onAdd(map: L.Map):this {     
        this._clickClosure = (ev)=>this.parentLayer.mapItemClicked(this, ev);
        this.on('click', this._clickClosure);       
        return super.onAdd(map);
    }

    onRemove(map: L.Map): this {
        this.unbindPopup();
        if (this._clickClosure) {
            this.off('click', this._clickClosure);
        }
        return super.onRemove(map);
    }

    setVisible(visible:boolean) {
        this.visible=visible;
    }

    isVisible():boolean {
        return this.visible;
    }
 
    highLight(highlight: boolean) {
        console.info('CategoryMarker.highlight ToDo', this.data['id'], highlight);
        // this.selected = highlight;
        // if (highlight) {
        //     this.setIcon((<CategoryMarkerOptions>this.options).selectIcon);
        // } else {
        //     this.setIcon((<CategoryMarkerOptions>this.options).standardIcon);
        // } 
    } 
}

export class CategoryMarker<T extends L.LatLngExpression> extends L.Marker implements CategoryMapObject<T> {

    visible:boolean=false;

    static icon = createIcon(0xf024);
    static selectedIcon = createSelectedIcon(0xf024);

    parentLayer: CategorieLayer<T, any>|InteractiveLayer;
    data: T;
    private _clickClosure: (ev: any) => void;
    selected = false;
    // icon:L.Icon;

    constructor(parentLayer:CategorieLayer<T, any>|InteractiveLayer, data:T, options?:CategoryMarkerOptions) {
        super(data, options);        
        this.data = data;
        this.parentLayer = parentLayer;

        if (!options || !options.icon) {
            this.options['standardIcon'] = CategoryMarker.icon;
            this.setIcon(CategoryMarker.icon);
        }
        if (!options || !options.selectIcon) {
            this.options['selectIcon'] = CategoryMarker.selectedIcon;
        }
    }

    onAdd(map: L.Map):this {     
        // console.info("onAdd", this.data);
        // this.bindPopup(layer=>this.parentLayer.popupFactory.build(<any>layer));
        this._clickClosure = (ev)=>this.parentLayer.mapItemClicked(this, ev);
        this.on('click', this._clickClosure);       
        // this.visible=true;
        return super.onAdd(map);
    }

    

    onRemove(map: L.Map): this {
        // console.info("onRemove", this.data);
        this.unbindPopup();
        if (this._clickClosure) {
            this.off('click', this._clickClosure);
        }
        return super.onRemove(map);
    }

    setVisible(visible:boolean) {
        this.visible=visible;
    }

    isVisible():boolean {
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
    highLight(highlight: boolean) {
        console.info('CategoryMarker.highlight', this.data['id'], highlight);
        this.selected = highlight;
        if (highlight) {
            this.setIcon((<CategoryMarkerOptions>this.options).selectIcon);
        } else {
            this.setIcon((<CategoryMarkerOptions>this.options).standardIcon);
        } 
    } 

    // showDetails(event: Event) {
    //     try {
    //         this.closePopup();
    //         this.poiLayer.showDetails(this.poi);
    //     }
    //     catch (ex) {
    //         console.error(ex)
    //     }
    // }

}

export interface InteractiveLayer {
    
    map?:L.Map;
    popupFactory?:PopupCreator<any>;

    highlightMarker: (marker:CategoryMapObject<any>, highlight:boolean)=>void;
    mapItemClicked:(marker: CategoryMapObject<any>, ev: L.LeafletEvent)=>void;
}

export class GeojsonLayer extends L.MarkerClusterGroup implements InteractiveLayer {

    selectedMarker: CategoryMapObject<any>;

    constructor(options?:L.MarkerClusterGroupOptions) {
        super(options);
    }

    highlightMarker(marker: CategoryMapObject<any>, highlight: boolean) {
        console.error("notImm", marker);
    }
   

    mapItemClicked(marker: CategoryMapObject<any>, ev: L.LeafletEvent): void {
        console.info("mapItemClicked", marker.data['id'], ev); 
        if (marker.selected) {
            MapDispatcher.onItemOnMapUnselection.dispatch(this, marker);
        } else {
            MapDispatcher.onItemOnMapSelection.dispatch(this, marker);
            this.selectedMarker = marker;
        }        
    }

    renderData(marker:CategoryMapObject<any>):View {
        return new MarkerView(this, marker);
    }
}

// export class CategorieLayer<T extends L.LatLngExpression> extends L.LayerGroup {
export class CategorieLayer<T extends L.LatLngExpression, N> extends L.MarkerClusterGroup implements InteractiveLayer {

    categorieUrl:string;
    url:string;

    categories:Category[];

    selectedCategories:Path<N>[];

    data: T;
    selector: CategorieSelector<T, N>;
    popupFactory: PopupCreator<T>;

    markerMap:{ [id: number] : CategoryMapObject<T>; } = {};
    markers:CategoryMapObject<T>[] = []; 
    selectedMarker: CategoryMapObject<T>;
    foundMarkers: CategoryMapObject<T>[]; 
    map: L.Map;
   
    constructor(options?:CategorieLayerOptions<T, N>) {
        super(options);
        this.categorieUrl = options.categorieUrl;
        this.url = options.url;
        this.selector = options.selector;
        this.popupFactory = options.popupFactory;
    }

    loadCategories() {
        window.fetch(this.categorieUrl).then((response)=>{
            response.json().then( data => {
                this.categories = data;
                this.fire("CategoriesLoaded");
                this._loadData();
            })
        });
    }
    private _loadData() {
        window.fetch(this.url).then((response)=>{
            response.json().then( data => {
                this.data = data;
                for (let i=0; i<data.length; i++) {
                    const marker = new CategoryMarker(this, data[i]);
                    this.markers.push(marker);
                    this.markerMap[data[i].id] = marker;
                }
                this._update();
            })
        });
    }

    onAdd(map:L.Map):this {
        super.onAdd(map);
        this.map = map;
        return this;
    }

    private _findMarker(value:any, prop:string) {
        const markers = this.markers;        
        for (let i=0, count=markers.length; i<count; i++) {
            const marker = markers[i];
            if (marker.data[prop]===value) { 
                return marker;
            } 
        }
    }


    async findMarkers(att:string, value:any):Promise<CategoryMapObject<T>[]> {
        const response = await window.fetch(this.url+"/search?"+att+"="+value);
        const data:number[] = await response.json();
        const result:CategoryMapObject<T>[] = [];
        for (let i=0; i<data.length; i++) {
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
            this.foundMarkers.forEach(item=>{this.removeLayer(item)});
            this.foundMarkers = undefined;
        }
    }

    mapItemClicked(marker: CategoryMapObject<T>, ev: L.LeafletEvent): void {
        console.info("mapItemClicked", marker.data['id'], ev); 
        if (marker.selected) {
            MapDispatcher.onItemOnMapUnselection.dispatch(this, marker);
            // this.selectedMarker = undefined;
        } else {
            // if (this.selectedMarker) {
            //     MenuControl.DISPATCHER.onItemOnMapSelection.dispatch(this, undefined);
            //     this.selectedMarker = undefined;
            // }
            MapDispatcher.onItemOnMapSelection.dispatch(this, marker);
            this.selectedMarker = marker;
        }        
    }      
    // mapItemClicked(marker: CategoryMarker<T>, ev: L.LeafletEvent): void {
    //     console.info("mapItemClicked", marker.data['id'], ev); 
    //     const unselect = marker===this.selectedMarker;
    //     if (this.selectedMarker) {
    //         //rtr this._unselectMarker(this.selectedMarker);
    //         MenuControl.DISPATCHER.onItemOnMapSelection.dispatch(this, undefined);
    //         this.selectedMarker = undefined;
    //     }
    //     if (!unselect) {
    //         //rtr this._selectMarker(marker);
    //         this.selectedMarker = marker;
    //         MenuControl.DISPATCHER.onItemOnMapSelection.dispatch(this, marker);
    //     }
        
    // }     


    highlightMarker(marker:CategoryMarker<T>, highlight:boolean) {
        console.info(`highlightMarker ${marker.data['id']} ${highlight}`)
        
        if (highlight) {
            this.removeLayer(marker);            
            console.info('marker.options.pane='+marker.options.pane);
            marker.options["oldPane"] = marker.options.pane;
            marker.options.pane = 'highlightPane';
            this._map.addLayer(marker);
            marker.highLight(highlight);
        } else {            
            this._map.removeLayer(marker);
            const oldPane = marker.options["oldPane"];
            if (oldPane) {
                marker.options.pane = oldPane;
            }
            this.addLayer(marker);
            marker.highLight(highlight);
        }
    }

    // highlightMarkerOld(marker: CategoryMarker<T>) {
    //     if (this.selectedMarker) {
    //         this._map.removeLayer(this.selectedMarker);
    //         this.addLayer(this.selectedMarker);
    //         this.selectedMarker = null;
    //         this.fire("itemunselected", {marker:marker});
    //     }
    //     if (marker) {
    //         // this.selectedMarker = new CategoryMarker<T>(this, marker.data);            
    //         this.selectedMarker = marker;
    //         this.removeLayer(marker);
    //         this._map.addLayer(marker);
    //         // this._map.addLayer(this.selectedMarker);
    //         this.selectedMarker.highLight(true);
    //         if (this._map.getZoom()<12) {
    //             this._map.setZoomAround(marker.getLatLng(), 12);
    //         }
    //         else {
    //             this._map.panTo(marker.getLatLng());
    //         }
    //         // this.fire("itemselected", {marker:marker});
    //     }        
    //     return marker;
    // }

    // _selectMarker(marker: CategoryMarker<T>) {
    //     this.selectedMarker = new CategoryMarker<T>(this, marker.data);            
    //     this._map.addLayer(this.selectedMarker);
    //     this.selectedMarker.highLight(true);
    //     if (this._map.getZoom()<12) {
    //         this._map.setZoomAround(marker.getLatLng(), 12);
    //     } else {
    //         this._map.panTo(marker.getLatLng());
    //     }
    //     this.fire("itemselected", {marker:marker});
    // }

    // unselectMarker(marker: CategoryMarker<T>) {
    //     marker.remove();
    //     this.selectedMarker = undefined;
    //     this.fire("itemunselected", {marker:marker});
    // }

    // _unselectMarker(marker: CategoryMarker<T>) {
    //     marker.remove();
    //     this.fire("itemunselected", {marker:marker});
    // }

    findMarker(value:any, prop:string):CategoryMapObject<T> {
        return this._findMarker(value, prop);
    }

    // selectMarker(value:any, prop:string):CategoryMarker<T> {
    //     console.info("selectMarker");
    //     const marker = this._findMarker(value, prop);
    //     if (this.selectedMarker) {
    //         this.selectedMarker.remove();
    //         this.selectedMarker = null;
    //         this.fire("itemunselected", {marker:marker});
    //     }
    //     if (marker) {
    //         this.selectedMarker = new CategoryMarker<T>(this, marker.data);            
    //         this._map.addLayer(this.selectedMarker);
    //         this.selectedMarker.highLight(true);
    //         if (this._map.getZoom()<12) {
    //             this._map.setZoomAround(marker.getLatLng(), 12);
    //         } else {
    //             this._map.panTo(marker.getLatLng());
    //         }
    //         this.fire("itemselected", {marker:marker});
    //     }        
    //     return marker;
    // }

    showMarker(value:any, prop:string):CategoryMapObject<T> {
        console.info("showMarker");
        const marker = this._findMarker(value, prop);
        if (marker) {
            if (!marker.isVisible()) {
                this.addLayer(marker);
            }
            if (this._map.getZoom()<12) {
                this._map.setZoomAround(marker.getLatLng(), 12);
            } else {
                this._map.panTo(marker.getLatLng());
            }
        }
        return marker;
    }


    renderData(marker:CategoryMapObject<T>):View {
        return new MarkerView(this, marker);
    }

    getItems(path:Path<any>): CategoryMapObject<any>[] {
    
        console.info("_update");
        const selector = this.selector;
        const markers = this.markers;

        const results:CategoryMapObject<T>[] = [];
        for (let i=0, count=markers.length; i<count; i++) {
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

            for (let i=0, count=markers.length; i<count; i++) {
                const marker = markers[i];
                
                if (selector.isOfCategory(marker.data, selectedCats)) {
                    if (!marker.isVisible()) {
                        // console.info(marker.data["id"], selector.isOfCategory(marker.data, this.selectedCategories));
                        this.addLayer(marker);
                        marker.setVisible(true);
                    }
                }
                else {
                    if (marker.isVisible()) {
                        // console.info(marker.data["id"], selector.isOfCategory(marker.data, this.selectedCategories));
                        this.removeLayer(marker);
                        marker.setVisible(false);
                    }
                }
            }
        } else {
            for (let i=0, count=markers.length; i<count; i++) {
                const marker = markers[i];
                if (marker.isVisible()) {
                    this.removeLayer(marker);
                    marker.setVisible(false);
                }
            }
        }
    }

    setKategories(ids:Path<N>[]) {
        this.selectedCategories = ids;        
        this._update();

        
    }
    
    getCategories() {
        return this.categories;
    }


}