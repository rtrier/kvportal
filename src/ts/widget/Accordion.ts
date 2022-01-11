import { createHtmlElement } from "../Util";

export class AccordionItem {

    title:string
    content:HTMLElement
    dom: HTMLDivElement;

    constructor(title:string, content:HTMLElement) {
        this.title = title;
        this.content = content;
    }

    render():HTMLElement {
        const dom = this.dom = document.createElement('div');
        dom.className = 'accordion-item';
        const titleDiv = createHtmlElement('div', dom);
        const span = createHtmlElement('span', titleDiv);
        const i = createHtmlElement('span', titleDiv, 'icon');        
        span.innerHTML = this.title;
        titleDiv.addEventListener('click', (evt)=>{dom.classList.toggle('opened')});
        if (this.content) {
            dom.appendChild(this.content);
        }
        return dom;
    }

    setCollapsed(collapse:boolean):void {
        if (collapse) {
            this.dom.classList.remove('opened')
        } else {
            this.dom.classList.add('opened')
        }
    }

}
export class Accordion {

    items:AccordionItem[];

    constructor(items:AccordionItem[]) {
        this.items = items;
    }

    render():HTMLElement {
        const dom = document.createElement('div');
        dom.className = 'accordion';
        const items = this.items;
        for (let i=0; i<items.length; i++) {
            const itemDom = items[i].render();
            if (i===0) {
                itemDom.classList.add('opened');
            }
            dom.appendChild(itemDom);
        }
        return dom;
    }

}