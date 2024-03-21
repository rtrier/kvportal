import * as L from "leaflet";
import { createHtmlElement } from "../Util";
import { BaseLayerDefinition, LayerControlOptions, LayerDefinitionOptions } from "./LayerControl";
import { MapDispatcher } from "./MapControl";

export class BaseLayerSelectorCtrl extends L.Control {
    dom: HTMLElement;

    baseLayerDefinitions: BaseLayerDefinition[];

    baseLayerDefinition: BaseLayerDefinition;
    visibleBaseLayerDefinition: BaseLayerDefinition;

    baseLayerDefOptions: LayerDefinitionOptions;
    iconContainer: HTMLDivElement;

    mapId2IconNode: { [id: string]: HTMLElement } = {};

    baseLayer: L.Layer;

    isOpen = false;
    _mutationObserver: MutationObserver;
    state: string = "closed";
    inAnimation: boolean = false;
    lastEvent: string;
    fOnLeave: (evt: MouseEvent) => void;
    fOnEnter: (evt: MouseEvent) => void;
    ignore: boolean = false;
    animationEventHandler: (evt: AnimationEvent | MouseEvent) => void;

    constructor(options: LayerControlOptions) {
        super(options);
    }

    createIcons() {
        if (!this.iconContainer) {
            const c = (this.iconContainer = createHtmlElement("div", undefined, "baselayerctrl-iconcontainer"));

            const closeBttn = createHtmlElement("div", c, "baselayerctrl-close-bttn");
            closeBttn.id = "baselayerctrl-close-bttn";
            closeBttn.addEventListener("click", () => {
                console.info("close-bttn.clicked");
                this.ignore = true;
                this.iconContainer.removeEventListener("mouseenter", (evt: MouseEvent) => this.onEnter(evt));
                this.dom.removeEventListener("animationstart", this.animationEventHandler);
                this.dom.removeEventListener("animationend", this.animationEventHandler);
                this.dom.classList.toggle("open");
            });

            // this.baseLayerDefinitions.forEach((item) => {
            for (let i = this.baseLayerDefinitions.length - 1; i >= 0; i--) {
                const item = this.baseLayerDefinitions[i];
                const d = createHtmlElement("div", c, "baselayerctrl-bttn");
                const icon = createHtmlElement("div", d, "baselayerctrl-item");
                const span = createHtmlElement("span", d);
                const label = item["shortLabel"];
                span.innerHTML = label;
                d.title = label;
                d.id = "d-" + label;
                // console.info('item', item, "url(\""+ item.img +"\")");
                icon.style.backgroundImage = 'url("' + item.img + '")';
                d.addEventListener("click", (evt) => {
                    // if (this.isOpen) {
                    this.baseLayerIconClicked(evt, item);
                    // } else {
                    //     this.dom.classList.toggle("open");
                    //     this.isOpen = true;
                    // }
                });
                if (this.baseLayerDefinition === item) {
                    d.classList.add("current");
                }
                if (this.visibleBaseLayerDefinition === item) {
                    d.classList.add("selected");
                }
                this.mapId2IconNode[label] = d;
            }

            this.iconContainer.addEventListener("mouseenter", (evt: MouseEvent) => this.onEnter(evt));
            this.iconContainer.addEventListener("mouseleave", (evt: MouseEvent) => this.onLeave(evt));
            return c;
        }
    }

    onEnter(evt: MouseEvent) {
        console.info(evt.type + " this.ignore:" + this.ignore + " " + this.lastEvent + "=>onEnter", evt);
        this.lastEvent = "onEnter";
        if (!this.ignore) {
            this.dom.classList.add("open");
        }
    }
    onLeave(evt: MouseEvent) {
        console.info(evt.type + " this.ignore:" + this.ignore + " " + this.lastEvent + "=>onLeave");
        this.lastEvent = "onLeave";
        this.dom.classList.remove("open");
    }

    onAdd(map: L.Map): HTMLElement {
        if (!this.dom) {
            const div = createHtmlElement("div", undefined, "baselayerctrl");
            const f = (evt: AnimationEvent | MouseEvent) => {
                if (evt instanceof AnimationEvent) {
                    // console.info(evt.type + "  " + evt.animationName + " this.ignore:" + this.ignore + " " + this.lastEvent + "  " + (<HTMLElement>evt.target).id);
                    if (evt.animationName === "delayed_close") {
                        if (evt.type === "animationstart") {
                            this.ignore = true;
                        } else {
                            this.ignore = false;
                            if (this.lastEvent === "onEnter") {
                                this.dom.classList.add("open");
                            }
                        }
                    }
                }
            };
            this.animationEventHandler = f;

            div.addEventListener("animationstart", f);
            div.addEventListener("animationend", f);
            div.addEventListener("animationcancel", f);

            if (this.baseLayerDefinitions) {
                this.dom.insertBefore(this.createIcons(), this.dom.firstChild);
            }

            this.dom = div;
        }
        return this.dom;
    }

    setBaseLayers(baseLayers: BaseLayerDefinition[], options?: LayerDefinitionOptions) {
        this.baseLayerDefinitions = baseLayers;
        this.baseLayerDefOptions = options;
        // this.labelAttribute = options?.labelAttribute || 'label';

        if (this.dom) {
            this.dom.insertBefore(this.createIcons(), this.dom.firstChild);
            const openBttn = createHtmlElement("div", this.dom, "baselayerctrl-open-bttn");
            openBttn.id = "open-bttn";
            openBttn.addEventListener("click", () => {
                console.info("openbttn.click");
                this.dom.classList.toggle("open");
            });
        }
        this.selectBaseLayer(this.baseLayerDefinitions[0]);
    }

    _updateItemIcon(baseLayer: BaseLayerDefinition): void {
        // console.error("_updateItemIcon vis=" + (this.visibleBaseLayerDefinition ? this.visibleBaseLayerDefinition["shortLabel"] : "") + "  newBaseL=" + baseLayer["shortLabel"]);
        if (!baseLayer) {
            return;
        }
        if (this.baseLayerDefinition) {
            const node = this.mapId2IconNode[this.baseLayerDefinition["shortLabel"]];
            node.classList.remove("current");
        }
        const node = this.mapId2IconNode[baseLayer["shortLabel"]];
        if (node) {
            node.classList.add("current");
        }
        let visibleNode: HTMLElement;
        if (this.visibleBaseLayerDefinition) {
            console.info("vis ");
            const node = this.mapId2IconNode[this.visibleBaseLayerDefinition["shortLabel"]];
            node.classList.remove("selected");
            if (baseLayer === this.baseLayerDefinitions[1]) {
                visibleNode = this.mapId2IconNode[this.baseLayerDefinitions[0]["shortLabel"]];
                // node.classList.add("selected");
                // node.parentElement.in
                this.visibleBaseLayerDefinition = this.baseLayerDefinitions[0];
                console.info("visibleBaseLayerDefinition");
            } else {
                visibleNode = this.mapId2IconNode[this.baseLayerDefinitions[1]["shortLabel"]];
                // node.classList.add("selected");
                this.visibleBaseLayerDefinition = this.baseLayerDefinitions[1];
            }
        } else {
            visibleNode = this.mapId2IconNode[this.baseLayerDefinitions[1]["shortLabel"]];
            this.visibleBaseLayerDefinition = this.baseLayerDefinitions[1];
        }
        visibleNode.classList.add("selected");

        // for (let i = 0; i < visibleNode.parentElement.children.length; i++) {
        //     console.info(i + "  " + visibleNode.parentElement.children.item(i).id);
        // }

        visibleNode.parentElement.appendChild(visibleNode);
    }

    selectBaseLayer(newBaseLayer: BaseLayerDefinition | number): void {
        // console.error("selectBaseLayer", this.baseLayerDefinitions, newBaseLayer);
        // const bsl = baseLayer.img === "mapicons/sat.png" ? this.baseLayerDefinitions[0] : this.baseLayerDefinitions[2];

        // this._selectItemIcon(this.baseLayerDefinition, false);
        let baseLayer: BaseLayerDefinition;
        if (typeof newBaseLayer === "number") {
            baseLayer = this.baseLayerDefinitions[0];
        } else {
            baseLayer = newBaseLayer;
        }

        this._updateItemIcon(baseLayer);
        this.baseLayerDefinition = baseLayer;
        MapDispatcher.onBaseLayerSelection.dispatch(<any>this, baseLayer.layer);
        MapDispatcher.onBaseLayerSelection.dispatch(<any>this, baseLayer.layer);
    }

    baseLayerIconClicked(evt: MouseEvent, baseLDef: BaseLayerDefinition): void {
        console.error("baseLayerIconClicked: " + (<any>evt.target).title, evt);
        if (!baseLDef.layer) {
            this.baseLayerDefOptions.createLayer(baseLDef).then((layer) => {
                baseLDef.layer = layer;
            });
        }
        this.selectBaseLayer(baseLDef);
        // this.dom.classList.toggle("open");
    }
}
