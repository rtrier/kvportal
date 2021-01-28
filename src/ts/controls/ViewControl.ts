import * as L from 'leaflet';

export interface View {
    getDom():HTMLElement;
    onAdd?(parent:ViewControl):void;
    onRemove?():void;
}


export class ViewControl extends L.Control {

    dom: HTMLElement;
    navigationArea: HTMLElement;
    contentArea: HTMLElement;

    contentHistory:View[] = [];
    counter: number = 0;
    navBttn: HTMLElement;
    anchorBack: HTMLAnchorElement;

    constructor(options:L.ControlOptions) {
        super(options);
        const div = this.dom = document.createElement('div');
        div.className = 'viewctrl';
        const navArea = this.navigationArea = document.createElement('div');
        navArea.className = 'viewctrl-nav';        
        const navSpan = this.navBttn = document.createElement('span');
        navArea.appendChild(navSpan);
        const anchorBack = this.anchorBack = document.createElement('a') ;
        anchorBack.className = 'close';
        navSpan.appendChild(anchorBack);
        // const anchorClose = document.createElement('a') ;
        // anchorClose.className = 'back';
        // navSpan.appendChild(anchorClose);
        // navBttn.innerHTML = '&laquo; zurück';

        navSpan.addEventListener('click', (ev)=>this._backBttnClicked());
        // div.appendChild(this.navigationArea);
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'viewctrl-content';
        div.appendChild(this.contentArea);

        const fnStopPropagation = (ev)=> {
            ev.stopPropagation();
            return false;
        }
        div.addEventListener("pointermove", fnStopPropagation); 
        div.addEventListener("click", fnStopPropagation);
        div.addEventListener("mouseup", fnStopPropagation);
        div.addEventListener("pointerup", fnStopPropagation);
        div.addEventListener("wheel", fnStopPropagation);
    }
    private _backBttnClicked(): any {
        this.goBack();
    }

    onAdd(map:L.Map):HTMLElement {
        return this.dom;
    }	

    onRemove(map:L.Map) {
    }

    clear() {
        console.info("clear");
        let view:View;
        while (view=this.contentHistory.pop()) {
            if (view.onRemove) {
                view.onRemove();
            }
        }
        this.contentHistory = [];
        if (this.contentArea.firstChild) {
            this.contentArea.removeChild(this.contentArea.firstChild);
        }
        if (this.dom.contains(this.navigationArea)) {
            this.dom.removeChild(this.navigationArea);
        }
    }

    setContentView(v:View):void {
        console.info(`setView`, v);        
        this._setContent(v);
        if (v.onAdd) {
            v.onAdd(this);
        } 
    }

    private _setContent(view:View):void {
        const dom = view.getDom();
        dom.id='view_'+this.counter;
        this.counter++;
        if (this.contentArea.firstChild) {
            console.info(`setContent ${this.contentArea.firstChild['id']} => ${dom.id}`);
            this.contentArea.replaceChild(dom, this.contentArea.firstChild);
            this.contentHistory.push(view);
        } else {
            console.info(`setContent none => ${dom.id} (addNavArea)`)
            this.dom.insertBefore(this.navigationArea, this.contentArea);
            this.contentArea.appendChild(dom);
            this.contentHistory.push(view);            
        }
        console.info(`setContent done ${this.contentHistory.length}`, this.contentHistory);
        if (this.contentHistory.length===1) {
            this.anchorBack.classList.replace('back', 'close');
            this.anchorBack.title = "schließen";
        } else {
            this.anchorBack.classList.replace('close', 'back');
            this.anchorBack.title = "zurück";
        }
    }

    goBack():void {
        console.info(`goBack ${this.contentHistory.length}`, this.contentHistory);
        if (this.contentArea.firstChild) {
            
            const currentContent = this.contentHistory.pop();
            console.info(`goBack ${this.contentHistory.length}`, this.contentHistory);
            if (currentContent) {
                if (this.contentHistory.length>0) {
                    const lastContent = this.contentHistory[this.contentHistory.length-1];
                    console.info(`goBack ${currentContent.getDom()['id']} => ${lastContent.getDom()['id']}`, currentContent, lastContent);
                    this.contentArea.replaceChild(lastContent.getDom(), this.contentArea.firstChild);
                }
                else {
                    console.info(`goBack ${currentContent['id']} => none removeNavArea`);
                    this.contentArea.removeChild(currentContent.getDom());                    
                    console.info('remove navArea');
                    this.dom.removeChild(this.navigationArea);
                }
                if (currentContent.onRemove) {
                    currentContent.onRemove();
                }
            }
        }
        if (this.contentHistory.length===1) {
            this.anchorBack.classList.replace('back', 'close');
        } else {
            this.anchorBack.classList.replace('close', 'back');
        }
    }  
}
