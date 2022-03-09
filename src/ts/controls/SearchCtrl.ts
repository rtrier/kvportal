// import * as L from "leaflet";
import { Control, DomEvent } from "leaflet";
import { EventDispatcher } from "ste-events";
import { createHtmlElement } from "../Util";
import autocomplete, { AutocompleteItem, AutocompleteSettings } from "../util/Autocompleter";

export interface SearchControlOptions<T extends AutocompleteItem> extends AutocompleteSettings<T> {
    position?: L.ControlPosition;
}

export class SearchControl extends Control {
    onShowSearchField = new EventDispatcher<SearchControl, boolean>();

    _container: HTMLDivElement;
    _Bttn: HTMLButtonElement;

    _clickFct: (evt: MouseEvent) => void;
    searchDom: HTMLDivElement;
    searchBox: HTMLInputElement;

    params: SearchControlOptions<any>;
    closeBttn: HTMLDivElement;
    inputField: HTMLInputElement;

    constructor(params: SearchControlOptions<any>) {
        super(params);
        this.params = params;
        params.onSearchFinished = (ev) => this.isSearching(false);
        params.onSearchStartRunning = (ev) => this.isSearching(true);
    }
    isSearching(searching: boolean): void {
        if (this.searchDom) {
            if (searching) {
                this.searchDom.classList.add("searching");
            } else {
                this.searchDom.classList.remove("searching");
            }
        }
    }

    onAdd(map: L.Map): HTMLElement {
        console.info("SearchControl.onAdd");
        this._container = createHtmlElement("div", undefined, "control-search");
        const bttn = (this._Bttn = createHtmlElement("button", this._container, "search-button ctrl-icon"));
        bttn.ariaLabel = "Suchfeld öffnen";
        createHtmlElement("i", bttn);

        this._clickFct = (evt: MouseEvent) => {
            // this.onShowSearchField.dispatch(this, !closed);
            this.showSearchField();
        };
        bttn.addEventListener("click", this._clickFct);
        DomEvent.disableClickPropagation(this._container);

        this.createSearchField();
        this._container.appendChild(this.searchDom);

        // this._container.addEventListener('mouseenter', ()=>{
        //   console.info("element._container:",this._container);
        //   console.info("element.offsetTop:"+this._container.offsetTop);
        //   console.info("element.offsetLeft:"+this._container.offsetLeft);
        //   console.info("element.offsetWidth:"+this._container.offsetWidth);
        //   console.info("element.offsetHeight:"+this._container.offsetHeight);
        //   console.info("element.offsetParent:",this._container.offsetParent);
        //   console.info("element.offsetParent.offsetParent:", (<any>this._container.offsetParent).offsetParent);
        // })
        document.addEventListener("keydown", (evt: KeyboardEvent) => {
            if (evt.ctrlKey && evt.key === "f") {
                console.info(evt);
                this.showSearchField();
                this.inputField.focus();
                evt.preventDefault();
            }
        });

        return this._container;
    }

    onRemove(map: L.Map) {
        this._Bttn.removeEventListener("click", this._clickFct);
    }

    createSearchField() {
        const searchDom = (this.searchDom = createHtmlElement("div", undefined, "search"));
        createHtmlElement("div", searchDom, "search-animation");
        const searchWrapper = createHtmlElement("div", searchDom, "search-wrapper");
        const closeBttn = (this.closeBttn = createHtmlElement("div", searchDom, "angels-up"));
        closeBttn.addEventListener("click", (ev) => this.closeBttnClicked(ev));

        const searchBox = (this.inputField = this.searchBox = document.createElement("input"));
        searchWrapper.appendChild(searchBox);
        searchBox.type = "text";

        searchBox.placeholder = "Ort, Adresse, Thema..";

        const searchBoxClear = document.createElement("i");
        searchBoxClear.className = "search-input-clear";
        searchWrapper.appendChild(searchBoxClear);
        searchBoxClear.addEventListener("click", (ev) => {
            searchBox.value = "";
            this.clearClicked();
        });

        autocomplete(searchBox, this.params);
    }

    showSearchField() {
        this._container.classList.toggle("opened");
        this.searchBox.focus();
    }
    closeBttnClicked(ev: MouseEvent): any {
        this._container.classList.toggle("opened");
    }

    clearClicked() {
        this.inputField.value = "";
        this.params.onSelect(undefined, this.inputField);
    }
}
