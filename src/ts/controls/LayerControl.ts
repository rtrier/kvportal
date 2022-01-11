import * as L from 'leaflet'
import { Tree } from '../../../../treecomponent/src/ts/Tree';
import { NodeRenderer, RadioGroupTreeNode, SelectionMode, SelectionStatus, TreeNode, TreeNodeParam } from '../../../../treecomponent/src/ts/TreeNode';
import { LayerDescription, Theme } from '../conf/MapDescription';

import { CategorieLayer, Category, CategoryMapObject, Path } from './CategorieLayer';
// import { createLegendLayerItem } from './LegendControl';
import { LayerEvent, LayerWrapper, MapDispatcher } from './MapControl';



class LayerNodeRenderer implements NodeRenderer {

    // showLegend = true

    render(node: TreeNode) {
        const layer = <LayerWrapper>node.data;
        const div = document.createElement("div");
        if (typeof node.data === 'string') {
            div.innerHTML = node.data;
            div.dataset.tooltip = node.data;
            div.setAttribute("data-tooltip", node.data);
            div.title = node.data;
        }
        else {
            const txt = node.data.layerDescription['label'];
            if (!txt) {
                debugger
            }
            div.innerHTML = txt;
            div.dataset.tooltip = txt;
            div.setAttribute("data-tooltip", txt);
            div.title = txt;
        }
        div.className = 'tooltip';

        // if (this.showLegend) {
        //     const legendItem = createLegendLayerItem(layer.layerDescription);
        //     if (legendItem) {
        //         div.appendChild(legendItem);
        //         legendItem.classList.add('legend-item');
        //     }
        // }
        
        return div
    }
}

const layerRenderer = new LayerNodeRenderer();

export class BaseLayerDefinition {
    id?: string | number;
    layer?: L.Layer;
    bounds?: L.LatLngBounds;
    img?: string;
}

export class LayerDefinitionOptions {
    labelAttribute?: string;
    createLayer?: (layerDefintion: BaseLayerDefinition) => Promise<L.Layer>;
}

export class LayerControlOptions implements L.ControlOptions {
    baseLayer?: L.Layer;
    baseLayers?: BaseLayerDefinition[];
    baseLayerId?: string;
    position?: L.ControlPosition;
    className?: string;
    parentNode?: HTMLElement;
}

export type ListEntry<T> = {
    item: T;
    dom: HTMLElement;
}


export class LayerControl extends L.Control {

    static catNodeParam: TreeNodeParam = {
        attName2Render: 'bezeichnung',
        selectMode: SelectionMode.MULTI
    }

    baseLayerDefinitions: BaseLayerDefinition[];
    baseLayerDefinition: BaseLayerDefinition;

    _map: L.Map;
    tree: Tree;
    className: string;

    categorieLayers: { [id: string]: CategorieLayer<any, any>; } = {};
    categorieLayerNodes: { [id: string]: TreeNode } = {};

    overlays: { [id: string]: BaseLayerDefinition[] } = {};
    baseLayerDefOptions: LayerDefinitionOptions;
    themes: Theme[];
    parentNode: HTMLElement;

    constructor(options?: LayerControlOptions) {
        super(options);
        if (options.className) {
            this.className = options.className;
        }
        if (options.baseLayers) {
            this.baseLayerDefinitions = options.baseLayers;
        }
        if (options.parentNode) {
            this.parentNode = options.parentNode;
        }
        this._createTree();
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
        MapDispatcher.onBaseLayerSelection.dispatch(this, layer);
    }


    themeLayerChanged(node: TreeNode, sel: SelectionStatus) {
        console.info(`themeLayerChanged ${SelectionStatus[sel]}`, node);
        const isSelected = sel === SelectionStatus.SELECTED;
        const layer = <LayerWrapper>node.data;
        layer.setSelected(isSelected);
    }

    baseLayerChanged(node: TreeNode, sel: SelectionStatus) {
        console.info(`baseLayerChanged ${SelectionStatus[sel]}`, node);
        if (!node.data.layer) {
            this.baseLayerDefOptions.createLayer(node.data)
                .then(layer => {
                    node.data.layer = layer;
                    this._baseLayerChanged(layer);
                });
        }
        else {
            this._baseLayerChanged(node.data.layer);
        }
    }


    setBaseLayers(baseLayers: BaseLayerDefinition[], options?: LayerDefinitionOptions) {
        this.baseLayerDefinitions = baseLayers;
        this.baseLayerDefOptions = options;
        if (this.tree) {
            this._addBaseLayersToTree();
        }
        this.selectBaseLayer(this.baseLayerDefinitions[0]);
    }

    selectBaseLayer(baseLayer: BaseLayerDefinition) {
        console.info("this.setBaseLayer", baseLayer);
        this.baseLayerDefinition = baseLayer;
        this.tree.selectNode(baseLayer);
    }

    selectThemeLayer(layerDescr: LayerDescription) {
        console.info("selectThemeLayer");
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


    private _createTree() {
        console.error("_createTree");
        this.tree = new Tree(null, { selectMode: SelectionMode.MULTI, expandOnlyOneNode:true });
        this._addBaseLayersToTree();
        for (const title in this.overlays) {
            this._addOverlayToTree(title, this.overlays[title]);
        }

        for (const title in this.categorieLayers) {
            this._addCategorieLayerToTree(title, this.categorieLayers[title]);
        }
    }

    private _addThemesToTree() {
        console.error("_addThemesToTree");
        if (this.tree) {
            if (this.themes) {
                this.themes.forEach(theme => {
                    const themeNode = new TreeNode(theme.thema);
                    if (theme.layers) {
                        theme.layers.forEach(layer => {
                            // const layerNode = new TreeNode(layer, null, {attName2Render:'label'});
                            const layerNode = new TreeNode(layer, null, { nodeRenderer: layerRenderer });
                            layerNode.onSelectionChange.subscribe((node, sel) => this.themeLayerChanged(node, sel));
                            themeNode.addNode(layerNode);
                        });
                    }
                    if (themeNode.childs && themeNode.childs.length > 0) {
                        this.tree.addNode(themeNode);
                    }
                });
            }
        }
    }
    private _addBaseLayersToTree() {
        if (this.tree) {
            const count = this.baseLayerDefinitions ? this.baseLayerDefinitions.length : 0;
            if (count > 0) {
                const baseLayerNodes: TreeNode[] = [];
                let nodeParam: TreeNodeParam;
                if (this.baseLayerDefOptions.labelAttribute) {
                    nodeParam = { attName2Render: this.baseLayerDefOptions.labelAttribute };
                }
                for (let i = 0; i < count; i++) {
                    const baseLayerNode = new TreeNode(this.baseLayerDefinitions[i], null, nodeParam);
                    baseLayerNodes.push(baseLayerNode);
                }
                console.info(baseLayerNodes);
                const baseLNode = new RadioGroupTreeNode({ name: "Grundkarte" }, baseLayerNodes);
                baseLNode.onSelectionChange.subscribe((node, sel) => this.baseLayerChanged(node, sel));
                this.tree.addNode(baseLNode);

            }
            console.info("before setSeled")
            this.tree.selectNode(this.baseLayerDefinition);
            this.tree.onSelectionChange.subscribe((node, sel) => this.nodeChanged('tree', node, sel));
        }
    }

    _addCategorieLayerToTree(title: string, categorieLayer: CategorieLayer<any, any>) {
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
        console.info(`_addCategorieLayerToTree ${this.tree}`);
        if (this.tree) {
            const treeNode = new TreeNode(title, undefined, { selectMode: SelectionMode.MULTI });
            this.tree.addNode(treeNode);
            overlays.forEach(baseLayerDef => {
                const treeNode = new TreeNode(baseLayerDef, null, { selectMode: SelectionMode.MULTI, nodeRenderer: layerRenderer });
                treeNode.addNode(treeNode);
            });
            treeNode.onSelectionChange.subscribe((node, status) => this._themeSelected(title, treeNode, status));
        }
    }

    addTo(map: L.Map):this {
        console.error('LayerControl.addTo');
        if (this.parentNode) {
            this.remove();
  		    this._map = map;            
  		    const container = (<any>this)._container = this.onAdd(map);
            container.classList.add('layerctrl-dom');
            this.parentNode.appendChild(container);            
  		    this._map.on('unload', this.remove, this);
            return this;
        } else {
            return super.addTo(map);
        }
    }

    onAdd(map: L.Map): HTMLElement {
        console.info("LayerControl.onAdd");
        if (!this.tree) {
            this._createTree();
        }

        // console.info("addbaseLayer", this.baseLayer);

        this._map = map;
        // this.map.addEventListener("movestart", (ev) => { });
        // this.map.addEventListener("moveend", (ev) => { });
        const dom = this.tree._render();

        if (this.className) {
            dom.classList.add(this.className);
        }
        const fnStopPropagation = (ev: Event) => {
            ev.stopPropagation();
            return false;
        };
        // L.DomEvent.disableClickPropagation(dom);
        // L.DomEvent.disableScrollPropagation(dom);          
        dom.addEventListener("pointermove", fnStopPropagation);
        dom.addEventListener("mousedown", fnStopPropagation);      
        dom.addEventListener("dblclick", fnStopPropagation);
        dom.addEventListener("dragstart", fnStopPropagation);
        dom.addEventListener("drag", fnStopPropagation);
        dom.addEventListener("wheel", fnStopPropagation);
        return dom;
    }
    onRemove(map: L.Map) {
        console.error("LayerControl.onRemove");
    }

    // remove() {
    //     console.error("LayerControl.remove");
    //     super.remove();
    //     return this;
    // }

    _findBaseLayerDefinition(baseLayerId: string): BaseLayerDefinition {
        for (let i = 0; i < this.baseLayerDefinitions.length; i++) {
            if (this.baseLayerDefinitions[i].id === baseLayerId) {
                return this.baseLayerDefinitions[i];
            }
            if (this.baseLayerDefinitions[i].id.toString().toLowerCase() === baseLayerId.toLowerCase()) {
                return this.baseLayerDefinitions[i];
            }
        }
        return undefined;
    }

    findCategorie(title: string, item: Category): TreeNode[] {
        console.info("findCategorie", item);
        const node: TreeNode = this.categorieLayerNodes[title];
        if (node) {
            return node.findNode(item.id, 'id');
        }
    }



    findItemsOfCategorie(title: string, item: Category): CategoryMapObject<any>[] {
        console.info("findItemsOfCategorie", item);
        const node: TreeNode = this.categorieLayerNodes[title];
        if (node) {
            const nodes = node.findNode(item.id, 'id');
            if (nodes) {
                const path = [];
                for (let i = nodes.length - 2; i >= 0; i--) {
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
        const node: TreeNode = this.categorieLayerNodes[title];
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

    getItems(title: string, path: Path<any>): CategoryMapObject<any>[] {
        console.info(`getItems(${title}, ${path})`)
        const layer = this.categorieLayers[title];
        return layer.getItems(path);
    }


    addCategorieLayer(title: string, categorieLayer: CategorieLayer<any, any>, showAll?: boolean) {
        this.categorieLayers[title] = categorieLayer;
        console.info('addCategorieLayer');
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

    private _themeSelected(theme: string, node: TreeNode, status: SelectionStatus): void {
        console.info("_themeSelected", theme, node, status);
    }

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
}
