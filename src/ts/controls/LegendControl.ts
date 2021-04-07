import * as L from 'leaflet';
import * as svg from '../svg/svg'
import { getMapDescription, LayerDescription } from '../conf/MapDescription';
import { createHtmlElement } from '../Util';
import { LayerControl } from './LayerControl';
import { LayerEvent, LayerWrapper, MapControl, MapDispatcher } from './MapControl';

export class LegendControl extends L.Control {

    map: L.Map;
    dom: HTMLElement;

    layers: LayerWrapper[] = [];
    navigationArea: HTMLElement;
    domLegend: HTMLDivElement;
    innerLegend: HTMLTableElement;
    

    constructor(options: L.ControlOptions) {
        super(options);
        this._subscribe();
    }
    private _subscribe() {
        console.info("subs onListViewItemSelection");
        MapDispatcher.onLayerAdded.subscribe((sender, layerSelectEvt) => this.onLayerChanged(sender, layerSelectEvt));
        MapDispatcher.onLayerRemoved.subscribe((sender, layerSelectEvt) => this.onLayerChanged(sender, layerSelectEvt));
    }


    onLayerChanged(sender: MapControl, evt: LayerEvent): void {
        console.info("onLayerAdded", evt);
        if (evt.layer.isSelected) {
            this.layers.push(evt.layer);
        } else {
            const idx = this.layers.indexOf(evt.layer);
            if (idx >= 0) {
                this.layers.splice(idx, 1);
            }
        } 
        this._updateLegend();
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

    _createTable():HTMLTableElement {
        const table = createHtmlElement('table'); 
        this.layers.forEach((layer, idx) => {
            console.info(`layer ${idx}`, layer);
            const row = createHtmlElement("tr", table);
            const td01 = createHtmlElement('td', row);
            td01.innerHTML = layer.layerDescription.label;
            const td02 = createHtmlElement('td', row);
            if (layer.layerDescription.type === 'GeoJSON') {
                if (layer.layerDescription.classes) {
                    layer.layerDescription.classes.forEach(layerClass=>{
                        const row = createHtmlElement("tr", table);
                        row.className="subelement";
                        const td01 = createHtmlElement('td', row);
                        td01.innerHTML = layerClass.name;
                        const td02 = createHtmlElement('td', row);
                        const legendItem = createLegendCircle(layerClass.style);
                        if (legendItem) {
                            td02.appendChild(legendItem);
                        }        
                    });
                }
                else {
                    const legendItem = createLegendItem(layer.layerDescription);
                    if (legendItem) {
                        td02.appendChild(legendItem);
                    }
                }
            }

        });
        return table;
    }

    _createLegendDom():HTMLDivElement {
        const dom = createHtmlElement('div', undefined, 'legendctrl-legend');
        const headArea = this.navigationArea = createHtmlElement('div', dom, 'legendctrl-legend-head');               
        const headSpan = createHtmlElement('span', headArea);
        headSpan.innerText = "Legende";
        const anchorBack = createHtmlElement('a', headArea, 'close') ;        
        anchorBack.addEventListener('click', (ev)=>this._closeBttnClicked());
        // const table = createHtmlElement('table', dom) ; 
        const table = this.innerLegend = this._createTable(); 
        dom.appendChild(table);
        return dom;
    }

    _updateLegend() {
        if (this.innerLegend) {
            const table = this._createTable(); 
            this.innerLegend.replaceWith(table);
            this.innerLegend = table;
        }
    }

    showLegend() {
        console.info("showLegend", this.layers);        
        const dom = this.domLegend = this._createLegendDom();
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

export function createWMSLegendItem(layer:LayerDescription):Element|undefined {
    let legendItem:Element = undefined;
    const symbol = getMapDescription().default_wms_legend_icon;

    const legendUrl = createLegendUrl(layer);
    console.info(`legendUrl="${legendUrl}`);
    if (!legendUrl) {
        createLegendUrl(layer);
    }
    if (symbol && legendUrl) {
        const img = document.createElement('img');
        img.src = symbol;
        img.addEventListener('click', evt=>{
            showLegendUrl(evt, legendUrl);
        });
        img.style.position='relative';
        img.title = "Legende anzeigen.";
        legendItem = img;
        
    }
    return legendItem;
}

function createLegendUrl(layer:LayerDescription):string|undefined {

    let url = undefined;
    if (layer.url_legend) {
        return layer.url_legend;
    }
    if (layer.url) {
        if (layer.url.endsWith('&')) {
            url = layer.url + "SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER="+layer.options.layers+"&FORMAT=image/png&SLD_VERSION=1.1.0";
            return url;
        }
        if (layer.url.indexOf('?')>0) {
            url = layer.url + "&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER="+layer.options.layers+"&FORMAT=image/png&SLD_VERSION=1.1.0";
            return url;
        }
        url = layer.url + "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER="+layer.options.layers+"&FORMAT=image/png&SLD_VERSION=1.1.0";
        return url;
    }
}

function showLegendUrl(evt:MouseEvent, url:string) {
    const content = document.createElement('div');
    const img = document.createElement('img');
    
    img.addEventListener('error', evt=>{
        const msg = document.createElement('span');
        msg.innerHTML = 'Der Dienst stellt keine Legende zur Verfügung.';
        img.parentElement.removeChild(img);
        content.appendChild(msg);
    });
    img.src = url;
    content.appendChild(img);
    showContent(evt, content);
}


function createLegendCircle(style:any):Element {
    const svgEl = new svg.SVG({x:0, y:0, width:32, height:32});
    console.info("createLegendCircle",style);
    const st = {
        stroke: style && style.color ? style.color : "#3388ff", 
        strokeOpacity: "1", 
        strokeWidth: style && style.weight ? style.weight : "3",
        strokeLinecap: "round", 
        strokeLinejoin: "round", 
        fill: style && style.fillColor ? style.fillColor : "#3388ff",
        fillOpacity: style && style.fillOpacity ? style.fillOpacity : "1",
        fillRule: "evenodd" 
    }
    svgEl.addCircle(16, 16, 14, st);
    return svgEl.svg;
}

function showContent(evt:MouseEvent, content:HTMLElement) {    
    const dom = createHtmlElement('div', undefined, 'legendctrl-legend');
    const headArea = createHtmlElement('div', dom, 'legendctrl-legend-head');               
    const headSpan = createHtmlElement('span', headArea);
    headSpan.innerText = "Legende";
    const anchorBack = createHtmlElement('a', headArea, 'close') ;        
    anchorBack.addEventListener('click', (ev)=>{
        if (dom.parentElement) {
            dom.parentElement.removeChild(dom);
        }
    });
    dom.appendChild(content);

    dom.style.position = 'absolute';
    dom.style.left = evt.clientX+'px';
    dom.style.top = evt.clientY+'px';
    document.body.appendChild(dom);
}
