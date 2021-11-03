import * as L from 'leaflet';
import { createHtmlElement } from '../Util';
import { BaseLayerDefinition, LayerControlOptions, LayerDefinitionOptions } from './LayerControl';
import { MapDispatcher } from './MapControl';


export class BaseLayerSelectorCtrl extends L.Control {

    _map: L.Map;
    dom: HTMLElement;

    _isCollapsed = true;

    baseLayerDefinitions: BaseLayerDefinition[];
    baseLayerDefinition: BaseLayerDefinition;

    baseLayerDefOptions: LayerDefinitionOptions;    
    iconContainer: HTMLDivElement;

    mapId2baseLayer: { [id: string]: BaseLayerDefinition } = {};
    mapId2IconNode: { [id: string]: HTMLElement } = {};

    
   
    baseLayer: L.Layer;
    labelAttribute: string;
    icon: HTMLDivElement;
    bttn: HTMLDivElement;
    span: HTMLSpanElement;

    isOpen = false;

    constructor(options: LayerControlOptions) {
        super(options);
        console.info(options);
    }


    createIcons() {
        if (!this.iconContainer) {
            const c  = this.iconContainer = createHtmlElement('div', undefined, 'baselayerctrl-iconcontainer');
            this.baseLayerDefinitions.forEach(item => {
                const d  = createHtmlElement('div', c, 'baselayerctrl-bttn');
                const icon  = createHtmlElement('div', d, 'baselayerctrl-item');
                const span =  createHtmlElement('span', d);
                const label = item["shortLabel"];
                span.innerHTML = label;
                d.title = label;
                console.info('item', item, "url(\""+ item.img +"\")");
                icon.style.backgroundImage = "url(\""+ item.img +"\")";
                d.addEventListener('click', (evt)=> {
                    if (this.isOpen) {                    
                        this.baseLayerIconClicked(evt, item)
                    } else {
                        console.info("openLayerauswahl")
                        this.dom.classList.toggle('open');
                        this.isOpen = true;
                    }
                });
                if (this.baseLayerDefinition === item) {
                    d.classList.add('selected');
                }
                this.mapId2IconNode[label] = d;
            });
            const closeBttn = createHtmlElement('div', c, 'baselayerctrl-close-bttn');
            closeBttn.addEventListener('click', ()=>{
                this.dom.classList.toggle('open');
            });
            return c;
        }
    }
    
    onAdd(map: L.Map): HTMLElement {
        if (!this.dom) {
            const div = createHtmlElement('div', undefined, "baselayerctrl");
            if (this.baseLayerDefinitions) {                
                this.dom.insertBefore(this.createIcons(), this.dom.firstChild);
            }
            this.dom = div;
        }
        return this.dom;
    }
    onAdd1(map: L.Map): HTMLElement {
        this._map = map;
        if (!this.dom) {            
            const div = createHtmlElement('div', undefined, "baselayerctrl");            
            const bttn = this.bttn =  createHtmlElement('div', div, "baselayerctrl-bttn");
            this.icon =  createHtmlElement('div', bttn, "baselayerctrl-item");
            const span = this.span =  createHtmlElement('span', bttn);
            if (this.baseLayerDefinitions) {
                this.icon.style.backgroundImage = "url(\""+ this.baseLayerDefinition.img +"\")";
                span.innerHTML = this.baseLayerDefinition['shortLabel'];
            } else {
                span.innerHTML = "Karte";
            }
            bttn.addEventListener("click", (evt) =>this._click(evt));
            div.title = "Hintergrundkarte wählen";
            this.dom = div;
        }
        return this.dom;
    }

    setBaseLayers(baseLayers: BaseLayerDefinition[], options?: LayerDefinitionOptions) {
        this.baseLayerDefinitions = baseLayers;
        this.baseLayerDefOptions = options;
        this.labelAttribute = options?.labelAttribute || 'label';
        baseLayers.forEach(item => {
            this.mapId2baseLayer[item[this.labelAttribute]] = item;
        });
        this.selectBaseLayer(this.baseLayerDefinitions[0]);
        if (this.dom) {
            this.dom.insertBefore(this.createIcons(), this.dom.firstChild);  
        }
    }

    _selectItemIcon(baseLayer: BaseLayerDefinition, select:boolean) {
        if (!baseLayer) {
            return;
        }
        // const node = this.mapId2IconNode[baseLayer[this.labelAttribute]];
        const node = this.mapId2IconNode[baseLayer['shortLabel']];
        if (node) {
            if (select) {
                node.classList.add('selected');
            } else {
                node.classList.remove('selected');
            }
        }
    }
    
    selectBaseLayer(baseLayer: BaseLayerDefinition) {
        console.error("BaseLayerSelectorCtrl.setBaseLayer", baseLayer);
        this._selectItemIcon(this.baseLayerDefinition, false);
        this.baseLayerDefinition = baseLayer;
        MapDispatcher.onBaseLayerSelection.dispatch(<any>this, baseLayer.layer);
        this._selectItemIcon(this.baseLayerDefinition, true);
        MapDispatcher.onBaseLayerSelection.dispatch(<any>this, baseLayer.layer);
        if (this.icon) {
            this.icon.style.backgroundImage = "url(\""+ this.baseLayerDefinition.img +"\")";
            this.span.innerHTML = this.baseLayerDefinition['shortLabel'];
        }
    }    

    _click(evt:MouseEvent) {
        console.info(this, evt);
        evt.cancelBubble = true;
        evt.stopPropagation();

        if (!this.iconContainer) {
            
            const c  = this.iconContainer = createHtmlElement('div', undefined, 'baselayerctrl-iconcontainer');
            this.baseLayerDefinitions.forEach(item => {
                const d  = createHtmlElement('div', c, 'baselayerctrl-bttn');
                const icon  = createHtmlElement('div', d, 'baselayerctrl-item');
                const span =  createHtmlElement('span', d);
                const label = item["shortLabel"];
                span.innerHTML = label;
                d.title = label;
                console.info('item', item, "url(\""+ item.img +"\")");
                icon.style.backgroundImage = "url(\""+ item.img +"\")";
                d.addEventListener('click', (evt)=> {
                    closeBttn.style.display = 'none';
                    this.baseLayerIconClicked(evt, item)
                });
                if (this.baseLayerDefinition === item) {
                    d.classList.add('selected');
                }
                this.mapId2IconNode[label] = d;
            });
            const closeBttn = createHtmlElement('div', c, 'baselayerctrl-close-bttn');
            closeBttn.addEventListener('click', ()=>{
                this.dom.classList.toggle('open');
            });
            this.dom.insertBefore(c, this.dom.firstChild);
        }
        this.dom.classList.toggle('open');
        return true;
    }
    baseLayerIconClicked(evt: MouseEvent, baseLDef:BaseLayerDefinition): any {
        console.info('baseLayerIconClicked', evt, evt.currentTarget['baselayerdef']);
        // const title = (<HTMLElement>evt.currentTarget).title;
        // console.info('baseLayerIconClicked', evt, evt.currentTarget['baselayerdef'], title);
        
        // const baseLDef:BaseLayerDefinition = evt.target['title'];
        // const baseLDef:BaseLayerDefinition = this.mapId2baseLayer[title];
        if (!baseLDef.layer) {
            this.baseLayerDefOptions.createLayer(baseLDef)
                .then(layer => {
                    baseLDef.layer = layer;
                });
        }
        this.selectBaseLayer(baseLDef);
        this.dom.classList.toggle('open');
    }
}
