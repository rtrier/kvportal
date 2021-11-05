import * as L from 'leaflet'
import { Tree } from '../../../../treecomponent/src/ts/Tree';
import { NodeRenderer, RadioGroupTreeNode, SelectionMode, SelectionStatus, TreeNode, TreeNodeParam } from '../../../../treecomponent/src/ts/TreeNode';
import { LayerDescription, Theme } from '../conf/MapDescription';
import { createHtmlElement, disableEvtPropagation } from '../Util';
import { Accordion, AccordionItem } from '../widget/Accordion';

import { CategorieLayer, Category, CategoryMapObject, Path } from './CategorieLayer';
import { BaseLayerDefinition, LayerDefinitionOptions, LayerControlOptions, LayerControl } from './LayerControl';

import { LayerEvent, LayerWrapper, MapDispatcher } from './MapControl';

import {  EventDispatcher } from 'strongly-typed-events';

class LayerNodeRenderer implements NodeRenderer {

    showLegend = true

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
       
        return div
    }
}

class Tree2Node extends TreeNode {

    onTreeDeleteIconClick = new EventDispatcher<TreeNode, any>();

    render():HTMLElement {
        console.info(`Tree2Node.render selectMode=${this.getSelectMode()}`)
        let dom = this.dom;
        let treerow = this.treerow
        if (!dom) {
            dom = this.dom = document.createElement("div");
            dom.className = 'row-wrapper',
            treerow = this.treerow = document.createElement('div');
           //  treerow.id = "treerow" + nodeCounter            
            treerow.className = "treerow";
            
            dom.appendChild(treerow);
            
            const selectMode = this.getSelectMode();
            const span = document.createElement('div');
            span.className = "treeicon";

            const deleteIcon = document.createElement('i');
            deleteIcon.className = 'clear-icon';
            deleteIcon.addEventListener('click', (ev) => this.onTreeDeleteIconClick.dispatch(this, undefined));

            const spanOpenClose = this.spanOpenClose = document.createElement('span');
            spanOpenClose.addEventListener('click', (ev) => this.onTreeIconClick(ev));
            
            // if (selectMode === SelectionMode.SINGLE) {
            //     treerow.addEventListener('click', (ev) => this.itemClicked(ev));
            // }
            
            treerow.className = 'treerow leaf'
            
            this.textNode = spanOpenClose
            span.appendChild(deleteIcon);
            span.appendChild(spanOpenClose);
            if (selectMode === SelectionMode.MULTI) {
                console.info(`Tree2Node.render MULTI`);
                const cb: HTMLInputElement = this._createCeckBox()
                span.appendChild(cb);
                const label = document.createElement("label");
                span.appendChild(label);
                label.addEventListener('click', function () { cb.click() });   
            } 
            treerow.appendChild(span);
            const labelDiv = document.createElement("div")
            labelDiv.className = 'treelabel'
            const label = this.nodeRenderer.render(this)
            if (label) {
                labelDiv.appendChild(label)
                treerow.appendChild(labelDiv);
            }

            if (this.actions) {
                treerow.appendChild(this.renderActions())
            }

            let nodecontainer = this.childDom;
            if (nodecontainer) {
                nodecontainer.innerHTML = null
            }      
            this.dom.style.display = 'flex';
        }
        return dom
    }
}

const layerRenderer = new LayerNodeRenderer();

export class LayerControlVar extends L.Control {

    static catNodeParam: TreeNodeParam = {
        attName2Render: 'bezeichnung',
        selectMode: SelectionMode.MULTI
    }

    _dom:HTMLElement;

    _map: L.Map;
    tree: Tree;
    className: string;

    categorieLayers: { [id: string]: CategorieLayer<any, any>; } = {};
    categorieLayerNodes: { [id: string]: TreeNode } = {};

    overlays: { [id: string]: BaseLayerDefinition[] } = {};

    mapMyLayers: { [id: string]: Tree2Node } = {};

    baseLayerDefOptions: LayerDefinitionOptions;
    themes: Theme[];
    parentNode: HTMLElement;
    tree2: Tree;

    constructor(options?: LayerControlOptions) {
        super(options);
        console.info("LayerControlVar.construct")
        if (options.className) {
            this.className = options.className;
        }
        if (options.parentNode) {
            this.parentNode = options.parentNode;
            layerRenderer.showLegend = false;
        }
        this._createTree();
        this._createTree2();
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
        console.info(`themeLayerChanged ${SelectionStatus[sel]}`, node);
        const isSelected = sel === SelectionStatus.SELECTED;
        const layer = <LayerWrapper>node.data;

        let tree2node = this.mapMyLayers[layer.id];
        if (tree2node) {
            tree2node.setSelected(isSelected);
        }
        else {
            tree2node = new Tree2Node(layer, null, { selectMode: SelectionMode.MULTI, nodeRenderer: layerRenderer });
            tree2node.onSelectionChange.subscribe((node, sel) => this.myThemesLayerChanged(node, sel));
            tree2node.onTreeDeleteIconClick.subscribe((node) => this.myThemesDeleteLayer(node));
            this.tree2.addNode(tree2node);
            this.mapMyLayers[layer.id] = tree2node;
            tree2node.setSelected(isSelected);
        }
        layer.setSelected(isSelected);
    }

    myThemesLayerChanged(node: TreeNode, sel: SelectionStatus) {
        const isSelected = sel === SelectionStatus.SELECTED;
        const layer = <LayerWrapper>node.data;
        layer.setSelected(isSelected);
    }

    myThemesDeleteLayer(node: TreeNode) {
        const layer = <LayerWrapper>node.data;
        const tree2node = this.mapMyLayers[layer.id];
        if (tree2node) {
            tree2node.setSelected(false);
            this.tree2.removeNode(tree2node);
        }
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

    private _createTree2() {
        console.info("_createTree2");
        this.tree2 = new Tree(null, { selectMode: SelectionMode.MULTI, expandOnlyOneNode:true });
    }    

    private _createTree() {
        console.info("_createTree");
        this.tree = new Tree(null, { selectMode: SelectionMode.MULTI, expandOnlyOneNode:true });
        for (const title in this.overlays) {
            this._addOverlayToTree(title, this.overlays[title]);
        }

        for (const title in this.categorieLayers) {
            this._addCategorieLayerToTree(title, this.categorieLayers[title]);
        }
    }

    private _addThemesToTree() {
        console.info(`_addThemesToTree ${this.tree}`);
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
        console.error("LayerControl.onAdd");
        this._map = map;
        let dom = this._dom;
        if (!dom) {
            // if (!this.tree) {
            //     this._createTree();
            // }            
            const domTree = this.tree._render();
            if (this.className) {
                domTree.classList.add(this.className);
            }
            const item1 = new AccordionItem('Themen', domTree);
            const domTree2 = this.tree2._render();
            if (this.className) {
                domTree2.classList.add(this.className);
            }
            const accordion = new Accordion([
                new AccordionItem('Kartenauswahl', domTree), 
                new AccordionItem('Meine Kartenauswahl', domTree2)
            ]);
            dom = accordion.render();
            // dom.appendChild(domTree);
        }
        disableEvtPropagation(dom);
        return dom;
    }
    onRemove(map: L.Map) {
        console.error("LayerControl.onRemove");
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
