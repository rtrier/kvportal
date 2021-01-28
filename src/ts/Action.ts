export interface Listener {
    (event: any): any;
}

export interface ActionParam {
    text:string
    icon?:any
    callback?:Function
    disabled?:boolean
    authorized?:boolean
    tooltip?:string
    hidden?:boolean
    available?:boolean
    noPermisionHandler?:(action:Action)=>void;
}

export interface Event {
    target:Action
    type:string
}

export interface ActionPropertyChangeEvent extends Event {
    target:Action
    type:'propertyChanged'
    prop:string,
    value:any
}

export type ItemsChangedEvent = {
    target:SelectAction<any>,
    type:"itemchanged"
}

export interface SelectActionParam extends ActionParam {
    items:Array<{data:any, text:string}>
}

export class Action  {

    listener:Array<Listener> = [];

    text?:string;
    icon:any;
    callback?:Function;
    disabled=false;
    authorized=true;
    tooltip?:string;
    available=true;
    noPermisionHandler?:(action:Action)=>void = undefined;

    constructor(options?:ActionParam) {
        if (options) {
            for (let k in options) {
                (<any>this)[k] = (<any>options)[k];
            }
        }
    }
    
    get(prop:string):any {
        return this[prop];
    }
    set(prop:string, value:any) {
        this[prop] = value;
        this.fire({type:'propertyChanged', target:this, prop:prop, value:value});
    }

    setEnabled(enabled:boolean) {
        this.set("disabled", !enabled);
    }
    setAvailable(available:boolean) {
        this.set("available", available);
    }
    fire(evt:Event|ActionPropertyChangeEvent) {
        for (let i=0; i<this.listener.length; i++) {
            this.listener[i](evt);
        }
    }

    trigger(data:any) {
        if (this.authorized) {
            this.callback(data);
        }
        else {
            if (this.noPermisionHandler) {
                this.noPermisionHandler(this);
            }
        }
    }

    addListener(l:Listener) {
        this.listener.push(l);
    }
    removeListener(l:Listener) {
        let ll:Array<Listener> = [];
        for (let i=0; this.listener.length; i++) {
            if (this.listener[i] !== l) {
                ll.push(l);
            }
        }
    }
}


export class ActionGroup  {

    actions:Array<Action>
    selected:Action
    
    constructor(actions:Array<Action>, selected?:Action) {
        this.actions = actions;
        this.selected = selected;
    }

    setSelected(action:Action) {
        this.selected=action;
    }
    getSelected():Action {
        return this.selected;
    }
}

export class SelectAction<T> extends Action {
	
    items: { data: T; text: string}[];
    selected: { data: T; text: string}

    constructor(options:SelectActionParam) {
        super(options);
        this.items = options.items;
    }

    getItems():{ data: T; text: string; selected?:boolean}[] {
        return this.items
    }

    replaceItem(idx:number, item:{data: T, text: string}) {
        if (this.items.length>idx) {
            this.items[idx] = item;
            this.fire({target:this, type:"itemchanged"})
        }
    }

    addItem(item:{data: T, text: string}, selected?:boolean) {
        this.items.push(item)
        if (selected) {
            this.selected = item;
        }
        this.fire({target:this, type:"itemchanged"})
    }

    setItems(items:{data: T, text: string}[], data: T) {
        this.items = items;
        this.setSelected(data);
        this.fire({target:this, type:"itemchanged"})
        
    }

    setSelected(data:T) {
        let items = this.items
        if (data) {
            for (let i=0, count=items.length; i<count; i++) {
                if (items[i].data===data) {
                    this.set('selected', items[i])
                }
            }
        }
        else {
            this.set('selected', null)
        }
        this.callback( this.selected ? this.selected.data : null);        
    }

    setSelectedIdx(idx:number) {
        let items = this.items
        for (let i=0, count=items.length; i<count; i++) {
            if (i===idx) {
                this.set('selected', items[i])
            }
        }
        this.callback(this.selected.data);
    }

    setSelectedText(value:string) {
        let items = this.items
        for (let i=0, count=items.length; i<count; i++) {
            if (items[i].text===value) {
                this.set('selected', items[i])
            }
        }        
        this.callback(this.selected.data);
    }
}


export class ToggleAction extends Action {

    actionToggleOn:Function
    actionToggleOff:Function
    selected:boolean
    
    constructor(options:any, actionToggleOnSelect:Function, actionToggleOffSelect:Function, on:boolean) {
        super(options);
        this.actionToggleOn = actionToggleOnSelect;
        this.actionToggleOff = actionToggleOffSelect;        
        this.selected = on;
    }

    toggle() {
        let evt:string;
        if (this.selected) {
            this.toggleOff();
        }
        else {
            this.toggleOn();
        }
    }

    toggleOn() {
        this.selected = true;
        this.fire({target:this, type:"select"});
        this.actionToggleOn();
    }
    toggleOff() { 
        this.selected = false;
        this.fire({target:this, type:"unselect"});
        this.actionToggleOff();
    }
}


export class ToggleActionOld  {

    actions:Array<Action>
    selected:Action
    
    constructor(actions:Array<Action>) {
        this.actions = actions;
    }

    setSelected(action:Action) {
        this.selected=action;
    }
    getSelected():Action {
        return this.selected;
    }
}


export interface ActionProvider<L> {
    getActions(o:L):Action[];
}