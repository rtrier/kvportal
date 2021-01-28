import { EventDispatcher } from "strongly-typed-events";
import { SelectionMode, SelectionStatus, TreeNode } from "./TreeNode";


export interface TreeParam {
    selectMode?:SelectionMode
}

export class Tree {

    static NODE_SELECTION_CHANGE_EVENT = "nodeSelectionChange";
    static NODE_SELECTED_EVENT = "node_selected";
    static NODE_UNSELECTED_EVENT = "node_unselected";

    selectMode:SelectionMode = SelectionMode.SINGLE

    nodeSelectionChangeHandler:(node:TreeNode, SelectionStatus:SelectionStatus)=>void;
    onSelectionChange = new EventDispatcher<TreeNode, SelectionStatus>();

    pane: HTMLDivElement = null;

    nodes: Array<TreeNode> = [];

    selectedNode: TreeNode;

    observer: MutationObserver

    constructor(nodes: Array<TreeNode>, param?:TreeParam) {

        if (param) {
            for (let k in param) {
                this[k] = param[k]
            }
        }
        this.nodeSelectionChangeHandler = (node, status) => this.nodeSelected(node, status);
        if (nodes) {
            this.nodes = nodes;
            for (let i = 0, count = nodes.length; i < count; i++) {
                nodes[i].setTree(this)
                nodes[i].onSelectionChange.subscribe(this.nodeSelectionChangeHandler);
            }
        }
        else {
            this.nodes = [];
        }
    }

    _render(): HTMLDivElement {
        const pane = document.createElement("div");
        pane.className = "treecontainer"
        for (let i = 0, count = this.nodes.length; i < count; i++) {
            pane.appendChild(this.nodes[i].render());
        }
        return this.pane = pane;
    }


    _mutation(mutations: MutationRecord[], observer: MutationObserver) {    
        this.resize()
        let f = () => this.resize()
        window.setTimeout(f, 520)       
    }

    resize() {
        // console.info("Tree "+ this.nodes.length, this.pane.getBoundingClientRect());        
        for (let i = 0, count = this.nodes.length; i < count; i++) {
            this.nodes[i].resize();
        }
    }

    // resize1() {
    //     console.info("TreeresizeTim " + this.pane.clientWidth);
        
    //     for (let i = 0, count = this.nodes.length; i < count; i++) {
    //         this.nodes[i].resize();
    //     }
    // }


    addNode(node: TreeNode) {
        // console.info("addNode", node);
        node.setTree(this)
        // node.on("selected", this.nodeSelected, this);
        node.onSelectionChange.subscribe( this.nodeSelectionChangeHandler );
        // node.on("change", this.selectionChanged, this);
        this.nodes.push(node)        
        if (this.pane) {
            let el = node.render()
            this.pane.appendChild(el);
        }
    }

    insertNode(node: TreeNode, pos:number) {
        // console.info("insertNode "+pos);
        node.setTree(this)
        node.onSelectionChange.subscribe( this.nodeSelectionChangeHandler );
        // node.on("change", this.selectionChanged, this);
        let nodes:Array<TreeNode> = [];
        for (let i=0, count=this.nodes.length; i<count; i++) {
            if (i===pos) {
                nodes.push(node);
            }
            nodes.push(this.nodes[i]);
        }   
        // console.info("nodeAfter: ", this.nodes[pos].dom);
        if (pos<this.nodes.length) {
            this.pane.insertBefore(node.render(), this.nodes[pos].dom)
        }
        else {
            this.pane.appendChild(node.render())
        }
        this.nodes = nodes
    }

    findNode(data:any, node?:TreeNode):TreeNode {
        let nodes:Array<TreeNode> = node? node.childs : this.nodes;
        if (nodes) {
            for (let i=0, count=nodes.length; i<count; i++) {
                if (data === nodes[i].data) {
                    return nodes[i]
                }
                else {
                    let node = this.findNode(data, nodes[i])
                    if (node) {
                        return node;
                    }
                }
            }
        }
        return null
    }

    selectNode(data:any, prop?:string):Array<TreeNode> {
        for (let i=0, count=this.nodes.length; i<count; i++) {
            let selNodes = this.nodes[i].selectNode(data, prop);            
            if (selNodes) {
               return selNodes;
            }
        }
    }

    selectAndExpandNode(data:any, prop?:string):Array<TreeNode> {
        for (let i=0, count=this.nodes.length; i<count; i++) {
            let selNodes = this.nodes[i].selectNode(data, prop)
            // console.info('selectNode', selNodes);
            if (selNodes) {
                return selNodes;
            }
        }
    }

    removeNode(node: TreeNode) {
        // console.info("removeNode", node);
        node.setTree(null)
        node.onSelectionChange.unsubscribe(this.nodeSelectionChangeHandler);
        // node.off("change", this.selectionChanged, this);
       
        if (node.parent) {
            node.parent._removeChild(node)
        }
        else {
            let nodes:Array<TreeNode> = []   
            for (let i=0, count=this.nodes.length; i<count; i++) {
                if (this.nodes[i]!==node) {
                    nodes.push(this.nodes[i]);
                }
                else {
                    console.info("removeNode "+i, this.nodes[i]);
                }
            }
            node.remove();
            this.nodes = nodes
        }
        
        
    }



    onResize(ev: UIEvent): any {
        // console.info(ev)
        this.resize()
    }

    /*
    replaceChilds(node: TreeNode, childs: TreeNode[]) {
        console.info("replaceChilds", node.treerow);
        node.setChilds(childs)
        node.render()
    }
    */

    addTo(elem: HTMLElement) {
        if (!this.pane) {
            this._render()
            // this.observer = new MutationObserver((mutations, observer) => this._mutation(mutations, observer));
            // this.observer.observe(elem, { attributes: true, childList: true, subtree: true });

            window.addEventListener("resize", (ev:UIEvent) => this.onResize(ev))
        }
        let pane = this.getDom();
        pane.addEventListener("resize", (ev:UIEvent) => this.onResize(ev))
        elem.addEventListener("resize", (ev:UIEvent) => this.onResize(ev))
        elem.appendChild(this.getDom())
    }

    getWidh(): number {
        return (this.pane && this.pane.parentElement) ? this.pane.parentElement.clientWidth : -1        
    }

    getBoundingClientRect() {
        return (this.pane && this.pane.parentElement) ? this.pane.getBoundingClientRect()  : null
    }

    getDom(): HTMLDivElement {
        return this.pane;
    }

    /**
     * return the Data of the selected nodes
     */
    getSelected(): Array<any> {
        let result = [];
        for (let i = 0, count = this.nodes.length; i < count; i++) {
            result = result.concat(this.nodes[i].getSelected());
        }
        return result;
    }

    /*
    selectionChanged(evt) {
        console.info('tree.selectionChanged: '+evt.type, evt);
        this.fire("change");
    }
    */

    // nodeSelected(evt:L.LeafletEvent) {
    nodeSelected(node:TreeNode, status:SelectionStatus) {
        // console.info(`Tree nodeSelected(${node.data.name} status=${SelectionStatus[status]}) selectedNode=${this.selectedNode ? this.selectedNode.data.name : "undefined"}`);
        /*
        if (evt.changedNode) {
            console.info('tree.nodeSelected:'+evt.type+ "  "+evt.changedNode.data.name+"  "+evt.changedNode.isSelected());
        }
        else {
            console.info('tree.nodeSelected:'+evt.type);
        }
        */
        if (this.selectMode===SelectionMode.SINGLE) {
            if (this.selectedNode) {
                // console.info(`oldSelectedNode=${this.selectedNode.data.name}  `+this.selectedNode.data.name);
                if (this.selectedNode!==node) {
                    this.selectedNode.setSelected(false);
                }
                // const oldNode = this.selectedNode;
                // this.selectedNode = null;
                // console.info("dispatch01");
                // this.onSelectionChange.dispatch(node, SelectionStatus.UNSELECTED); 
            }
            if (node && node.selected) {
                this.selectedNode = node;
                // console.info("dispatch02");
                this.onSelectionChange.dispatch(this.selectedNode, status); 
            } 
            else {
                // console.info("dispatch03");
                this.onSelectionChange.dispatch(node, status); 
            }
        }
        else {        
            // console.info("dispatch04");
            this.onSelectionChange.dispatch(node, status);
        }
    }

}