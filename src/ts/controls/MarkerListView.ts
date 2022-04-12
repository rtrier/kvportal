import { CategorieLayer, CategoryMapObject, InteractiveLayer } from "./CategorieLayer";
import { MapDispatcher } from "./MapControl";
import { View, ViewControl } from "./ViewControl";
import { createHtmlElement, createRow } from "../Util";
import { LayerDescription } from "../conf/MapDescription";

function prepareLinks(s: string): string {
    let result = "";
    if (s) {
        if (s.split(/[>]/).length > 1 && s.split(/[>]/).length > 1) {
            // vielleicht HTML keine Änderung
            // console.log(`/[><]+/g.exec(s).length='${/[><]+/g.exec(s)?.length}'`);
            // console.log(`s.split(/[><]/).length='${s.split(/[><]/).length}'`);
            // console.log(s.split(/[><]/));
            result = s;
        } else {
            const sA = s.split(/[\s]+/);
            for (let i = 0, count = sA.length; i < count; i++) {
                const part = sA[i];
                if (i > 0) {
                    result += " ";
                }
                if (part.indexOf("http") === 0) {
                    result += '<a href="';
                    result += part;
                    result += '">';
                    result += part;
                    result += "</a>";
                } else {
                    result += part;
                }
            }
        }
    }
    return result;
}

export type ListEntry<T> = {
    item: T;
    dom: HTMLElement;
};

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
            } else {
                this.dom = this.renderDataView();
            }
        }
        return this.dom;
    }

    renderDataView() {
        console.info("renderdataView", this);
        const dom = createHtmlElement("div", undefined, "data-view");
        createHtmlElement("h1", dom, "datainfo-title", {
            innerHTML: this.layer["LayerDescription"]?.label,
        });
        console.info(this.layer["LayerDescription"]?.label);
        // const table = createHtmlElement('table', dom);

        const data = this.marker.data ? this.marker.data : (<any>this.marker)?.feature?.properties;

        const layerDes: LayerDescription = this.layer["LayerDescription"];
        if (layerDes?.layerAttributes) {
            let i = 0;
            for (let k in layerDes.layerAttributes) {
                let v = data[k];
                if (v || !layerDes.hideEmptyLayerAttributes) {
                    const p = createHtmlElement("p", dom, "datainfo-row");
                    createHtmlElement("span", p, "datainfo-row-head", {
                        innerHTML: layerDes.layerAttributes[k],
                    });

                    if (typeof v === "string" && v.indexOf("http") >= 0) {
                        v = prepareLinks(v);
                    }
                    createHtmlElement("span", p, "datainfo-row-content", {
                        innerHTML: v,
                    });
                    i++;
                    // createRow(layerDes.layerAttributes[k], v, table);
                }
            }
            if (i === 0) {
                createHtmlElement("p", dom, "datainfo-row-head", {
                    innerHTML: "Es liegen keine weiteren Daten vor.",
                });
            }
            // if (layerDes?.geomType === "Chart") {
            //     const m = <PiechartMarker<any>>this.marker;
            //     const div = createHtmlElement("div", dom);
            //     div.appendChild(m.getPiechart());
            // }
        } else {
            // createRow(k, data[k], table);
            createHtmlElement("p", dom, "datainfo-row-head", {
                innerHTML: "Es liegen keine weiteren Daten vor.",
            });
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
            const divList = document.createElement("div");
            divList.className = "list-item-view";
            const markers = this.markers;
            const pop = this.layer.popupFactory;

            if (markers && markers.length > 0) {
                markers.forEach((marker) => {
                    const itemDom = pop.renderListItem(this.layer, marker);
                    divList.appendChild(itemDom);
                    itemDom.className = "list-item";
                    itemDom.addEventListener("click", (ev) => this.listEntryClicked({ dom: <HTMLElement>ev.target, item: marker }));
                });
            } else {
                createHtmlElement("p", divList).innerHTML = "Es wurde nichts gefunden";
            }
            this.dom = divList;
        }
        return this.dom;
    }

    listEntryClicked(entry: ListEntry<any>): any {
        if (this.selectedListEntry) {
            this.selectedListEntry.dom.classList.remove("selected");
            if (this.selectedListEntry === entry) {
                this.selectedListEntry = undefined;
                MapDispatcher.onListViewItemSelection.dispatch(this, undefined);
            }
        }
        this.selectedListEntry = entry;
        MapDispatcher.onListViewItemSelection.dispatch(this, entry.item);
        console.info("listEntryClicked", entry);
    }

    onAdd(parent: ViewControl) {
        console.info("MarkerListView.onAdd");
    }
    onRemove() {
        if (this.geoJson) {
            this.geoJson.remove();
        }
        console.info("MarkerListView.onRemove");
    }
}
