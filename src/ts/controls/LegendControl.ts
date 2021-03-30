import * as L from 'leaflet';
import * as svg from '../svg/svg'
import { LayerDescription } from '../conf/MapDescription';
import { createHtmlElement } from '../Util';
import { LayerControl } from './LayerControl';
import { LayerEvent, LayerWrapper, MapControl, MapDispatcher } from './MapControl';

export class LegendControl extends L.Control {

    map: L.Map;
    dom: HTMLElement;

    layers: LayerWrapper[] = [];
    navigationArea: HTMLElement;
    domLegend: HTMLDivElement;
    

    constructor(options: L.ControlOptions) {
        super(options);
        this._subscribe();
    }
    private _subscribe() {
        console.info("subs onListViewItemSelection");
        MapDispatcher.onLayerAdded.subscribe((sender, layerSelectEvt) => this.onThemeLayerSelection(sender, layerSelectEvt));
    }


    onThemeLayerSelection(sender: MapControl, evt: LayerEvent): void {
        if (evt.layer.isSelected) {
            this.layers.push(evt.layer);
        } else {
            const idx = this.layers.indexOf(evt.layer);
            if (idx >= 0) {
                this.layers.splice(idx, 1);
            }
        } 
    }


    onAdd(map: L.Map): HTMLElement {
        console.info("LegendControl.onAdd");
        this.map = map;
        if (!this.dom) {
            const div = createHtmlElement('div', undefined, "legendctrl");
            const span = createHtmlElement('span', div);
            span.innerText = "Legende";
            div.addEventListener("click", (ev) => {
                console.info("click");
                ev.cancelBubble = true;
                ev.stopPropagation();
                this.toggleLegend();
                return true;
            });
            this.dom = div;
        }
        return this.dom;
    }

    toggleLegend() {
        if (!this.domLegend) {
            this.showLegend();
        } else {
            this.map.getContainer().removeChild(this.domLegend);
            this.domLegend = undefined;
        }

    }

    showLegend() {
        console.info("showLegend", this.layers);
        const dom = createHtmlElement('div', undefined, 'legendctrl-legend');
        const headArea = this.navigationArea = createHtmlElement('div', dom, 'legendctrl-legend-head');               
        const headSpan = createHtmlElement('span', headArea);
        headSpan.innerText = "Legende";
        const anchorBack = createHtmlElement('a', headArea, 'close') ;        
        anchorBack.addEventListener('click', (ev)=>this._closeBttnClicked());

        const table = createHtmlElement('table', dom) ; 
        this.layers.forEach((layer, idx) => {
            console.info(`layer ${idx}`, layer);
            const row = createHtmlElement("tr", table);
            const td01 = createHtmlElement('td', row);
            td01.innerHTML = layer.layerDescription.label;
            const td02 = createHtmlElement('td', row);
            // if (layer.type === 'GeoJSON') {
            //     if (layer.geomType === 'Point') {
            //         if (layer.icon && layer.icon.iconUrl) {                    
            //             const img = createHtmlElement('img', td02);
            //             img.src = layer.icon.iconUrl;
            //             img.width = layer.icon.iconSize[0];
            //             img.height = layer.icon.iconSize[1];
            //         }
            //     } else if (layer.geomType === 'Polygon') {
            //         const svg = this.createLegendArea(layer.style);
            //         td02.appendChild(svg);
            //     }
            // }
            if (layer.layerDescription.type === 'GeoJSON') {
                const legendItem = createLegendItem(layer.layerDescription);
                if (legendItem) {
                    td02.appendChild(legendItem);
                }
            }

        });
        this.domLegend = dom;
        this.map.getContainer().appendChild(dom);
    }
/*

color: "#FF3333"
stroke: true
weight: 3
*/


    private _closeBttnClicked(): any {
        console.info("closeLegend");
        if (this.domLegend && this.map) {
            this.map.getContainer().removeChild(this.domLegend);
            this.domLegend = undefined;
        }
    }

    onRemove(map: L.Map) {
        console.info("MenuControl.onRemove");
        this.map = null;
    }
}
function createLegendArea(style:any):Element {
    const svgEl = new svg.SVG({x:0, y:0, width:20, height:20});
    const st = {
        stroke: style && style.color ? style.color : "#3388ff", 
        strokeOpacity: "1", 
        strokeWidth: style && style.weight ? style.weight : "3",
        strokeLinecap: "round", 
        strokeLinejoin: "round", 
        fill: style && style.color ? style.color : "#3388ff",
        fillOpacity: "0.2",
        fillRule: "evenodd" 
    }
    svgEl.addPolygGon("1,1 19,1 19,19 1,19", st);
    return svgEl.svg;
}

export function createLegendItem(layer:LayerDescription):Element|undefined {
    let legendItem:Element = undefined;
    if (layer.geomType === 'Point') {
        if (layer.icon && layer.icon.iconUrl) {                    
            const img = document.createElement('img');
            img.src = layer.icon.iconUrl;
            img.width = layer.icon.iconSize[0];
            img.height = layer.icon.iconSize[1];
            legendItem = img;
        }
    } else if (layer.geomType === 'Polygon') {
        legendItem = createLegendArea(layer.style);
    }
    return legendItem;
}