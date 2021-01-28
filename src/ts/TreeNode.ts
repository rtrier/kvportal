
import { DispatcherWrapper, EventDispatcher } from 'strongly-typed-events';
import { Action } from './Action';
import { Tree } from './Tree';


export enum SelectionMode {
    MULTI,
    SINGLE,
    RADIO,
    // Node with childs where one can be choosen
    RADIO_GROUP
}


/**
 * Event fired if the selected node changes
 */
// export interface TreeSelectionChangeEvent extends L.LeafletEvent {
//     /**
//      * changed TreeNode;
//      */
//     changedNode: TreeNode;
// }

export interface NodeRenderer {
    render(object: any): HTMLElement;
}

export interface TreeNodeParam {
    nodeRenderer?: NodeRenderer,
    actions?: Array<Action>,
    // multiselection?:boolean
    hideEmptyNode?: boolean
    selectMode?: SelectionMode
    selected?: boolean
}


let nodeCounter = 1;

const standardRender: NodeRenderer = {
    render: (node: TreeNode) => {
        const div = document.createElement("div");
        if (typeof node.data === 'string') {
            div.innerText = node.data;
            div.dataset.tooltip = node.data;
            div.setAttribute("data-tooltip", node.data);
            div.title = node.data;
        }
        else {
            div.innerText = node.data.name
            div.dataset.tooltip = node.data.name;
            div.setAttribute("data-tooltip", node.data.name);
            div.title = node.data.name;
        }
        div.className = 'tooltip';
        return div
    }
}

export enum SelectionStatus {
    SELECTED,
    UNSELECTED,
    INDETERMINATE
}

export class TreeNode implements TreeNodeParam {

    nodeSelectionChangeHandler: (node: TreeNode, SelectionStatus: SelectionStatus) => void;

    onSelectionChange = new EventDispatcher<TreeNode, SelectionStatus>();

    data: any;

    parent: TreeNode;

    childs: Array<TreeNode>;

    nodeRenderer: NodeRenderer = standardRender;

    childDom: HTMLDivElement;
    dom: HTMLElement;

    selected: boolean = false;

    textNode: HTMLSpanElement;

    treerow: HTMLDivElement;

    actions: Array<Action>

    hideEmptyNode = false

    tree: Tree

    selectMode: SelectionMode

    chBox: HTMLInputElement
    spanOpenClose: HTMLSpanElement;



    static _css_prop = {
        iconWidth : '0.950rem',
        iconDistance: '0.18rem',
        treePadding: '0.3rem'
    }

    css_prop = TreeNode._css_prop;

    constructor(data: any, childs: Array<TreeNode>, params?: TreeNodeParam) {
        this.data = data;
        this.childs = childs;
        this.nodeSelectionChangeHandler = (node: TreeNode, selectionStatus: SelectionStatus) => this.childSelected(node, selectionStatus);
        if (params) {
            for (let k in params) {
                this[k] = params[k]
            }

        }
        if (childs && childs.length > 0) {
            for (let i = 0, count = childs.length; i < count; i++) {
                childs[i].onSelectionChange.subscribe(this.nodeSelectionChangeHandler);
                childs[i].parent = this
            }
        }

        if (this.actions) {
            const actions = this.actions
            let f = (evt) => this.actionChanged(evt)
            for (let i = 0; i < actions.length; i++) {
                actions[i].addListener(f)
            }
        }
    }

    actionChanged(evt) {
        this.render();
    }

    getWidh(): number {
        if (this.tree) {
            return this.tree.getWidh()
        }
        return -1
    }

    setTree(tree: Tree) {
        this.tree = tree
        const childs = this.childs
        if (childs && childs.length > 0) {
            for (let i = 0, count = childs.length; i < count; i++) {
                childs[i].setTree(tree);
            }
        }
    }

    setChilds(childs: Array<TreeNode>) {
        this._removeChilds();
        if (childs && childs.length > 0) {
            for (let i = 0, count = childs.length; i < count; i++) {
                childs[i].onSelectionChange.subscribe(this.nodeSelectionChangeHandler);
                // childs[i].on("change", this.childChanged, this);
                // childs[i].on("selected", this.childSelected, this);
                childs[i].parent = this
                if (this.tree) {
                    childs[i].setTree(this.tree)
                }
            }
        }
        this.childs = childs;
        this.render()
    }

    selectNode(data: any, prop?: string): Array<TreeNode> {
        // console.info(data+" "+prop, this.data, this.data[prop])
        if ((prop && this.data[prop] === data) || this.data === data) {
            this.setSelected(true)
            return [this];
        }
        else if (this.childs) {
            for (let i = 0, count = this.childs.length; i < count; i++) {
                const selNodes = this.childs[i].selectNode(data, prop)
                if (selNodes) {
                    selNodes.push(this);
                    return selNodes;
                }
            }
        }
    }

    addNode(child: TreeNode) {
        // child.on("selected", this.childSelected, this);
        child.onSelectionChange.subscribe(this.nodeSelectionChangeHandler);
        if (!this.childs) {
            this.childs = []
        }
        child.parent = this;
        child.setTree(this.tree);
        this.childs.push(child);

        if (this.dom) {
            if (!this.childDom) {
                const nodecontainer = this.childDom = document.createElement('div');
                nodecontainer.className = "nodecontainer"
                this.dom.appendChild(nodecontainer);
                nodecontainer.style.display = 'none'
            }            
            this.childDom.appendChild(child.render());

            const childCount = this.childs ? this.childs.length : 0
            
            // const col = TreeNode.getTreePath(this).length;
            // this.treerow.style.paddingLeft = ((col - 1) * 1.9 + 0.3) + "rem"

            const col = TreeNode.getTreePath(this).length;

            if (childCount > 0) {               
                // this.treerow.style.paddingLeft = ((col - 1) * 1.18 + 0.3) + "rem";
                let s = `calc(${col - 1} * (${this.css_prop.iconWidth} + ${this.css_prop.iconDistance}) + ${this.css_prop.treePadding})`;
                console.info(s);
                this.treerow.style.paddingLeft = `calc(${col - 1} * (${this.css_prop.iconWidth} + ${this.css_prop.iconDistance}) + ${this.css_prop.treePadding})`;
                if (this.childVisible()) {
                    // this.spanOpenClose.innerText = String.fromCharCode(9660);
                    this.spanOpenClose.classList.add('opened');
                    this.spanOpenClose.classList.remove('closed');
                }
                else {
                    // this.spanOpenClose.innerText = String.fromCharCode(9654);
                    this.spanOpenClose.classList.add('closed');
                    this.spanOpenClose.classList.remove('opened');
                }
                this.treerow.classList.remove('leaf');
            } 
            else {
                // this.treerow.style.paddingLeft = ((col - 2) * 1.18 + 0.3) + "rem";
                this.treerow.style.paddingLeft = `calc(${col - 1} * (${this.css_prop.iconWidth} + ${this.css_prop.iconDistance}) + ${this.css_prop.treePadding})`;
            }           
        }
    }

    remove() {
        this.dom.remove();
    }

    _removeChilds() {
        const childs = this.childs;
        if (childs && childs.length > 0) {
            for (let i = 0, count = childs.length; i < count; i++) {
                childs[i].onSelectionChange.unsubscribe(this.nodeSelectionChangeHandler);
            }
        }
        this.childs = null;
    }

    _removeChild(node: TreeNode) {
        let nodes: Array<TreeNode> = []
        for (let i = 0, count = this.childs.length; i < count; i++) {
            if (this.childs[i] !== node) {
                nodes.push(this.childs[i]);
            }
            else {
                console.info("removeNode " + i, this.childs[i]);
            }
        }
        node.onSelectionChange.unsubscribe(this.nodeSelectionChangeHandler);
        node.remove();
        this.childs = nodes
        this.render();
    }


    childVisible(): boolean {
        return this.childDom && this.childDom.style.display == 'block'
    }

    expand() {
        if (this.childDom) {
            this.childDom.style.display = 'block'
        }
    }

    getSelectMode(): SelectionMode {
        if (this.selectMode !== undefined) {
            return this.selectMode;
        }
        else {
            if (this.parent) {
                return this.parent.getSelectMode();
            }
            else {
                if (this.tree) {
                    return this.tree.selectMode;
                }
            }
        }
        return SelectionMode.SINGLE
    }

    render(): HTMLElement {

        const col = TreeNode.getTreePath(this).length;

        let dom = this.dom;
        let treerow = this.treerow
        if (!dom) {
            dom = this.dom = document.createElement("div");
            dom.className = 'row-wrapper',
            treerow = this.treerow = document.createElement('div');
            treerow.id = "treerow" + nodeCounter
            // DomEvent.on(treerow, 'click', this.onclick, this);
            treerow.className = "treerow";
            dom.appendChild(treerow);

            // start
            // dom = this.dom = document.createElement("div")
            // dom = this.dom = treerow = this.treerow = document.createElement('div');
            // treerow.id = "treerow" + nodeCounter
            // // // DomEvent.on(treerow, 'click', this.onclick, this);
            // treerow.className = "treerow";
            // // dom.appendChild(treerow);
            // end


            const childCount = this.childs ? this.childs.length : 0
            const selectMode = this.getSelectMode();
            const span = document.createElement('div');
            span.className = "treeicon";

            const spanOpenClose = this.spanOpenClose = document.createElement('span');
            spanOpenClose.addEventListener('click', (ev) => this.onTreeIconClick(ev));

            if (childCount > 0) {
                // treerow.style.paddingLeft = ((col - 1) * 1.9 + 0.3) + "rem"
                // treerow.style.paddingLeft = ((col - 1) * 1.180 + 0.3) + "rem"
                treerow.style.paddingLeft = `calc(${col - 1} * (${this.css_prop.iconWidth} + ${this.css_prop.iconDistance}) + ${this.css_prop.treePadding})`;
                if (this.childVisible()) {
                    // spanOpenClose.innerText = String.fromCharCode(9660);
                    this.spanOpenClose.classList.add('opened');
                }
                else {
                    this.spanOpenClose.classList.add('closed');
                    // spanOpenClose.innerText = String.fromCharCode(9654);
                }
            }
            else {
                if (selectMode === SelectionMode.SINGLE) {
                    treerow.addEventListener('click', (ev) => this.itemClicked(ev));
                }
                // treerow.style.paddingLeft = (col - 2) * 2.8 + 0.3) + "rem"
                if (selectMode === SelectionMode.RADIO) {
                    this.treerow.style.paddingLeft = `calc(${col - 1} * (${this.css_prop.iconWidth} + ${this.css_prop.iconDistance}) + ${this.css_prop.treePadding})`;
                    //treerow.style.paddingLeft = ((col-1)*1.18 + 0.3) + "rem"
                } else {
                    // treerow.style.paddingLeft = ((col)*1.18 + 0.3) + "rem";
                    this.treerow.style.paddingLeft = `calc(${col} * (${this.css_prop.iconWidth} + ${this.css_prop.iconDistance}) + ${this.css_prop.treePadding})`;
                }
                if (col > 1) {
                    treerow.className = 'treerow leaf'
                }
                // spanOpenClose.innerHTML = "&nbsp;"
            }
            this.textNode = spanOpenClose
            span.appendChild(spanOpenClose);
            if (selectMode === SelectionMode.MULTI) {
                const cb: HTMLInputElement = this._createCeckBox()
                span.appendChild(cb);
                const label = document.createElement("label");
                span.appendChild(label)
                label.addEventListener('click', function () { cb.click() })
            } else if (selectMode === SelectionMode.RADIO) {
                const cb: HTMLInputElement = this._createRadioBttn()
                span.appendChild(cb);
                const label = document.createElement("label");
                span.appendChild(label)
                label.addEventListener('click', function () { 
                    cb.click();
                });
            } else if (selectMode === SelectionMode.RADIO_GROUP) {
                // const cb: HTMLInputElement = this._createRadioBttn()
                // cb.checked = true
                // span.appendChild(cb);
                // const label = document.createElement("label");
                // span.appendChild(label)
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

            if (childCount > 0) {
                if (!nodecontainer) {
                    nodecontainer = this.childDom = document.createElement('div');
                    nodecontainer.className = "nodecontainer"
                    dom.appendChild(nodecontainer);
                    nodecontainer.style.display = 'none'
                }
                for (let i = 0; i < this.childs.length; i++) {
                    nodecontainer.appendChild(this.childs[i].render());
                }

            }      
            this.dom.style.display = (this.hideEmptyNode && childCount === 0) ? 'none' : 'block';
        }

        return dom
    }



    renderActions(): HTMLElement {
        let actDiv = document.createElement("div")
        actDiv.className = "tree_action_icons"
        for (let i = 0; i < this.actions.length; i++) {
            const a = this.actions[i]
            if (a.authorized) {
                actDiv.appendChild(this.renderIcon(a.icon, () => a.callback(this.data)))
            }
        }
        return actDiv
    }

    renderIcon(icon: string, cb: (evt) => void): HTMLElement {
        const el = document.createElement("i")
        el.style.cssFloat = "right"
        el.style.marginLeft = "12px"
        el.className = "fas fa-" + icon
        el.onclick = cb
        return el;
    }

    /**
     * return the checkbox for item selection, if not exist create 
     */
    _createCeckBox(): HTMLInputElement {
        let chBox: HTMLInputElement;
        if (!this.chBox) {
            chBox = this.chBox = document.createElement('input');
            chBox.type = 'checkbox';
            chBox.id = 'lsw_cb' + this.data.id;
            chBox.className = 'regular-checkbox';
            chBox.setAttribute('aria-label', this.data.id);
            chBox.checked = this.selected;
            chBox.addEventListener('change', (ev) => this.onchBoxChange(ev));
        }
        return this.chBox
    }

    _createRadioBttn(): HTMLInputElement {
        if (!this.chBox) {
            const chBox = this.chBox = document.createElement('input');
            chBox.type = 'radio';
            chBox.id = 'lsw_cb' + this.data.id;
            chBox.className = 'regular-checkbox';
            chBox.setAttribute('aria-label', this.data.id);
            chBox.addEventListener('change', (ev) => this.onchBoxChange(ev));
        }
        return this.chBox
    }

    onchBoxChange(evt: any) {
        console.warn(`onchBoxChange ${this.data.name} ${this.chBox.checked} childCount=${this.childs ? this.childs.length : 0}`);
        console.warn(this);
        if (this.childs) {
            const isSelected = this.chBox.checked;
            for (let i = 0; i < this.childs.length; i++) {
                this.childs[i].setSelected(isSelected);
            }
        }
        else {
            this.setSelected(this.chBox.checked)
        }
        evt.preventDefault();
    }



    itemClicked(evt: MouseEvent): void {
        this.setSelected(!this.selected);
    }

    onTreeIconClick(evt: MouseEvent) {
        // console.info(`onTreeIconClick ${this.data.name}`);
        if (this.childs && this.childs.length > 0) {
            if (this.childDom.style.display == 'none') {
                this.childDom.style.display = 'block';
                // this.textNode.innerText = String.fromCharCode(9660);
                this.spanOpenClose.classList.replace('closed', 'opened');
            }
            else {
                this.childDom.style.display = 'none';
                // this.textNode.innerText = String.fromCharCode(9654);
                this.spanOpenClose.classList.replace('opened', 'closed');
            }
        }
        evt.stopImmediatePropagation();
    }

    isSelected(): boolean {
        if (this.chBox) {
            return this.chBox.checked;
        }
        return this.selected;
    }

    getSelectionsStatus():SelectionStatus {
        if (this.chBox) {
            if (this.chBox.checked) {
                return this.chBox.indeterminate ? SelectionStatus.INDETERMINATE : SelectionStatus.SELECTED;
            }
            return SelectionStatus.UNSELECTED;
        }
        return this.selected ? SelectionStatus.SELECTED : SelectionStatus.UNSELECTED;
    }

    /*
    childSelected(evt:TreeSelectionChangeEvent) {
        this.fire(Tree.NODE_SELECTION_CHANGE_EVENT, {changedNode:evt.changedNode});
    }
    */

    _getStatusOfChilds():SelectionStatus {
        if (this.chBox) {
            let count = 0;
            for (let i = 0; i < this.childs.length; i++) {
                console.info(`\t ${i} ${SelectionStatus[this.childs[i].getSelectionsStatus()]}`);
                const sStatus = this.childs[i].getSelectionsStatus();
                if (sStatus===SelectionStatus.SELECTED) {
                    count++;
                } else {
                    if (sStatus===SelectionStatus.INDETERMINATE) {
                        return SelectionStatus.INDETERMINATE;
                    }
                }
            }
            if (count === 0) return SelectionStatus.UNSELECTED;
            return (this.childs.length > count) ? SelectionStatus.INDETERMINATE : SelectionStatus.SELECTED;
        }
    }

    childSelected(n: TreeNode, selectionStatus: SelectionStatus) {
        console.info(`childSelected this=${this.data.name} child=${n.data.name} ${SelectionStatus[selectionStatus]}`)
        if (this.chBox) {
            // let count = 0;
            // let indeterminate = false;
            // for (let i = 0; i < this.childs.length; i++) {
            //     console.info(`\t ${i} ${SelectionStatus[this.childs[i].getSelectionsStatus()]}`);
            //     if (this.childs[i].getSelectionsStatus()===SelectionStatus.SELECTED) {
            //         count++;
            //     } else 
            // }
            const selStatus = this._getStatusOfChilds();
            if (selStatus === SelectionStatus.UNSELECTED) {
                this.chBox.checked = false;
                this.chBox.indeterminate = false;
                // this.onSelectionChange.dispatch(this, SelectionStatus.UNSELECTED);
            }
            else {
                this.chBox.checked = true;
                this.chBox.indeterminate = selStatus === SelectionStatus.INDETERMINATE;
            }
            this.onSelectionChange.dispatch(this, selStatus);
            //     }
            //     else {
            //         this.chBox.indeterminate = false;
            //         this.onSelectionChange.dispatch(this, SelectionStatus.SELECTED);
            //     }
            // }
        }
        else {
            this.onSelectionChange.dispatch(n, selectionStatus);
        }

    }


    getSelected(): Array<any> {
        let ids: Array<any> = [];
        if (this.isSelected()) {
            if (this.chBox.checked && !this.chBox.indeterminate) {
                ids.push(this.data);
            }
            if (this.childs) {
                for (let i = 0; i < this.childs.length; i++) {
                    ids = ids.concat(this.childs[i].getSelected());
                }
            }
        }
        return ids;
    }

    setSelected(selected: boolean) {
        console.info(`setSelected ${this.data.name}  this.selected=${this.selected} => ${selected}`);
        if (selected === this.selected) {
            return;
        }
        if (this.getSelectMode() === SelectionMode.SINGLE) {
            this._setSelected(selected);
        }
        else {
            if (this.chBox) {
                this.chBox.checked = selected;
            }
            if (this.childs) {
                for (let i = 0; i < this.childs.length; i++) {
                    this.childs[i].setSelected(selected);
                }
            }
            this.selected = selected;
        }
        this.onSelectionChange.dispatch(this, (selected) ? SelectionStatus.SELECTED : SelectionStatus.UNSELECTED);
    }

    _setSelected(selected: boolean) {
        // console.error(`_setSelected ${this.data.name} this.selected=${this.selected} => ${selected}`);
        if (selected === this.selected) {
            return;
        }
        if (this.treerow) {
            if (this.selected) {
                this.treerow.classList.remove('selected');
            }
            else {
                this.treerow.classList.add('selected');
            }
        }
        this.selected = !this.selected;
    }

    resize() {
        const treeWidth = this.tree.getWidh();
        // return;
        // console.info(this.data.name + "  !!!!!!!!!");
        // console.info("tree", this.tree.getBoundingClientRect())        
        const childs = this.childs
        if (childs && childs.length > 0) {
            for (let i = 0, count = childs.length; i < count; i++) {
                childs[i].resize();
            }
        }
        else {
            let treeRow = this.treerow
            let recRow = treeRow.getBoundingClientRect()
            // console.log("treeRow", recRow);
            let wA: Array<number> = []
            for (let i = 0; i < treeRow.childNodes.length; i++) {
                let child: HTMLElement = <HTMLElement>treeRow.children[i]

                let recChild = child.getBoundingClientRect()
                // console.log("elem" + i + "  ", recChild);
                wA.push(recChild.width);
            }
            // console.log("span"+1+"  ", recRow, recSpa);
            const child: HTMLElement = <HTMLElement>treeRow.children[1]
            // child.style.width = (treeWidth - 130) + "px"
            // let w:number = ( treeWidth - wA[0] - wA[2] - 92 )
            const w: number = (treeWidth + recRow.left - child.getBoundingClientRect().left - wA[2])
            // console.log("res   "+ w + " = " + treeWidth +" - "+ wA[0]+" - "+ wA[2]);
            // console.log("res   "+ w + " = " + treeWidth +" + "+ recRow.left+ " - "+ child.getBoundingClientRect().left + " - " + wA[2]);
            child.style.width = w + "px"
        }
    }



    static getTreePath(node: TreeNode): Array<TreeNode> {
        const result = [node];
        let parent = node.parent;
        while (parent) {
            result.push(parent)
            parent = parent.parent
        }
        return result.reverse();
    }

}



export class RadioGroupTreeNode extends TreeNode {

    constructor(data: any, childs: Array<TreeNode>, params?: TreeNodeParam) {
        super(data, childs, params)
        this.selectMode = SelectionMode.RADIO_GROUP
        for (let i = 0, count = childs.length; i < count; i++) {
            childs[i].selectMode = SelectionMode.RADIO
        }
    }

    childSelected(node: TreeNode, status: SelectionStatus) {
        // console.error(`RadioGroupTreeNode.childSelected ${node.data.name} ${SelectionStatus[status]}`);        
        if (node.isSelected()) {
            for (let i = 0, count = this.childs.length; i < count; i++) {
                if (this.childs[i] !== node) {
                    this.childs[i].setSelected(false)
                }
            }
            // console.info(`RadioGroupTreeNode.childSelected dispatch ${node.data.name}`);
            this.onSelectionChange.dispatch(node, SelectionStatus.SELECTED);
        }
    }
}



