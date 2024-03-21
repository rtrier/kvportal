import * as L from "leaflet";
import * as svg from "../svg/svg";
import { getMapDescription, LayerClass, LayerDescription, PathOptions, StandardCircleMarkerOptions, StandardPathOptions } from "../conf/MapDescription";
import { createCloseButton, createHtmlElement } from "../Util";
import { LayerEvent, LayerWrapper, MapControl, MapDispatcher } from "./MapControl";

export class LegendControl extends L.Control {
    _map: L.Map;
    dom: HTMLElement;

    layers: LayerWrapper[] = [];
    navigationArea: HTMLElement;
    domLegend: HTMLDivElement;
    innerLegend: HTMLElement;
    fctHideLegend: (ev: MouseEvent) => void;

    constructor(options: L.ControlOptions) {
        super(options);
        const f = (sender: MapControl, layerSelectEvt: LayerEvent) => this._onLayerChanged(sender, layerSelectEvt);
        MapDispatcher.onLayerAdded.subscribe(f);
        MapDispatcher.onLayerRemoved.subscribe(f);
    }

    private _onLayerChanged(sender: MapControl, evt: LayerEvent): void {
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
        this._map = map;
        if (!this.dom) {
            const div = createHtmlElement("div", undefined, "legendctrl ctrl-icon");
            // const icon = createHtmlElement('div', div, "legendctrl-icon");
            const span = createHtmlElement("span", div);
            div.title = "Legende";
            span.innerText = "Legende";
            div.addEventListener("click", (ev) => {
                ev.cancelBubble = true;
                ev.stopPropagation();
                this.toggleLegend();
                return true;
            });
            this.dom = div;

            this.fctHideLegend = (ev: MouseEvent) => {
                this.toggleLegend();
            };
        }
        return this.dom;
    }

    toggleLegend() {
        if (!this.domLegend) {
            this.showLegend();
        } else {
            this.domLegend.classList.toggle("closed");
        }
    }

    _createLegendContent(): HTMLElement {
        console.info("_createLegendContent");
        const div = document.createElement("div");
        div.className = "legendctrl-legend-content";
        const table = createHtmlElement("div", div, "legend-layer-entry");
        if (this.layers?.length > 0) {
            this.layers.forEach((layer, idx) => {
                console.info(`layer ${idx}`, layer);
                appendLegendLayerEntry(layer.layerDescription, table);
            });
        } else {
            createHtmlElement("p", div, undefined, {
                innerHTML: "Es wurden keine Themen gewählt.",
            });
        }
        return div;
    }

    _createLegendDom(): HTMLDivElement {
        const dom = createHtmlElement("div", undefined, "legendctrl-legend");
        const headArea = (this.navigationArea = createHtmlElement("div", dom, "legendctrl-legend-head"));
        const headSpan = createHtmlElement("span", headArea);
        headSpan.innerText = "Legende";
        const anchorBack = createHtmlElement("a", headArea, "close");
        anchorBack.addEventListener("click", (ev) => this._closeBttnClicked());
        const table = (this.innerLegend = this._createLegendContent());
        dom.appendChild(table);
        dom.appendChild(createCloseButton(this.fctHideLegend));
        return dom;
    }

    _updateLegend() {
        if (this.innerLegend) {
            const table = this._createLegendContent();
            this.innerLegend.replaceWith(table);
            this.innerLegend = table;
        }
    }

    showLegend() {
        console.info("showLegend", this.layers);
        const dom = (this.domLegend = this._createLegendDom());
        dom.classList.remove("closed");
        L.DomEvent.disableClickPropagation(dom);
        L.DomEvent.disableScrollPropagation(dom);
        this._map.getContainer().appendChild(dom);
    }

    private _closeBttnClicked(): any {
        console.info("closeLegend");
        if (this.domLegend && this._map) {
            // this._map.getContainer().removeChild(this.domLegend);
            // this.domLegend = undefined;
            this.domLegend.classList.add("closed");
        }
    }

    onRemove(map: L.Map) {
        this._map = null;
    }
}

export function appendLegendLayerEntry(lDescr: LayerDescription, div: HTMLDivElement) {
    console.info("appendLegendLayerEntry", lDescr);
    createHtmlElement("h1", div, undefined, {
        innerHTML: lDescr.label,
    });
    try {
        if (lDescr.type === "GeoJSON") {
            if (lDescr.classes) {
                lDescr.classes.forEach((layerClass) => {
                    const row = createHtmlElement("div", div, "subelement");
                    const spanClassIcon = createHtmlElement("span", row, "icon");
                    // console.info('layer', layer, layer.geomType);
                    // const legendItem = createLegendCircle(layerClass.style);
                    let legendItem = undefined;
                    if (lDescr.geomType === "Point") {
                        // legendItem = createLegendCircle(layerClass.style);
                        legendItem = createLegendOfPoint(layerClass);
                    } else if (lDescr.geomType === "Polygon") {
                        legendItem = createLegendPolygon(layerClass.style);
                    } else if (lDescr.geomType === "Linestring") {
                        legendItem = createLegendLinestring(layerClass.style);
                    } else if (lDescr.geomType === "Chart") {
                        legendItem = createLegendPolygon(layerClass.style);
                    }

                    if (legendItem) {
                        spanClassIcon.appendChild(legendItem);
                    }
                    const spanClassName = createHtmlElement("span", row);
                    spanClassName.innerHTML = layerClass.name;
                });
            } else {
                let legendItem: Element;
                if (lDescr.geomType === "Point") {
                    if (lDescr.style?.piechart) {
                        createLegendPiechart(div, lDescr);
                    } else {
                        legendItem = createLegendOfPoint(lDescr);
                    }
                } else if (lDescr.geomType === "Polygon") {
                    legendItem = createLegendPolygon(lDescr.style);
                } else if (lDescr.geomType === "Linestring") {
                    legendItem = createLegendLinestring(lDescr.style);
                }
                if (legendItem) {
                    const row = createHtmlElement("div", div, "subelement");
                    const spanClassIcon = createHtmlElement("span", row, "icon");
                    spanClassIcon.appendChild(legendItem);
                    // const symbol = createHtmlElement('div', div);
                    // symbol.appendChild(legendItem);
                }
            }
        } else if (lDescr.type === "WMS") {
            const row = createHtmlElement("div", div, "subelement");
            const legendUrl = createLegendUrl(lDescr);
            const img = document.createElement("img");
            img.addEventListener("error", (evt) => {
                const msg = document.createElement("span");
                msg.innerHTML = "Der Dienst stellt keine Legende zur Verfügung.";
                img.parentElement.removeChild(img);
                row.appendChild(msg);
            });
            img.src = legendUrl;
            row.appendChild(img);
        }
    } catch (ex) {
        console.error(ex);
        const row = createHtmlElement("div", div, "subelement");
        const msg = createHtmlElement("span", row);
        msg.innerHTML = "Fehler beim Erzeugen der Legende.";
    }
}

/*
function appendLegendEntryTable(layer:LayerDescription, table:HTMLTableElement) {
    const row = createHtmlElement("tr", table);
    const td01 = createHtmlElement('td', row);
    td01.innerHTML = layer.label;
    const td02 = createHtmlElement('td', row);
    if (layer.type === 'GeoJSON') {
        if (layer.classes) {
            layer.classes.forEach(layerClass=>{
                const row = createHtmlElement("tr", table, 'subelement');
                const td01 = createHtmlElement('td', row);
                td01.innerHTML = layerClass.name;
                const td02 = createHtmlElement('td', row);
                console.info('layer', layer, layer.geomType);
                // const legendItem = createLegendCircle(layerClass.style);
                let legendItem = undefined;
                if (layer.geomType === 'Point') {
                    legendItem = createLegendCircle(layerClass.style);        
                } else if (layer.geomType === 'Polygon') {
                    legendItem = createLegendPolygon(layerClass.style);
                } 
                if (legendItem) {
                    td02.appendChild(legendItem);
                }        
            });
        }
        else {
            const legendItem = createLegendItem(layer);
            if (legendItem) {
                td02.appendChild(legendItem);
            }
        }
    } else if (layer.type === 'WMS') {
        const row = createHtmlElement("tr", table, 'subelement');
        const td = createHtmlElement("td", row);
        td.colSpan = 2;
        const legendUrl = createLegendUrl(layer);
        const img = document.createElement('img');    
        img.addEventListener('error', evt=>{
            const msg = document.createElement('span');
            msg.innerHTML = 'Der Dienst stellt keine Legende zur Verfügung.';
            img.parentElement.removeChild(img);
            td.appendChild(msg);
        });
        img.src = legendUrl;
        td.appendChild(img);
    }
}
*/

// export function createLegendItem(Descr:LayerDescription):Element|undefined {
//     if (Descr.type ===  'GeoJSON') {
//         if (Descr.geomType === 'Point') {
//             return createLegendOfPoint(Descr);
//         } else if (Descr.geomType === 'Polygon') {
//             return createLegendOfPolygon(Descr);
//         } else if (Descr.geomType === 'Linestring') {
//             return createLegendOfLinestring(Descr);
//         }
//     } else if (Descr.type === 'WMS') {
//         return createWMSLegendItem(Descr);
//     }
//     return undefined;
// }

export function createLegendOfPoint(layer: LayerDescription | LayerClass): Element | undefined {
    // if (layer.classes) {
    //     return createLegendClasses(layer);
    // }
    console.info("createLegendOfPoint", layer);
    if (layer.icon && layer.icon.iconUrl) {
        const img = document.createElement("img");
        img.src = layer.icon.iconUrl;
        img.width = layer.icon.iconSize[0];
        img.height = layer.icon.iconSize[1];
        return img;
    }
    const style = layer.style ? layer.style : layer;
    return createLegendCircle(style);
}

// function createLegendClasses(layerDescr:LayerDescription) {
//     const src = "data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZW5hYmxlLWJhY2tncm91bmQ9Im5ldyAwIDAgMTAwIDEwMCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGc+PHBhdGggZD0iTTM1LjcsMjcuMmg1OC41YzEsMCwxLjgtMC44LDEuOC0xLjhzLTAuOC0xLjgtMS44LTEuOEgzNS43Yy0xLDAtMS44LDAuOC0xLjgsMS44UzM0LjcsMjcuMiwzNS43LDI3LjJ6Ij48L3BhdGg+PHBhdGggZD0iTTk0LjEsNDcuM0gzNS43Yy0xLDAtMS44LDAuOC0xLjgsMS44czAuOCwxLjgsMS44LDEuOGg1OC41YzEsMCwxLjgtMC44LDEuOC0xLjhTOTUuMSw0Ny4zLDk0LjEsNDcuM3oiPjwvcGF0aD48cGF0aCBkPSJNOTQuMSw3MC45SDM1LjdjLTEsMC0xLjgsMC44LTEuOCwxLjhzMC44LDEuOCwxLjgsMS44aDU4LjVjMSwwLDEuOC0wLjgsMS44LTEuOFM5NS4xLDcwLjksOTQuMSw3MC45eiI+PC9wYXRoPjxwYXRoIGQ9Ik0yMi43LDM5LjdINy41Yy0xLDAtMS44LDAuOC0xLjgsMS44djE1LjJjMCwxLDAuOCwxLjgsMS44LDEuOGgxNS4yYzEsMCwxLjgtMC44LDEuOC0xLjhWNDEuNSAgIEMyNC40LDQwLjUsMjMuNiwzOS43LDIyLjcsMzkuN3oiPjwvcGF0aD48cGF0aCBkPSJNNy4xLDM0aDE1LjZjMC42LDAsMS4yLTAuMywxLjUtMC45czAuMy0xLjIsMC0xLjhsLTcuOC0xMy41Yy0wLjMtMC41LTAuOS0wLjktMS41LTAuOXMtMS4yLDAuMy0xLjUsMC45TDUuNiwzMS40ICAgYy0wLjMsMC41LTAuMywxLjIsMCwxLjhTNi41LDM0LDcuMSwzNHoiPjwvcGF0aD48cGF0aCBkPSJNMTUuNCw2Mi42Yy01LjUsMC0xMCw0LjUtMTAsMTBzNC41LDEwLDEwLDEwczEwLTQuNSwxMC0xMFMyMC45LDYyLjYsMTUuNCw2Mi42eiI+PC9wYXRoPjwvZz48L3N2Zz4=";
//     const img = document.createElement("img");
//     img.src = src;
//     img.addEventListener('click', evt=>{
//         showLegendOfClasses(evt, layerDescr);
//     });
//     return img;
// }

function createWMSLegendItem(layer: LayerDescription): Element | undefined {
    let legendItem: Element = undefined;
    const symbol = getMapDescription().default_wms_legend_icon;
    const legendUrl = createLegendUrl(layer);
    // if (!legendUrl) {
    //     createLegendUrl(layer);
    // }
    if (symbol && legendUrl) {
        // const item = document.createElement('div');
        // const img = createHtmlElement('img', item);
        const img = document.createElement("img");
        img.src = symbol;
        img.addEventListener("click", (evt) => {
            showLegendUrl(evt, legendUrl);
        });
        img.style.position = "relative";
        img.style.width = "20px";
        img.title = "Legende anzeigen.";
        // addTooltip(item, "Legende anzeigen");
        legendItem = img;
    }
    return legendItem;
}

function createLegendUrl(layer: LayerDescription): string | undefined {
    let url = undefined;
    if (layer.url_legend) {
        return layer.url_legend;
    }
    if (layer.url) {
        if (layer.url.endsWith("&")) {
            url = layer.url + "SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=" + layer.options["layers"] + "&FORMAT=image/png&SLD_VERSION=1.1.0";
            return url;
        }
        if (layer.url.indexOf("?") > 0) {
            url = layer.url + "&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=" + layer.options["layers"] + "&FORMAT=image/png&SLD_VERSION=1.1.0";
            return url;
        }
        url = layer.url + "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=" + layer.options["layers"] + "&FORMAT=image/png&SLD_VERSION=1.1.0";
        return url;
    }
}
// function showLegendOfClasses(evt:MouseEvent, layerDescr:LayerDescription) {
//     const content = document.createElement('table');
//     appendLegendLayerEntry(layerDescr, content);
//     showContent(evt, content);
// }
function showLegendUrl(evt: MouseEvent, url: string) {
    const content = document.createElement("div");
    const img = document.createElement("img");

    img.addEventListener("error", (evt) => {
        const msg = document.createElement("span");
        msg.innerHTML = "Der Dienst stellt keine Legende zur Verfügung.";
        img.parentElement.removeChild(img);
        content.appendChild(msg);
    });
    img.src = url;
    content.appendChild(img);
    showContent(evt, content);
}

function createSvgStyle(style: PathOptions): svg.SvgStyle {
    console.info("createStyle", style, style.stroke);
    const st: svg.SvgStyle = {};
    if (style.stroke) {
        st.stroke = style.color;
        st.strokeOpacity = (style.opacity || 1).toString();
        st.strokeWidth = (style.weight || 3).toString();
        st.strokeLinecap = style.lineCap || "";
        st.strokeLinejoin = style.lineJoin || "";
        st.strokeDasharray = style.dashArray || "";
        st.strokeDashoffset = style.dashOffset || "";
    } else {
        st.stroke = "none";
    }

    if (style.fill) {
        st.fill = style.fillColor || style.color;
        if (style.fillOpacity) {
            st.opacity = style.fillOpacity.toString();
        }
        st.fillRule = style.fillRule || "evenodd";
    } else {
        st.fill = "none";
    }

    return st;
}

// function createLegendOfLinestring(layer:LayerDescription):Element {
//     console.info('createLegendOfLinestring');
//     // if (layer.classes) {
//     //     return createLegendClasses(layer);
//     // }
//     const style = {...StandardPathOptions, ...layer.style};
//     const svgEl = new svg.SVG({x:0, y:0, width:20, height:20});

//     const st = createSvgStyle(style);
//     svgEl.addLine(0, 10, 20, 10, st);
//     return svgEl.svg;
// }

function createLegendLinestring(style: any): Element {
    console.info("createLegendLinestring", style);
    const svgEl = new svg.SVG({ x: 0, y: 0, width: 20, height: 20 });
    const st = createSvgStyle({ ...StandardPathOptions, ...style });
    svgEl.addLine(0, 10, 20, 10, st);
    return svgEl.svg;
}

// function createLegendOfPolygon(layer:LayerDescription):Element {
//     // if (layer.classes) {
//     //     return createLegendClasses(layer);
//     // }
//     const style = layer.style;
//     const svgEl = new svg.SVG({x:0, y:0, width:20, height:20});
//     const st = {
//         stroke: style && style.color ? style.color : "#3388ff",
//         strokeOpacity: "1",
//         strokeWidth: style && style.weight ? style.weight : "3",
//         strokeLinecap: "round",
//         strokeLinejoin: "round",
//         fill: style && style.color ? style.color : "#3388ff",
//         fillOpacity: "0.2",
//         fillRule: "evenodd"
//     }
//     svgEl.addPolygGon("1,1 19,1 19,19 1,19", st);
//     svgEl.svg.style.width = '2rem';
//     return svgEl.svg;
// }

function createLegendPolygon(style: any): Element {
    console.info("createLegendPolygon", style);
    const svgEl = new svg.SVG({ x: 0, y: 0, width: 20, height: 20 });
    const st = {
        stroke: style && style.color ? style.color : "#3388ff",
        strokeOpacity: "1",
        strokeWidth: style && style.weight ? style.weight : "3",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        // fill: style && style.fillColor ? style.fillColor : "#3388ff",
        fill: style?.fillColor,
        fillOpacity: style && style.fillOpacity ? style.fillOpacity : "0.2",
        fillRule: "evenodd",
    };
    svgEl.addPolygGon("1,1 19,1 19,19 1,19", st);
    return svgEl.svg;
}

function createLegendPiechart(div: HTMLElement, lDescr: LayerDescription) {
    /*
    "style": {
        "radius": 15,
        "fillOpacity": 0.6,
        "strokeOpacity": 0.2,
        "strokeWeight": 3,
        "piechart": {
          "casa_ev_qm_kl1": "rgb(162 203 255)",
          "casa_ev_qm_kl2": "rgb(182 247 255)",
          "casa_ev_qm_kl3": "rgb(168 255 188)",
          "casa_ev_qm_kl4": "rgb(240 255 175)",
          "casa_ev_qm_kl5": "rgb(255 215 165)",
          "casa_ev_qm_kl98": "rgb(255 194 186)",
          "casa_ev_qm_kl99": "rgb(255 154 230)"
        }
      },
      */
    for (let k in lDescr.style.piechart) {
        const row = createHtmlElement("div", div, "subelement");
        const spanClassIcon = createHtmlElement("span", row, "icon");
        const legendItem = createLegendPolygon({ fillColor: lDescr.style.piechart[k], color: "#000", weight: 1 });
        spanClassIcon.appendChild(legendItem);
        const spanClassName = createHtmlElement("span", row);
        spanClassName.innerHTML = lDescr.layerAttributes?.[k] ?? k;
    }
}

function createLegendCircle(style: any): Element {
    const svgEl = new svg.SVG({ x: 0, y: 0, width: 24, height: 24 });
    console.info("createLegendCircle", style);
    const st = createSvgStyle({ ...StandardCircleMarkerOptions, ...style });
    svgEl.addCircle(12, 12, 10, st);
    return svgEl.svg;
}

function showContent(evt: MouseEvent, content: HTMLElement) {
    const dom = createHtmlElement("div", undefined, "legendctrl-legend");
    const headArea = createHtmlElement("div", dom, "legendctrl-legend-head");
    const headSpan = createHtmlElement("span", headArea);
    headSpan.innerText = "Legende";
    const anchorBack = createHtmlElement("a", headArea, "close");
    anchorBack.addEventListener("click", (ev) => {
        if (dom.parentElement) {
            dom.parentElement.removeChild(dom);
        }
    });
    dom.appendChild(content);

    dom.style.position = "absolute";
    dom.style.left = evt.clientX + "px";
    dom.style.top = evt.clientY + "px";
    document.body.appendChild(dom);
}
