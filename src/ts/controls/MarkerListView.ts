import { CategorieLayer, CategoryMapObject, InteractiveLayer } from "./CategorieLayer";
import { MapDispatcher } from "./MapControl";
import { View, ViewControl } from "./ViewControl";
import { createHtmlElement, createRow } from '../Util';
import { LayerDescription } from "../conf/MapDescription";


export type ListEntry<T> = {
    item: T;
    dom: HTMLElement;
}



export class MarkerView implements View {

    layer: InteractiveLayer;
    marker: CategoryMapObject<any>;

    dom: HTMLElement;

    constructor(layer: InteractiveLayer, marker: CategoryMapObject<any>) {
        console.info("Markerview create");
        this.layer = layer;
        this.marker = marker;
    }

    getTitle() {
        return this.layer["LayerDescription"]?.label;
    }

    getDom() {
        if (!this.dom) {
            if (this.layer?.popupFactory) {
                this.dom = this.layer.popupFactory.renderDataView(this.layer, this.marker);
            }
            else {
                this.dom = this.renderDataView();
            }
        }
        return this.dom;
    }

    renderDataView() {
        console.info('renderdataView', this);
        const dom = createHtmlElement('div', undefined, "data-view");
        const table = createHtmlElement('table', dom);

        const data = this.marker.data ? this.marker.data : (<any>this.marker)?.feature?.properties;

        const layerDes: LayerDescription = this.layer["LayerDescription"];
        if (layerDes?.layerAttributes) {
            for (let k in layerDes.layerAttributes) {
                const v = data[k];
                if (v || !layerDes.hideEmptyLayerAttributes) {
                    createRow(layerDes.layerAttributes[k], v, table);
                }
            }
        } else {
            for (let k in data) {
                createRow(k, data[k], table);
            }
        }
        return dom;
    }

}

export class MarkerListView implements View {
    layer: CategorieLayer<any, any>;
    markers: CategoryMapObject<any>[];
    selectedListEntry: ListEntry<any>;
    dom: HTMLDivElement;
    geoJson: L.GeoJSON<any>;

    constructor(geoJ: L.GeoJSON, layer: CategorieLayer<any, any>, markers: CategoryMapObject<any>[]) {
        console.info("MarkerListiew");
        this.layer = layer;
        this.markers = markers;
        this.geoJson = geoJ;
    }

    getDom(): HTMLElement {
        if (!this.dom) {
            const divList = document.createElement('div');
            divList.className = 'list-item-view';
            const markers = this.markers;
            const pop = this.layer.popupFactory;

            if (markers && markers.length > 0) {
                markers.forEach(marker => {
                    const itemDom = pop.renderListItem(this.layer, marker)
                    divList.appendChild(itemDom);
                    itemDom.className = 'list-item';
                    itemDom.addEventListener('click', (ev) => this.listEntryClicked({ dom: <HTMLElement>ev.target, item: marker }));
                });
            }
            else {
                createHtmlElement("p", divList).innerHTML = "Es wurde nichts gefunden";
            }
            this.dom = divList;
        }
        return this.dom;
    }

    listEntryClicked(entry: ListEntry<any>): any {
        if (this.selectedListEntry) {
            this.selectedListEntry.dom.classList.remove('selected');
            if (this.selectedListEntry === entry) {
                this.selectedListEntry = undefined;
                MapDispatcher.onListViewItemSelection.dispatch(this, undefined);
            }
        }
        this.selectedListEntry = entry;
        MapDispatcher.onListViewItemSelection.dispatch(this, entry.item);
        console.info('listEntryClicked', entry);
    }


    onAdd(parent: ViewControl) {
        console.info('MarkerListView.onAdd');
    }
    onRemove() {
        if (this.geoJson) {
            this.geoJson.remove();
        }
        console.info('MarkerListView.onRemove');
    }

}
