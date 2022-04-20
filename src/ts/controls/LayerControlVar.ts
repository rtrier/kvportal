import * as L from "leaflet";
import { ChangeNodeOrderEvent, Tree } from "../../../../treecomponent/src/ts/Tree";
import { NodeRenderer, SelectionMode, SelectionStatus, TreeNode, TreeNodeParam } from "../../../../treecomponent/src/ts/TreeNode";
import { LayerDescription, Theme } from "../conf/MapDescription";
import { createHtmlElement, createSlider } from "../Util";
import { Accordion, AccordionItem } from "../widget/Accordion";

import { CategorieLayer, Category, CategoryMapObject, Path } from "./CategorieLayer";
import { BaseLayerDefinition, LayerDefinitionOptions, LayerControlOptions, LayerControl } from "./LayerControl";

import { LayerEvent, LayerWrapper, MapControl, MapDispatcher } from "./MapControl";

import { EventDispatcher } from "strongly-typed-events";
import { LayerLoader } from "../LayerLoader";

class ThemeNodeRenderer implements NodeRenderer {
    render(node: TreeNode) {
        const theme = <Theme>node.data;
        const div = document.createElement("div");
        const txt = theme.thema;
        div.innerHTML = txt;
        div.dataset.tooltip = txt;
        div.setAttribute("data-tooltip", txt);
        div.title = txt;
        div.className = "tooltip";

        return div;
    }
}

class ThemeTreeNode extends TreeNode {
    render(inset?: number): HTMLElement {
        inset = inset ?? 0;

        let dom = this.dom;
        let treerow = this.treerow;
        if (!dom) {
            dom = this.dom = document.createElement("div");
            dom.className = "row-wrapper row-wrapper-" + inset;
            treerow = this.treerow = document.createElement("div");
            treerow.className = "treerow";

            dom.appendChild(treerow);

            const childCount = this.childs ? this.childs.length : 0;
            // const selectMode = this.getSelectMode();

            const theme = <Theme>this.data;

            if (theme.icon) {
                const img = document.createElement("img");
                img.src = theme.icon;
                img.alt = "Icon " + theme.thema;
                treerow.appendChild(img);
            }

            const labelDiv = document.createElement("div");
            labelDiv.className = "treelabel";
            // const label = this.nodeRenderer.render(this)
            const label = document.createElement("div");
            const txt = theme.thema;
            label.innerHTML = txt;
            label.dataset.tooltip = txt;
            label.setAttribute("data-tooltip", txt);
            label.title = txt;
            label.className = "tooltip";
            // if (label) {
            labelDiv.appendChild(label);
            treerow.appendChild(labelDiv);
            // }

            if (inset === 0) {
                const spanOpenClose = (this.spanOpenClose = document.createElement("span"));
                treerow.addEventListener("click", (ev) => this.onTreeIconClick(ev));

                if (this.collapsed) {
                    this.dom.classList.add("closed");
                } else {
                    this.dom.classList.add("opened");
                }

                if (childCount > 0) {
                    if (this.collapsed) {
                        this.spanOpenClose.classList.add("closed");
                    } else {
                        this.spanOpenClose.classList.add("opened");
                    }
                }
                this.textNode = spanOpenClose;
                treerow.appendChild(spanOpenClose);
            } else {
                this.dom.classList.add("opened");
            }

            let nodecontainer = this.childDom;
            if (nodecontainer) {
                nodecontainer.innerHTML = null;
            }

            if (childCount > 0) {
                if (!nodecontainer) {
                    nodecontainer = this.childDom = document.createElement("div");
                    nodecontainer.className = "nodecontainer";
                    dom.appendChild(nodecontainer);
                }
                // const childInset = this.showOnlyChilds ? inset : (inset + insetSelf);
                for (let i = 0; i < this.childs.length; i++) {
                    nodecontainer.appendChild(this.childs[i].render(inset + 1));
                }
            }
            this.dom.style.display = this.hideEmptyNode && childCount === 0 ? "none" : "flex";
        }
        this.insetChilds = this.showOnlyChilds ? inset : inset + 1;
        return dom;
    }
}

let scaleDom: any = undefined;
function createZoomScale() {
    if (!scaleDom) {
        /*
        const s1 = `
        <svg width="248" height="80" version="1.1" preserveAspectRatio="none" viewBox="10 0 223 60" xmlns="http://www.w3.org/2000/svg">
        <g font-family="sans-serif" font-size="8px" letter-spacing="0px" stroke-width=".26458" word-spacing="0px">
            <text class="p01" x="20" y="12">1</text>
            <text class="p02" x="40" y="12">2</text>
            <text class="p03" x="60" y="12">3</text>
            <text class="p04" x="80" y="12">4</text>
            <text class="p05" x="100" y="12">5</text>
            <text class="p06" x="120" y="12">6</text>
            <text class="p07" x="140" y="12">7</text>
            <text class="p08" x="160" y="12">8</text>
            <text class="p09" x="180" y="12">9</text>
            <text class="p10" x="200" y="12">10</text>
            <text class="p11" x="220" y="12">11</text>
        </g>
        <path class="p01" d="M 12 35 l 20 1 l 0  -8 l -20 1 l 0  6" stroke="gray" fill="lightgray" />
        <path class="p02" d="M 32 36 l 20 1 l 0 -10 l -20 1 l 0  8" stroke="gray" fill="lightgray" />
        <path class="p03" d="M 52 37 l 20 1 l 0 -12 l -20 1 l 0 10" stroke="gray" fill="lightgray" />
        <path class="p04" d="M 72 38 l 20 1 l 0 -14 l -20 1 l 0 12" stroke="gray" fill="lightgray" />
        <path class="p05" d="M 92 39 l 20 1 l 0 -16 l -20 1 l 0 14" stroke="gray" fill="lightgray" />
        <path class="p06" d="M 112 40 l 20 1 l 0 -18 l -20 1 l 0 16" stroke="gray" fill="lightgray" />
        <path class="p07" d="M 132 41 l 20 1 l 0 -20 l -20 1 l 0 18" stroke="gray" fill="lightgray" />
        <path class="p08" d="M 152 42 l 20 1 l 0 -22 l -20 1 l 0 20" stroke="gray" fill="lightgray" />
        <path class="p09" d="M 172 43 l 20 1 l 0 -24 l -20 1 l 0 22" stroke="gray" fill="lightgray" />
        <path class="p10" d="M 192 44 l 20 1 l 0 -26 l -20 1 l 0 24" stroke="gray" fill="lightgray" />
        <path class="p11" d="M 212 45 l 20 1 l 0 -28 l -20 1 l 0 26" stroke="gray" fill="lightgray" />

        <path class="z01" d="M 12 35 l 20 1 l 0  -8 l -20 1 l 0  6" visibility="hidden" />
        <path class="z02" d="M 32 36 l 20 1 l 0 -10 l -20 1 l 0  8" visibility="hidden" />
        <path class="z03" d="M 52 37 l 20 1 l 0 -12 l -20 1 l 0 10" visibility="hidden" />
        <path class="z04" d="M 72 38 l 20 1 l 0 -14 l -20 1 l 0 12" visibility="hidden" />
        <path class="z05" d="M 92 39 l 20 1 l 0 -16 l -20 1 l 0 14" visibility="hidden" />
        <path class="z06" d="M 112 40 l 20 1 l 0 -18 l -20 1 l 0 16" visibility="hidden" />
        <path class="z07" d="M 132 41 l 20 1 l 0 -20 l -20 1 l 0 18" visibility="hidden" />
        <path class="z08" d="M 152 42 l 20 1 l 0 -22 l -20 1 l 0 20" visibility="hidden" />
        <path class="z09" d="M 172 43 l 20 1 l 0 -24 l -20 1 l 0 22" visibility="hidden" />
        <path class="z10" d="M 192 44 l 20 1 l 0 -26 l -20 1 l 0 24" visibility="hidden" />
        <path class="z11" d="M 212 45 l 20 1 l 0 -28 l -20 1 l 0 26" visibility="hidden" />

    </svg>
    `;*/
        const s = `
    <svg width="248" height="80" version="1.1" preserveAspectRatio="none" viewBox="10 0 223 60" xmlns="http://www.w3.org/2000/svg">
    <g font-family="sans-serif" font-size="8px" letter-spacing="0px" stroke-width=".26458" word-spacing="0px">
        <text class="p01" x="20" y="12">1</text><text class="p02" x="40" y="12">2</text><text class="p03" x="60" y="12">3</text>
        <text class="p04" x="80" y="12">4</text><text class="p05" x="100" y="12">5</text><text class="p06" x="120" y="12">6</text>
        <text class="p07" x="140" y="12">7</text><text class="p08" x="160" y="12">8</text><text class="p09" x="180" y="12">9</text>
        <text class="p10" x="200" y="12">10</text><text class="p11" x="220" y="12">11</text>
    </g>
    <path class="p01" d="M  12 35 l 20 0 l 0  -6 l -20 0 l 0  6" stroke="gray" fill="lightgray" />
    <path class="p02" d="M  32 36 l 20 0 l 0  -8 l -20 0 l 0  8" stroke="gray" fill="lightgray" />
    <path class="p03" d="M  52 37 l 20 0 l 0 -10 l -20 0 l 0 10" stroke="gray" fill="lightgray" />
    <path class="p04" d="M  72 38 l 20 0 l 0 -12 l -20 0 l 0 12" stroke="gray" fill="lightgray" />
    <path class="p05" d="M  92 39 l 20 0 l 0 -14 l -20 0 l 0 14" stroke="gray" fill="lightgray" />
    <path class="p06" d="M 112 40 l 20 0 l 0 -16 l -20 0 l 0 16" stroke="gray" fill="lightgray" />
    <path class="p07" d="M 132 41 l 20 0 l 0 -18 l -20 0 l 0 18" stroke="gray" fill="lightgray" />
    <path class="p08" d="M 152 42 l 20 0 l 0 -20 l -20 0 l 0 20" stroke="gray" fill="lightgray" />
    <path class="p09" d="M 172 43 l 20 0 l 0 -22 l -20 0 l 0 22" stroke="gray" fill="lightgray" />
    <path class="p10" d="M 192 44 l 20 0 l 0 -24 l -20 0 l 0 24" stroke="gray" fill="lightgray" />
    <path class="p11" d="M 212 45 l 20 0 l 0 -26 l -20 0 l 0 26" stroke="gray" fill="lightgray" />

    <path class="z01" d="M  12 35 l 20 0 l 0  -6 l -20 0 l 0  6" visibility="hidden" />
    <path class="z02" d="M  32 36 l 20 0 l 0  -8 l -20 0 l 0  8" visibility="hidden" />
    <path class="z03" d="M  52 37 l 20 0 l 0 -10 l -20 0 l 0 10" visibility="hidden" />
    <path class="z04" d="M  72 38 l 20 0 l 0 -12 l -20 0 l 0 12" visibility="hidden" />
    <path class="z05" d="M  92 39 l 20 0 l 0 -14 l -20 0 l 0 14" visibility="hidden" />
    <path class="z06" d="M 112 40 l 20 0 l 0 -16 l -20 0 l 0 16" visibility="hidden" />
    <path class="z07" d="M 132 41 l 20 0 l 0 -18 l -20 0 l 0 18" visibility="hidden" />
    <path class="z08" d="M 152 42 l 20 0 l 0 -20 l -20 0 l 0 20" visibility="hidden" />
    <path class="z09" d="M 172 43 l 20 0 l 0 -22 l -20 0 l 0 22" visibility="hidden" />
    <path class="z10" d="M 192 44 l 20 0 l 0 -24 l -20 0 l 0 24" visibility="hidden" />
    <path class="z11" d="M 212 45 l 20 0 l 0 -26 l -20 0 l 0 26" visibility="hidden" />

</svg>
`;
        const parser = new DOMParser();
        const doc = parser.parseFromString(s, "text/html");
        const fragment = doc.querySelector("svg");
        const d = document.createElement("div");
        d.innerHTML = s;
        scaleDom = fragment; //.querySelector("svg");
    }
    return scaleDom.cloneNode(true);
}

const SCALES =
    // [591657550.5, 295828775.3, 147914387.6, 73957193.82, 36978596.91, 18489298.45, 9244649.227, 4622324.614, 2311162.307, 1155581.153, 577790.5767, 288895.2884, 144447.6442, 72223.82209, 36111.91104, 18055.95552, 9027.977761, 4513.98888, 2256.99444, 1128.49722];
    [0, 0, 0, 0, 0, 17471320.7509, 8735660.37545, 4367830.18772, 2183915.09386, 1091957.54693, 545978.773466, 272989.386733, 136494.693366, 68247.3466832, 34123.6733414, 17061.8366707, 8530.91833536, 4265.45916786, 2132.72958393, 1066.36479179];

class LayerNode extends TreeNode {
    infoIcon: HTMLSpanElement;

    constructor(layer: LayerWrapper) {
        super(layer);
    }

    render(inset?: number): HTMLElement {
        // const col = TreeNode.getTreePath(this).length;
        if (!inset) {
            inset = 0;
        }

        let dom = this.dom;
        let treerow = this.treerow;
        if (!dom) {
            dom = this.dom = document.createElement("div");
            dom.className = "row-wrapper row-wrapper-" + inset;
            treerow = this.treerow = document.createElement("div");
            dom.appendChild(treerow);
            // treerow.id = "treerow" + TreeNode.nodeCounter++
            treerow.className = "treerow";
            // const cb: HTMLInputElement = this._createCeckBox();
            const cb = document.createElement("div");
            cb.className = "cb_layer";

            let chBox: HTMLInputElement;
            chBox = this.chBox = document.createElement("input");
            chBox.type = "checkbox";
            chBox.id = "cb" + this.data.id;
            // chBox.className = "regular-checkbox";
            // chBox.setAttribute("aria-label", );
            // chBox.checked = this.selectionStatus === SelectionStatus.SELECTED || this.selectionStatus === SelectionStatus.INDETERMINATE;
            // chBox.indeterminate = this.selectionStatus === SelectionStatus.INDETERMINATE;
            chBox.addEventListener("change", (ev) => this.onchBoxChange(ev));
            cb.appendChild(chBox);
            treerow.appendChild(cb);
            const label = document.createElement("label");
            label.htmlFor = "cb" + this.data.id;
            // treerow.appendChild(label);
            cb.appendChild(label);
            // label.addEventListener("click", function () {
            //     cb.click();
            // });
            const layer = <LayerWrapper>this.data;
            // console.info('LayerControlVar.LayerNodeRenderer.render', layer);

            const layerTitle = createHtmlElement("div", treerow, "layer-title tooltip");

            const txt = layer.layerDescription.label;
            if (!txt) {
                debugger;
            }
            layerTitle.innerHTML = txt;
            layerTitle.dataset.tooltip = txt;
            layerTitle.setAttribute("data-tooltip", txt);
            layerTitle.title = txt;

            if (layer.layerDescription.type === "WMS") {
                const f = (ev: Event) => {
                    // console.info("setOpacity", (<any>layer.layer).options.opacity);
                    const v = 0.01 * parseInt((<any>ev.target).value);
                    if (layer.layer) {
                        (<any>layer.layer).setOpacity(v);
                    } else {
                        layer.layerDescription.options["opacity"] = v;
                    }
                };
                // const v = layer.layer?.["options"].opacity ?? layer.layerDescription?.options?.["opacity"] || 1;
                const v = layer.layerDescription?.options?.["opacity"] ?? 1;
                const dV = 100 * parseFloat(v);

                const slider = createSlider("0", "100", dV.toString(), f, "opacity-slider");
                // console.info("slider", layer.layerDescription.label, v, dV);
                // layerTitle.appendChild(slider);
                dom.appendChild(slider);
            }

            if (layer.layerDescription.minScale || layer.layerDescription.maxScale) {
                // const img = document.createElement("img");
                // img.src = "images/scale2.svg";
                // layerTitle.appendChild(img);
                // console.info("MinMax", layer);

                for (let i = 8; i <= 19; i++) {
                    // console.error("zoom " + i + "  scale=" + L.CRS["scale"](i));
                    const scale = SCALES[i];
                    if (layer.layerDescription.minScale && scale < layer.layerDescription.minScale) {
                        dom.classList.add("z" + i + "disabled");
                    }
                    if (layer.layerDescription.maxScale && scale > layer.layerDescription.maxScale) {
                        dom.classList.add("z" + i + "disabled");
                    }
                }
                dom.appendChild(createZoomScale());
                console.info("zoomScale", layer.layerDescription.label, dom);
            }

            const infoIcon = (this.infoIcon = createHtmlElement("span", treerow, "info-icon"));

            infoIcon.addEventListener("click", (ev) => {
                MapDispatcher.onShowLayerInfoRequest.dispatch(this, layer);
            });
        }
        return dom;
    }

    setStatus(status: "waiting" | "error" | "ok") {
        switch (status) {
            case "waiting":
                this.infoIcon.classList.remove("error");
                this.infoIcon.classList.add("waiting");
                break;
            case "error":
                this.infoIcon.classList.remove("waiting");
                this.infoIcon.classList.add("error");
                break;
            default:
                this.infoIcon.classList.remove("error");
                this.infoIcon.classList.remove("waiting");
        }
    }
}
/**
 *  Nodes for Tree "Meine Kartenauswahl"
 */
class Tree2Node extends TreeNode {
    fChangeNodeOrder: (evt: ChangeNodeOrderEvent) => void;

    onTreeDeleteIconClick = new EventDispatcher<TreeNode, any>();
    infoIcon: HTMLSpanElement;

    constructor(data: LayerWrapper, childs?: Array<TreeNode>, params?: TreeNodeParam) {
        super(data, childs, params);
        this.fChangeNodeOrder = params.fChangeNodeOrder;
    }

    render(inset: number): HTMLElement {
        console.info(`Tree2Node.render selectMode=${this.getSelectMode()}`);
        let dom = this.dom;
        // let treerow = this.treerow
        if (!dom) {
            dom = this.dom = document.createElement("div");
            dom.className = "row-wrapper";
            const treerow = (this.treerow = document.createElement("div"));
            //  treerow.id = "treerow" + nodeCounter
            treerow.className = "treerow";

            dom.appendChild(treerow);

            // const selectMode = this.getSelectMode();
            const span = document.createElement("div");
            span.className = "treeicon";

            const deleteIcon = document.createElement("i");
            deleteIcon.className = "clear-icon";
            deleteIcon.addEventListener("click", (ev) => this.onTreeDeleteIconClick.dispatch(this, undefined));

            const spanOpenClose = (this.spanOpenClose = document.createElement("span"));
            spanOpenClose.addEventListener("click", (ev) => this.onTreeIconClick(ev));

            // if (selectMode === SelectionMode.SINGLE) {
            //     treerow.addEventListener('click', (ev) => this.itemClicked(ev));
            // }

            treerow.className = "treerow leaf";

            this.textNode = spanOpenClose;
            span.appendChild(deleteIcon);
            span.appendChild(spanOpenClose);

            const cb: HTMLInputElement = this._createCeckBox();
            span.appendChild(cb);
            const label = document.createElement("label");
            span.appendChild(label);
            label.addEventListener("click", function () {
                cb.click();
            });

            treerow.appendChild(span);
            const labelDiv = document.createElement("div");
            labelDiv.className = "treelabel";
            // const label = this.nodeRenderer.render(this)

            const txt = this.data.layerDescription["label"];

            const layerTitle = createHtmlElement("span", treerow, "layer-title tooltip");
            layerTitle.innerHTML = txt;
            layerTitle.dataset.tooltip = txt;
            layerTitle.setAttribute("data-tooltip", txt);
            layerTitle.title = txt;

            const infoIcon = (this.infoIcon = createHtmlElement("span", treerow, "info-icon"));
            // infoIcon.innerHTML = '&#xf05a;';
            infoIcon.addEventListener("click", (ev) => {
                MapDispatcher.onShowLayerInfoRequest.dispatch(this, this.data);
            });

            if (this.fChangeNodeOrder) {
                const divUpDown = createHtmlElement("div", treerow, "change-layer-order");
                const up = createHtmlElement("div", divUpDown, "up");
                const down = createHtmlElement("div", divUpDown, "down");
                up.addEventListener("click", (ev) => this.nodeUp());
                down.addEventListener("click", (ev) => this.nodeDown());
            }

            if (this.actions) {
                treerow.appendChild(this.renderActions());
            }

            let nodecontainer = this.childDom;
            if (nodecontainer) {
                nodecontainer.innerHTML = null;
            }
            this.dom.style.display = "flex";
        }
        return dom;
    }
    nodeUp(): any {
        console.info("Tree2Node.layerUp", this);
        this.fChangeNodeOrder({ node: this, up: true });
    }
    nodeDown(): any {
        console.info("Tree2Node.layerDown", this);
        this.fChangeNodeOrder({ node: this, up: false });
    }

    setStatus(status: "waiting" | "error" | "ok") {
        switch (status) {
            case "waiting":
                this.infoIcon.classList.remove("error");
                this.infoIcon.classList.add("waiting");
                break;
            case "error":
                this.infoIcon.classList.remove("waiting");
                this.infoIcon.classList.add("error");
                break;
            default:
                this.infoIcon.classList.remove("error");
                this.infoIcon.classList.remove("waiting");
        }
    }

    // setStatusWait(isWaiting:boolean):void {
    //     if (isWaiting) {
    //         this.infoIcon.classList.add("rotate");
    //         this.infoIcon.innerHTML = '&#xf021;';
    //     } else {
    //         this.infoIcon.classList.remove("rotate");
    //         this.infoIcon.innerHTML = '&#xf05a;';
    //     }
    // }
}

const themeNodeRender = new ThemeNodeRenderer();

export class LayerControlVar extends L.Control {
    static catNodeParam: TreeNodeParam = {
        attName2Render: "bezeichnung",
        selectMode: SelectionMode.MULTI,
    };

    _dom: HTMLElement;

    _map: L.Map;
    tree: Tree;
    className: string;

    categorieLayers: { [id: string]: CategorieLayer<any, any> } = {};
    categorieLayerNodes: { [id: string]: TreeNode } = {};

    mapLayerId2OverlayNodes: { [id: string]: LayerNode } = {};

    mapLayerId2MyLayerNodes: { [id: string]: Tree2Node } = {};

    baseLayerDefOptions: LayerDefinitionOptions;
    themes: Theme[];
    parentNode: HTMLElement;

    tree2: Tree;

    fChangeLayerOrder: (evt: ChangeNodeOrderEvent) => void;
    fThemeLayerChanged: (node: TreeNode, sel: SelectionStatus) => void;
    fMyThemesLayerChanged: (node: TreeNode, sel: SelectionStatus) => void;
    fMyThemesDeleteLayer: (node: Tree2Node) => void;

    accordion: Accordion;

    constructor(options?: LayerControlOptions) {
        super(options);
        // console.info("LayerControlVar.construct")
        if (options.className) {
            this.className = options.className;
        }
        if (options.parentNode) {
            this.parentNode = options.parentNode;
            // layerRenderer.showLegend = false;
        }
        this._createTree();
        this._createTree2();

        this.fChangeLayerOrder = (ev: ChangeNodeOrderEvent) => this.changeLayerOrder(ev);
        this.fThemeLayerChanged = (node: TreeNode, sel: SelectionStatus) => this.themeLayerChanged(node, sel);

        this.fMyThemesLayerChanged = (node: TreeNode, sel: SelectionStatus) => this.myThemesLayerChanged(node, sel);
        this.fMyThemesDeleteLayer = (node: Tree2Node) => this.myThemesDeleteLayer(node);

        MapDispatcher.onLayerRequest.subscribe((sender, ev) => this.onLayerRequested(sender, ev));
        MapDispatcher.onLayerReady.subscribe((sender, ev) => this.onLayerReady(sender, ev));
        MapDispatcher.onLayerError.subscribe((sender, ev) => this.onLayerError(sender, ev));
    }

    changeLayerOrder(ev: ChangeNodeOrderEvent): void {
        console.info("jkdsfhshfk");
        if (ev.up) {
            this.tree2.moveNodeUp(ev.node);
            ev.node.data.layer.bringToBack();
        } else {
            this.tree2.moveNodeDown(ev.node);
            ev.node.data.layer.bringToFront();
        }
        // const lwArray:LayerWrapper[] = [];
        // const nodes = this.tree2.nodes;
        // for (let i=0; i<nodes.length; i++) {
        //     (<any>nodes[i].data.layer).setZIndex(i+1);
        // };
        // MapDispatcher.onLayerOrderChanged.dispatch(this, {type:'order-changed', layers:lwArray})
        console.info("changeLayerOrder", ev);
    }

    private _layerAdded(evt: LayerEvent) {
        this.tree.selectNode(evt.layer);
    }
    private _layerRemoved(evt: LayerEvent) {
        this.tree.unselectNode(evt.layer);
    }

    nodeChanged(group: string, node: TreeNode, sel: SelectionStatus) {
        console.info(`nodeChanged ${group} ${node.data.name}, ${SelectionStatus[sel]}`);
    }

    _baseLayerChanged(layer: L.Layer) {
        MapDispatcher.onBaseLayerSelection.dispatch(<any>this, layer);
    }

    themeLayerChanged(node: TreeNode, sel: SelectionStatus) {
        console.info(`LayerControlVar.themeLayerChanged ${SelectionStatus[sel]}`, node);
        const isSelected = sel === SelectionStatus.SELECTED;
        const layer = <LayerWrapper>node.data;

        let tree2node = this.mapLayerId2MyLayerNodes[layer.id];
        if (tree2node) {
            tree2node.setSelected(isSelected);
            // rtr TODO
            // } else {
            //     tree2node = new Tree2Node(layer, null, { fChangeNodeOrder: this.fChangeLayerOrder });
            //     tree2node.onSelectionChange.subscribe(this.fMyThemesLayerChanged);
            //     tree2node.onTreeDeleteIconClick.subscribe(this.fMyThemesDeleteLayer);
            //     this.tree2.addNode(tree2node);
            //     this.mapLayerId2MyLayerNodes[layer.id] = tree2node;
            //     tree2node.setSelected(isSelected);
            //     this.accordion.items[1].setCollapsed(false);
        }
        layer.setSelected(isSelected);
    }

    myThemesLayerChanged(node: TreeNode, sel: SelectionStatus) {
        const isSelected = sel === SelectionStatus.SELECTED;
        const layer = <LayerWrapper>node.data;
        layer.setSelected(isSelected);
    }

    clearThemes() {
        for (let k in this.mapLayerId2MyLayerNodes) {
            const tree2node = this.mapLayerId2MyLayerNodes[k];
            this.myThemesDeleteLayer(tree2node);
        }
        this.tree.nodes.forEach((item) => item.collapse());
    }

    myThemesDeleteLayer(node: TreeNode) {
        const layer = <LayerWrapper>node.data;
        const tree2node = this.mapLayerId2MyLayerNodes[layer.id];
        console.info(`myThemesDeleteLayer ${tree2node === node}`);
        if (tree2node) {
            tree2node.setSelected(false);
            this.tree2.removeNode(tree2node);
            delete this.mapLayerId2MyLayerNodes[layer.id];
        }
    }

    baseLayerChanged(node: TreeNode, sel: SelectionStatus) {
        // console.info(`baseLayerChanged ${SelectionStatus[sel]}`, node);
        if (!node.data.layer) {
            this.baseLayerDefOptions.createLayer(node.data).then((layer) => {
                node.data.layer = layer;
                this._baseLayerChanged(layer);
            });
        } else {
            this._baseLayerChanged(node.data.layer);
        }
    }

    selectThemeLayer(layerDescr: LayerDescription) {
        // console.info("selectThemeLayer");
        this.tree.selectNode(layerDescr);
    }

    addThemes(themes: Theme[]) {
        this.themes = themes;
        MapDispatcher.onLayerAdded.subscribe((sender, evt) => this._layerAdded(evt));
        MapDispatcher.onLayerRemoved.subscribe((sender, evt) => this._layerRemoved(evt));
        if (this.tree) {
            this._addThemesToTree();
        }
    }

    private _createTree2() {
        this.tree2 = new Tree(null, { selectMode: SelectionMode.MULTI, expandOnlyOneNode: true });
    }

    private _createTree() {
        console.info("LayerControlVar._createTree");
        this.tree = new Tree(null, { selectMode: SelectionMode.MULTI, expandOnlyOneNode: true });
        // for (const title in this.overlays) {
        //     this._addOverlayToTree(title, this.overlays[title]);
        // }

        // for (const title in this.categorieLayers) {
        //     this._addCategorieLayerToTree(title, this.categorieLayers[title]);
        // }
    }

    private _createThemNode(theme: Theme): ThemeTreeNode {
        const themeNode = new ThemeTreeNode(theme, null, { nodeRenderer: themeNodeRender });
        if (theme.themes) {
            theme.themes.forEach((theme) => {
                const themeNode2 = this._createThemNode(theme);
                themeNode.addNode(themeNode2);
            });
        }
        if (theme.layers) {
            theme.layers.forEach((layer) => {
                const layerNode = new LayerNode(layer);
                this.mapLayerId2OverlayNodes[layer.id] = layerNode;
                layerNode.onSelectionChange.subscribe(this.fThemeLayerChanged);
                themeNode.addNode(layerNode);
            });
        }
        return themeNode;
    }

    private _addThemesToTree() {
        console.info(`_addThemesToTree ${this.tree}`);
        if (this.tree) {
            const themeNodes: TreeNode[] = [];
            if (this.themes) {
                this.themes.forEach((theme) => {
                    const themeNode = this._createThemNode(theme);
                    if (themeNode.childs && themeNode.childs.length > 0) {
                        themeNodes.push(themeNode);
                        // this.tree.addNode(themeNode);
                    }
                });
                this.tree.addNodes(themeNodes);
            }
        }
    }

    _addCategorieLayerToTree(title: string, categorieLayer: CategorieLayer<any, any>) {
        console.info(`_addCategorieLayerToTree ${this.tree}`);
        if (this.tree) {
            const categories = categorieLayer.getCategories();
            const treeNode = new TreeNode(title);
            this.tree.addNode(treeNode);
            this.addCategories(treeNode, categories);
            this.categorieLayerNodes[title] = treeNode;
            treeNode.onSelectionChange.subscribe((node, status) => this._categorieSelected(title, treeNode, status));
        }
    }

    _addOverlayToTree(title: string, overlays: BaseLayerDefinition[]) {
        // console.warn(`_addCategorieLayerToTree ${this.tree}`);
        if (this.tree) {
            const treeNode = new TreeNode(title, undefined, { selectMode: SelectionMode.MULTI });
            this.tree.addNode(treeNode);
            overlays.forEach((baseLayerDef) => {
                const treeNode = new TreeNode(baseLayerDef, null, { selectMode: SelectionMode.MULTI });
                treeNode.addNode(treeNode);
            });
            // treeNode.onSelectionChange.subscribe((node, status) => this._themeSelected(title, treeNode, status));
        }
    }

    addTo(map: L.Map): this {
        // console.error('LayerControl.addTo');
        if (this.parentNode) {
            this.remove();
            this._map = map;
            const container = ((<any>this)._container = this.onAdd(map));
            container.classList.add("layerctrl-dom");
            this.parentNode.appendChild(container);
            this._map.on("unload", this.remove, this);
            return this;
        } else {
            return super.addTo(map);
        }
    }

    onAdd(map: L.Map): HTMLElement {
        console.info("LayerControl.onAdd");
        this._map = map;
        let dom = this._dom;
        if (!dom) {
            const domTree = this.tree._render();
            if (this.className) {
                domTree.classList.add(this.className);
            }
            const item1 = new AccordionItem("Themen", domTree);
            const domTree2 = this.tree2._render();
            if (this.className) {
                domTree2.classList.add(this.className);
            }
            const accordion = (this.accordion = new Accordion([new AccordionItem("Kartenauswahl", domTree), new AccordionItem("Meine Kartenauswahl", domTree2)]));
            dom = accordion.render();
            // dom.appendChild(domTree);
        }
        // TODO disableEvtPropagation(dom);
        return dom;
    }
    onRemove(map: L.Map) {
        // console.error("LayerControl.onRemove");
    }

    findCategorie(title: string, item: Category): TreeNode[] {
        console.info("findCategorie", item);
        const node: TreeNode = this.categorieLayerNodes[title];
        if (node) {
            return node.findNode(item.id, "id");
        }
    }

    findItemsOfCategorie(title: string, item: Category): CategoryMapObject<any>[] {
        console.info("findItemsOfCategorie", item);
        const node: TreeNode = this.categorieLayerNodes[title];
        if (node) {
            const nodes = node.findNode(item.id, "id");
            if (nodes) {
                const path = [];
                for (let i = nodes.length - 2; i >= 0; i--) {
                    path.push(nodes[i].data.id);
                }
                console.info("path", path);
                const layer = this.categorieLayers[title];
                if (layer) {
                    return layer.getItems(path);
                }
            }
        }
    }

    showCategorie(title: string, item: any) {
        console.info("showCategorie", item);
        const node: TreeNode = this.categorieLayerNodes[title];
        if (node) {
            node.selectNode(item.id, "id");
        }
    }

    showMarker(title: string, id: any, prop: string) {
        console.info(`showmarker(${title}, ${id}, ${prop})`);
        const layer = this.categorieLayers[title];
        if (layer) {
            const marker = layer.showMarker(id, prop);
        }
    }

    getItems(title: string, path: Path<any>): CategoryMapObject<any>[] {
        console.info(`getItems(${title}, ${path})`);
        const layer = this.categorieLayers[title];
        return layer.getItems(path);
    }

    addCategorieLayer(title: string, categorieLayer: CategorieLayer<any, any>, showAll?: boolean) {
        this.categorieLayers[title] = categorieLayer;
        console.info("addCategorieLayer");
        if (this.tree) {
            this._addCategorieLayerToTree(title, categorieLayer);
            if (showAll) {
                this.tree.selectNode(title);
            }
        }
    }
    private _categorieSelected(layerTitle: string, node: TreeNode, status: SelectionStatus): void {
        console.info("_categorieSelected", node, status);
        const selectedCats = this._findSelected(node.childs);
        const categoryLayer = this.categorieLayers[layerTitle];
        if (categoryLayer) {
            categoryLayer.setKategories(selectedCats);
        }
    }

    // private _themeSelected(theme: string, node: TreeNode, status: SelectionStatus): void {
    //     console.error("_themeSelected", theme, node, status);
    // }

    private _findSelected(nodes: TreeNode[]): number[][] {
        const ids = [];
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].getSelectionsStatus() === SelectionStatus.SELECTED) {
                ids.push([nodes[i].data.id]);
            } else {
                if (nodes[i].getSelectionsStatus() === SelectionStatus.INDETERMINATE) {
                    const chIds = this._findSelected(nodes[i].childs);
                    for (let j = 0; j < chIds.length; j++) {
                        ids.push([nodes[i].data.id, ...chIds[j]]);
                    }
                }
            }
        }
        return ids;
    }

    private addCategories(base: Tree | TreeNode, categories: Category[]) {
        for (let i = 0; i < categories.length; i++) {
            const treeNode = new TreeNode(categories[i], null, LayerControl.catNodeParam);
            if (categories[i].childs) {
                this.addCategories(treeNode, categories[i].childs);
            }
            base.addNode(treeNode);
        }
    }

    onLayerReady(sender: LayerLoader, ev: LayerEvent): void {
        console.info(`onLayerReady`, sender, ev);
        this.mapLayerId2OverlayNodes[ev.layer.id]?.setStatus("ok");
        if (this.mapLayerId2MyLayerNodes[ev.layer.id]) {
            this.mapLayerId2MyLayerNodes[ev.layer.id]?.setStatus("ok");
        } else {
            const tree2node = new Tree2Node(ev.layer, null, { fChangeNodeOrder: this.fChangeLayerOrder });
            tree2node.onSelectionChange.subscribe(this.fMyThemesLayerChanged);
            tree2node.onTreeDeleteIconClick.subscribe(this.fMyThemesDeleteLayer);
            this.tree2.addNode(tree2node);
            this.mapLayerId2MyLayerNodes[ev.layer.id] = tree2node;
            tree2node.setSelected(true);
            tree2node.setStatus("ok");
            this.accordion.items[1].setCollapsed(false);
        }
    }
    onLayerRequested(sender: MapControl, ev: LayerEvent): void {
        console.info(`onLayerRequested`, sender, ev);
        this.mapLayerId2OverlayNodes[ev.layer.id]?.setStatus("waiting");
        this.mapLayerId2MyLayerNodes[ev.layer.id]?.setStatus("waiting");
    }
    onLayerError(sender: LayerLoader, ev: LayerEvent): void {
        console.info(`onLayerRequested`, sender, ev);
        this.mapLayerId2OverlayNodes[ev.layer.id]?.setStatus("error");
        this.mapLayerId2MyLayerNodes[ev.layer.id]?.setStatus("error");
        this.mapLayerId2OverlayNodes[ev.layer.id]?.setSelected(false);
        this.mapLayerId2MyLayerNodes[ev.layer.id]?.setSelected(false);
    }
}
