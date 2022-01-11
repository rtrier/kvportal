import * as L from 'leaflet';
import { createHtmlElement } from '../Util';
import { BaseLayerDefinition, LayerControlOptions, LayerDefinitionOptions } from './LayerControl';
import { MapDispatcher } from './MapControl';


export class BaseLayerSelectorCtrl extends L.Control {

    dom: HTMLElement;

    baseLayerDefinitions: BaseLayerDefinition[];
    baseLayerDefinition: BaseLayerDefinition;

    baseLayerDefOptions: LayerDefinitionOptions;    
    iconContainer: HTMLDivElement;

    mapId2IconNode: { [id: string]: HTMLElement } = {};
   
    baseLayer: L.Layer;

    isOpen = false;

    constructor(options: LayerControlOptions) {
        super(options);
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
                // console.info('item', item, "url(\""+ item.img +"\")");
                icon.style.backgroundImage = "url(\""+ item.img +"\")";
                d.addEventListener('click', (evt)=> {
                    if (this.isOpen) {                    
                        this.baseLayerIconClicked(evt, item)
                    } else {
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

    setBaseLayers(baseLayers: BaseLayerDefinition[], options?: LayerDefinitionOptions) {
        this.baseLayerDefinitions = baseLayers;
        this.baseLayerDefOptions = options;
        // this.labelAttribute = options?.labelAttribute || 'label';
        this.selectBaseLayer(this.baseLayerDefinitions[0]);
        if (this.dom) {
            this.dom.insertBefore(this.createIcons(), this.dom.firstChild);  
        }
    }

    _selectItemIcon(baseLayer: BaseLayerDefinition, select:boolean):void {
        if (!baseLayer) {
            return;
        }
        const node = this.mapId2IconNode[baseLayer['shortLabel']];
        if (node) {
            if (select) {
                node.classList.add('selected');
            } else {
                node.classList.remove('selected');
            }
        }
    }
    
    selectBaseLayer(baseLayer: BaseLayerDefinition):void {
        this._selectItemIcon(this.baseLayerDefinition, false);
        this.baseLayerDefinition = baseLayer;
        MapDispatcher.onBaseLayerSelection.dispatch(<any>this, baseLayer.layer);
        this._selectItemIcon(this.baseLayerDefinition, true);
        MapDispatcher.onBaseLayerSelection.dispatch(<any>this, baseLayer.layer);
    }    


    baseLayerIconClicked(evt: MouseEvent, baseLDef:BaseLayerDefinition):void {
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
