import * as L from 'leaflet'
import { Tree } from '../../../../treecomponent/src/ts/Tree';
import { RadioGroupTreeNode, SelectionMode, SelectionStatus, TreeNode, TreeNodeParam } from '../../../../treecomponent/src/ts/TreeNode';
import { LayerDescription, Theme } from '../conf/MapDescription';
import { CategorieLayer, Category, CategoryMarker, Path } from './CategorieLayer';

export class BaseLayerDefinition {
    id?:string|number;
    // name?:string;
    layer?:L.Layer;
    bounds?:L.LatLngBounds;
}

export class LayerDefinitionOptions {
    labelAttribute?:string;
    createLayer?:(layerDefintion:BaseLayerDefinition)=>Promise<L.Layer>;
}

export class LayerControlOptions implements L.ControlOptions {
    baseLayer?:L.Layer;
    baseLayers?:BaseLayerDefinition[];    
    baseLayerId?:string;
    position?: L.ControlPosition;
    className?:string;
}

export type ListEntry<T> = {
    item:T;
    dom:HTMLElement;
}


export class LayerControl extends L.Control {


    static catNodeParam:TreeNodeParam = {
        attName2Render:'bezeichnung',
        selectMode: SelectionMode.MULTI
    }

    baseLayerDefinitions:BaseLayerDefinition[];
    baseLayerDefinition:BaseLayerDefinition;

    map: L.Map;
    tree:Tree;
    baseLayer: L.Layer;
    className: string;

    categorieLayers: { [id: string] : CategorieLayer<any, any>; } = {};
    categorieLayerNodes: { [id: string] : TreeNode } = {};

    overlays: { [id: string] : BaseLayerDefinition[] } = {};
    baseLayerDefOptions: LayerDefinitionOptions;

    constructor(options?:LayerControlOptions) {
        super(options);
        if (options.className) {
            this.className = options.className;
        }
        if (options.baseLayers) {
            this.baseLayerDefinitions = options.baseLayers;
        }
        if (options.baseLayer) {
            this.baseLayer = options.baseLayer;
        }
        this._createTree();
    }



    nodeChanged(group:string, node:TreeNode, sel:SelectionStatus) {
        console.info(`nodeChanged ${group} ${node.data.name}, ${SelectionStatus[sel]}`);
    }

    _baseLayerChanged(layer:L.Layer) {
        const nBaseLayer = layer;        
        if (this.baseLayer) { 
            if (this.baseLayer===nBaseLayer) {
                return;
            }          
            this.baseLayer.remove();
        }
        if (this.map) {
            console.info('baseLayerChanged new', nBaseLayer);
            this.map.addLayer(nBaseLayer);
            this.baseLayer = nBaseLayer;
        }
    }

    baseLayerChanged(node:TreeNode, sel:SelectionStatus) {
        console.info(`baseLayerChanged ${node.data.name}, ${SelectionStatus[sel]}`);
        console.info('baseLayerChanged old', this.baseLayer);
        if (!node.data.layer) {
            node.data.layer = this.baseLayerDefOptions.createLayer(node.data)
            .then(layer=>this._baseLayerChanged(layer));
        }
        else {
            this._baseLayerChanged(node.data.layer);
        }
    }

    // addOverlays(theme:string, baseLayers: BaseLayerDefinition[], options?:LayerDefinitionOptions) {
    //     this.overlays[theme] = baseLayers;
    // }
    setBaseLayers(baseLayers: BaseLayerDefinition[], options?:LayerDefinitionOptions) {
        this.baseLayerDefinitions = baseLayers;
        this.baseLayerDefOptions = options;
        if (this.tree) {
            this._addBaseLayersToTree();
        }
    }    

    private _createTree() {
        console.info("_createTree");
        this.tree = new Tree(null, {selectMode:SelectionMode.MULTI});
        this._addBaseLayersToTree();
        for (const title in this.overlays) {
            this._addOverlayToTree(title, this.overlays[title]);
        }

        for (const title in this.categorieLayers) {
            this._addCategorieLayerToTree(title, this.categorieLayers[title]);
        }
    }

    _addBaseLayersToTree() {
        console.info(`_addBaseLayersToTree ${this.tree}`);
        if (this.tree) {
            const count = this.baseLayerDefinitions? this.baseLayerDefinitions.length : 0;
            if (count>0) {
                const baseLayerNodes:TreeNode[] = [];
                let nodeParam:TreeNodeParam;
                if (this.baseLayerDefOptions.labelAttribute) {
                    nodeParam = {attName2Render:this.baseLayerDefOptions.labelAttribute};
                }
                for (let i=0; i<count; i++) {
                    const baseLayerNode = new TreeNode(this.baseLayerDefinitions[i], null, nodeParam);
                    // baseLayerNode.onSelectionChange.subscribe((node, sel) =>this.baseLayerChanged(node,sel));
                    baseLayerNodes.push(baseLayerNode);
                    if (this.baseLayer && this.baseLayerDefinitions[i].layer===this.baseLayer) {
                        this.baseLayerDefinition = this.baseLayerDefinitions[i];
                    }
                }
                console.info(baseLayerNodes);
                const baseLNode = new RadioGroupTreeNode({name:"Grundkarte"}, baseLayerNodes);
                baseLNode.onSelectionChange.subscribe((node, sel) =>this.baseLayerChanged(node,sel));
                this.tree.addNode(baseLNode);
                
            }
            console.info("before setSeled")
            this.tree.selectNode(this.baseLayerDefinition);
            this.tree.onSelectionChange.subscribe((node, sel) =>this.nodeChanged('tree', node,sel));            
        }
    }

    _addCategorieLayerToTree(title:string, categorieLayer: CategorieLayer<any, any>) {     
        console.info(`_addCategorieLayerToTree ${this.tree}`);
        if (this.tree) {
            const categories = categorieLayer.getCategories();
            const treeNode = new TreeNode(title);
            this.tree.addNode(treeNode);
            this.addCategories(treeNode, categories);
            this.categorieLayerNodes[title] = treeNode;
            // treeNode.onSelectionChange.subscribe((node, status)=>this._categorieSelected(title, node, status));
            treeNode.onSelectionChange.subscribe((node, status)=>this._categorieSelected(title, treeNode, status));
        }
    }    

    _addOverlayToTree(title:string, overlays: BaseLayerDefinition[]) {     
        console.info(`_addCategorieLayerToTree ${this.tree}`);
        if (this.tree) {
            const treeNode = new TreeNode(title, undefined, {selectMode:SelectionMode.MULTI});
            this.tree.addNode(treeNode);
            overlays.forEach(baseLayerDef=>{
                const treeNode = new TreeNode(baseLayerDef, null, {selectMode:SelectionMode.MULTI, attName2Render:'label'});
                treeNode.addNode(treeNode);
            });
            treeNode.onSelectionChange.subscribe((node, status)=>this._themeSelected(title, treeNode, status));
        }
    }

    onAdd(map:L.Map):HTMLElement	{
        console.info("LayerControl.onAdd");
        if (!this.tree) {
            this._createTree();
        }
        
        console.info("addbaseLayer", this.baseLayer);
       
        this.map = map;
        this.map.addEventListener("movestart", (ev)=>{});
        this.map.addEventListener("moveend", (ev)=>{});
        const dom = this.tree._render();
        if (this.className) {
            dom.classList.add(this.className);
        }
        const fnStopPropagation = (ev:Event)=>{
            ev.stopPropagation();
            return true;
        };
        dom.addEventListener("pointermove", fnStopPropagation);        
        dom.addEventListener("dragstart", fnStopPropagation);
        dom.addEventListener("drag", fnStopPropagation);
        dom.addEventListener("wheel", fnStopPropagation);
        return dom;
    }
    onRemove(map:L.Map){
        console.info("LayerControl.onRemove");      
        this.map = null;
    }

    _findBaseLayerDefinition(baseLayerId:string):BaseLayerDefinition {
        for (let i=0; i<this.baseLayerDefinitions.length; i++) {
            if (this.baseLayerDefinitions[i].id===baseLayerId) {
                return this.baseLayerDefinitions[i];
            }
            if (this.baseLayerDefinitions[i].id.toString().toLowerCase()===baseLayerId.toLowerCase()) {
                return this.baseLayerDefinitions[i];
            }
        }
        return undefined;
    }

    findCategorie(title: string, item: Category):TreeNode[] {
        console.info("findCategorie", item);
        const node:TreeNode = this.categorieLayerNodes[title];        
        if (node) {
            return node.findNode(item.id, 'id');
        }
    }



    findItemsOfCategorie(title: string, item: Category):CategoryMarker<any>[] {
        console.info("findItemsOfCategorie", item);
        const node:TreeNode = this.categorieLayerNodes[title];        
        if (node) {
            const nodes = node.findNode(item.id, 'id');
            if (nodes) {
                const path = [];
                for (let i=nodes.length-2; i>=0; i--) {
                    path.push(nodes[i].data.id)
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
        const node:TreeNode = this.categorieLayerNodes[title];
        if (node) {
            node.selectNode(item.id, 'id');
        }
    }

    showMarker(title: string, id: any, prop: string) {
        console.info(`showmarker(${title}, ${id}, ${prop})`)
        const layer = this.categorieLayers[title];
        if (layer) {
            const marker = layer.showMarker(id, prop);
        }
    }

    getItems(title: string, path: Path<any>):CategoryMarker<any>[] {
        console.info(`getItems(${title}, ${path})`)
        const layer = this.categorieLayers[title];
        return layer.getItems(path);
    }


    addCategorieLayer(title:string, categorieLayer: CategorieLayer<any, any>, showAll?:boolean) {
        this.categorieLayers[title] = categorieLayer;
        console.info('addCategorieLayer');
        if (this.tree) {
            this._addCategorieLayerToTree(title, categorieLayer);
            if (showAll) {
                this.tree.selectNode(title);
            }
        }
    }
    private _categorieSelected(layerTitle:string, node: TreeNode, status: SelectionStatus): void {
        console.info("_categorieSelected", node, status);
        const selectedCats = this._findSelected(node.childs);        
        const categoryLayer = this.categorieLayers[layerTitle];
        if (categoryLayer) {
            categoryLayer.setKategories(selectedCats);
        }
    }

    private _themeSelected(theme:string, node: TreeNode, status: SelectionStatus): void {
        console.info("_themeSelected", theme, node, status);
    }

    private _findSelected(nodes:TreeNode[]):number[][] {
        const ids = [];
        for (let i=0; i<nodes.length; i++) {
            if (nodes[i].getSelectionsStatus()===SelectionStatus.SELECTED) {
                ids.push([nodes[i].data.id]);
            } else {
                if (nodes[i].getSelectionsStatus()===SelectionStatus.INDETERMINATE) {
                    const chIds = this._findSelected(nodes[i].childs);
                    for (let j=0; j<chIds.length; j++) {
                        ids.push([nodes[i].data.id, ...chIds[j]]);
                    }
                }
            }
        }
        return ids;
    }

    private addCategories(base:Tree|TreeNode, categories:Category[]) {
        for (let i=0; i<categories.length; i++) {
            const treeNode = new TreeNode(categories[i], null, LayerControl.catNodeParam);
            if (categories[i].childs) {
                this.addCategories(treeNode, categories[i].childs);
            }
            base.addNode(treeNode);
        }
    }
}

