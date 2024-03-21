import { createHtmlElement } from "../Util";

export class AccordionItem {
    title: string;
    content: HTMLElement;
    dom: HTMLDivElement;
    options: any;

    observer: MutationObserver;

    constructor(title: string, content: HTMLElement, options?: any) {
        this.title = title;
        this.content = content;
        this.options = options;
    }

    render(): HTMLElement {
        const dom = (this.dom = document.createElement("div"));
        dom.className = "accordion-item";
        const titleDiv = createHtmlElement("div", dom);
        const span = createHtmlElement("span", titleDiv);
        const i = createHtmlElement("span", titleDiv, "icon");
        span.innerHTML = this.title;
        titleDiv.addEventListener("click", (evt) => {
            const opened = dom.classList.toggle("opened");
            if (this.options?.minsize) {
                console.info("opened=" + opened);
                if (opened) {
                    this.dom.style.minHeight = this._calcHeight() + "px";
                } else {
                    this.dom.style.minHeight = "";
                }
            }
        });
        if (this.content) {
            dom.appendChild(this.content);
            this.observer = new MutationObserver((mutationList, observer) => this.domChanged(mutationList, observer));
            this.observer.observe(this.content, { attributes: false, childList: true, subtree: true });
        }
        return dom;
    }

    _calcHeight() {
        const titleHeight = this.dom.firstElementChild.clientHeight;
        const contentHeight = this.content.scrollHeight;
        const accordionHeight = titleHeight + contentHeight;
        const totalHeight = this.dom.parentElement.clientHeight;
        const sollHeight = Math.min((0.5 * totalHeight) / 2, accordionHeight);
        return sollHeight;
    }

    domChanged(mutationList: MutationRecord[], observer: MutationObserver) {
        // console.info("domChanged", mutationList, this.content.clientHeight, this.content.scrollHeight);
        if (this.options?.minsize) {
            this.dom.style.minHeight = this._calcHeight() + "px";
        }
    }

    setCollapsed(collapse: boolean): void {
        if (collapse) {
            this.dom.classList.remove("opened");
        } else {
            this.dom.classList.add("opened");
        }
    }
}
export class Accordion {
    items: AccordionItem[];

    constructor(items: AccordionItem[]) {
        this.items = items;
    }

    render(): HTMLElement {
        const dom = document.createElement("div");
        dom.className = "accordion";
        const items = this.items;
        for (let i = 0; i < items.length; i++) {
            const itemDom = items[i].render();
            if (i === 0) {
                itemDom.classList.add("opened");
            }
            dom.appendChild(itemDom);
        }
        return dom;
    }
}
