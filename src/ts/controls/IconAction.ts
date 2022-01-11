import { Control, ControlOptions, DomEvent, Map } from 'leaflet';
import { createHtmlElement } from '../Util';


export interface IconActionCtrlOptions extends ControlOptions {
    className:string;
    action:(ctrl:Control)=>void;
}

export interface ChangeFontSizeCtrlOptions extends ControlOptions {
    type:'increase'|'decrease';
}

export class IconActionCtrl extends Control {

    _map: Map;
    dom: HTMLElement;

    options:IconActionCtrlOptions;
    private _clickFct: (ev: MouseEvent) => boolean;

    constructor(options: IconActionCtrlOptions) {
        super(options);
        this.options = options;
    }

    onAdd(map: Map): HTMLElement {
//         console.info("IconAction.onAdd")
        this._map = map;
        if (!this.dom) {
            const div = createHtmlElement('div', undefined, this.options.className+' ctrl-icon');
            const f = this._clickFct = (ev:MouseEvent) => {
                ev.cancelBubble = true;
                ev.stopPropagation();
                this.options.action(this);
                return true;
            };     
            div.addEventListener("click", f);
            this.dom = div;
        }
        return this.dom;
    }

    onRemove(map: L.Map) {
        this._map = null;
        this.dom.removeEventListener("click", this._clickFct);
    }
}

export class ChangeFontSizeCtrl extends Control {

    _map: Map;
    dom: HTMLElement;

    options:ControlOptions;
    private _clickFct: (ev: MouseEvent) => boolean;
    divMinus: HTMLDivElement;
    divPlus: HTMLDivElement;

    constructor(options: ControlOptions) {
        super(options);
        this.options = options;
    }

    onAdd(map: Map): HTMLElement {
        // console.info("IconAction.onAdd")
        this._map = map;

        if (!this.dom) {            
            const div = createHtmlElement('div', undefined, 'ctrl-fontsize');     
            const divPlus = this.divPlus = createHtmlElement('div', div, 'ctrl-icon font-plus');     
            const span1 = createHtmlElement('span', divPlus);
            span1.innerText = "A";
            const span2 = createHtmlElement('sup', span1);            
            span2.innerText = '+';
            DomEvent.disableClickPropagation(divPlus);
            const fPlus = this._clickFct = (ev:MouseEvent) => {
                this.changeFontSize(this, true);
                return true;
            };     
            divPlus.addEventListener("click", fPlus);
            divPlus.addEventListener("doubleclick", fPlus);
            divPlus.addEventListener("mouseup", fPlus);
            divPlus.addEventListener("pointerup", fPlus);

            
            const divMinus = this.divMinus = createHtmlElement('div', div, 'ctrl-icon font-minus');     
            const spanMinus1 = createHtmlElement('span', divMinus);
            spanMinus1.innerText = "A";
            const spanMinus2 = createHtmlElement('sup', spanMinus1);
            spanMinus2.innerText = '-';
            DomEvent.disableClickPropagation(divMinus);
            const fMinus = this._clickFct = (ev:MouseEvent) => {
                this.changeFontSize(this, false);
                return true;
            };     
            divMinus.addEventListener("click", fMinus);
            divMinus.addEventListener("doubleclick", fMinus);
            divMinus.addEventListener("mouseup", fMinus);
            divMinus.addEventListener("pointerup", fMinus);


            this.dom = div;
        }
        return this.dom;
    }

    changeFontSize(o:ChangeFontSizeCtrl, increase:boolean) {
        console.info('changefontsize')
        const html = document.querySelector("html");
        if (html) {
            const fs = window.getComputedStyle(html).getPropertyValue('font-size');
            let fontSize = parseInt(fs);            
            const i =  (increase) ? 1 : -1;
            fontSize += i;            

            if (fontSize>6 && fontSize<30) {                
                html.style.fontSize = fontSize+'px';

                if (fontSize===7) {
                    this.divMinus.classList.add('disabled');
                } else {
                    this.divMinus.classList.remove('disabled');
                }
                if (fontSize===29) {
                    this.divPlus.classList.add('disabled');
                } else {
                    this.divPlus.classList.remove('disabled');
                }
            }
        }
        
    }

    onRemove(map: L.Map) {
        this._map = null;
        this.dom.removeEventListener("click", this._clickFct);
    }

}

