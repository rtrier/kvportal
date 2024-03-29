/*
 * https://github.com/kraaden/autocomplete
 * Copyright (c) 2016 Denys Krasnoshchok
 * MIT License
 */

import { divIcon } from "leaflet";
import { LayerWrapper } from "../controls/MapControl";

export const enum EventTrigger {
    Keyboard = 0,
    Focus = 1,
}

export interface AutocompleteItem {
    // label?: string;
    // group?: string;
}

export interface AutocompleteSettings<T extends AutocompleteItem> {
    render?: (item: T, currentValue: string) => HTMLDivElement | undefined;
    renderGroup?: (name: string, currentValue: string) => HTMLDivElement | undefined;
    className?: string;
    minLength?: number;
    emptyMsg?: string;
    onSelect: (item: T, input: HTMLInputElement) => void;
    onSearchStart: (input: HTMLInputElement) => void;
    onSearchStartRunning?: (input: HTMLInputElement) => void;
    onSearchFinished?: (input: HTMLInputElement) => void;

    initialItems?: T[];
    /**
     * Show autocomplete on focus event. Focus event will ignore the `minLength` property and will always call `fetch`.
     */
    showOnFocus?: boolean;
    // fetch: (text: string, update: (items: T[] | false) => void, trigger: EventTrigger) => void;
    fetch: (text: string) => Promise<T[]>;
    debounceWaitMs?: number;

    labelAttr?: string;
    /**
     * Callback for additional autocomplete customization
     * @param {HTMLInputElement} input - input box associated with autocomplete
     * @param {ClientRect | DOMRect} inputRect - size of the input box and its position relative to the viewport
     * @param {HTMLDivElement} container - container with suggestions
     * @param {number} maxHeight - max height that can be used by autocomplete
     */
    customize?: (input: HTMLInputElement, inputRect: ClientRect | DOMRect, container: HTMLDivElement, maxHeight: number) => void;
    /**
     * Prevents automatic form submit when ENTER is pressed
     */
    preventSubmit?: boolean;

    value?: T;
}

export interface AutocompleteResult {
    destroy: () => void;
}

const enum Keys {
    Enter = 13,
    Esc = 27,
    Up = 38,
    Down = 40,
    Left = 37,
    Right = 39,
    Shift = 16,
    Ctrl = 17,
    Alt = 18,
    CapsLock = 20,
    WindowsKey = 91,
    Tab = 9,
    F1 = 112,
    F12 = 123,
}

export default function autocomplete<T extends AutocompleteItem>(input: HTMLInputElement, settings: AutocompleteSettings<T>): AutocompleteResult {
    // just an alias to minimize JS file size
    const doc = document;

    const container: HTMLDivElement = doc.createElement("div");
    const containerStyle = container.style;
    const userAgent = navigator.userAgent;
    const mobileFirefox = userAgent.indexOf("Firefox") !== -1 && userAgent.indexOf("Mobile") !== -1;
    const debounceWaitMs = settings.debounceWaitMs || 0;
    const preventSubmit = settings.preventSubmit || false;
    const labelAttr = settings.labelAttr || "name";
    const initialItems = settings.initialItems;

    // 'keyup' event will not be fired on Mobile Firefox, so we have to use 'input' event instead
    const keyUpEventName = mobileFirefox ? "input" : "keyup";

    let isBeforeStart = true;

    let items: T[] = [];
    let inputValue = "";
    const minLen = settings.minLength || 2;
    const showOnFocus = settings.showOnFocus;
    let selected: T = settings.value;
    if (selected) {
        input.value = selected[labelAttr];
    }
    let keypressCounter = 0;
    let debounceTimer: number | undefined;

    let searchCounter = 0;
    let lastSearch: string;

    if (!input) {
        throw new Error("input undefined");
    }

    let promises: Promise<any>[] = [];

    container.className = "autocomplete " + (settings.className || "");

    // IOS implementation for fixed positioning has many bugs, so we will use absolute positioning
    containerStyle.position = "absolute";

    /**
     * Detach the container from DOM
     */
    function detach(): void {
        const parent = container.parentNode;
        if (parent) {
            parent.removeChild(container);
        }
    }

    /**
     * Clear debouncing timer if assigned
     */
    function clearDebounceTimer(): void {
        if (debounceTimer) {
            window.clearTimeout(debounceTimer);
        }
    }

    /**
     * Attach the container to DOM
     */
    function attach(): void {
        if (!container.parentNode) {
            doc.body.appendChild(container);
        }
    }

    /**
     * Check if container for autocomplete is displayed
     */
    function containerDisplayed(): boolean {
        return !!container.parentNode;
    }

    /**
     * Clear autocomplete state and hide container
     */
    function clear(): void {
        // prevent the update call if there are pending AJAX requests
        keypressCounter++;

        items = [];
        inputValue = "";
        selected = undefined;
        detach();
        lastSearch = undefined;

        for (let i = 0; i < promises.length; i++) {
            try {
                promises[i]["cancel"]();
            } catch (e) {
                console.error(e, promises[i]);
            }
        }
    }

    /**
     * Update autocomplete position
     */
    function updatePosition(): void {
        // console.warn("updatePosition");
        if (!containerDisplayed()) {
            return;
        }

        containerStyle.height = "auto";

        let width = input.offsetWidth + "px";
        // try {
        //     console.info('updatePosition', input.parentElement.parentElement);
        // } catch (ex) {
        //     console.error(ex)
        // }

        containerStyle.width = width;

        let maxHeight = 0;
        let maxWidth = input.offsetWidth;
        let inputRect: ClientRect | DOMRect | undefined;

        function calc() {
            const docEl = doc.documentElement as HTMLElement;
            const clientTop = docEl.clientTop || doc.body.clientTop || 0;
            const clientLeft = docEl.clientLeft || doc.body.clientLeft || 0;
            const scrollTop = window.pageYOffset || docEl.scrollTop;
            const scrollLeft = window.pageXOffset || docEl.scrollLeft;

            inputRect = input.parentElement.getBoundingClientRect();

            const top = inputRect.top + input.offsetHeight + scrollTop - clientTop + 6;
            const left = inputRect.left + scrollLeft - clientLeft;

            containerStyle.top = top + "px";
            containerStyle.left = left + "px";

            maxHeight = window.innerHeight - (inputRect.top + input.offsetHeight + 8);

            if (maxHeight < 0) {
                maxHeight = 0;
            }

            maxWidth = window.innerWidth - inputRect.left;

            containerStyle.top = top + "px";
            containerStyle.bottom = "";
            containerStyle.left = left + "px";
            containerStyle.maxHeight = maxHeight + "px";
            containerStyle.minWidth = input.parentElement.offsetWidth + "px";

            if (maxWidth > 100) {
                containerStyle.width = "unset";
                containerStyle.maxWidth = maxWidth + "px";
            }
        }

        // the calc method must be called twice, otherwise the calculation may be wrong on resize event (chrome browser)
        calc();
        calc();

        if (settings.customize && inputRect) {
            settings.customize(input, inputRect, container, maxHeight);
        }
    }

    /**
     * Redraw the autocomplete div element with suggestions
     */
    function update(): void {
        // delete all children from autocomplete DOM container
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        // function for rendering autocomplete suggestions
        const render =
            settings.render ||
            function (item: T, currentValue: string): HTMLDivElement | undefined {
                const itemElement = doc.createElement("div");
                const textArea = doc.createElement("label");
                textArea.innerText = item[labelAttr] || "";
                itemElement.appendChild(textArea);
                if (item["group"] === "Thema") {
                    itemElement.title = (<LayerWrapper>item["layer"]).layerDescription.abstract;
                }
                return itemElement;
            };
        // if (settings.render) {
        //     render = settings.render;
        // }

        // function to render autocomplete groups
        const renderGroup =
            settings.renderGroup ||
            function (groupName: string, currentValue: string): HTMLDivElement | undefined {
                const groupDiv = doc.createElement("div");
                groupDiv.textContent = groupName;
                return groupDiv;
            };
        // if () {
        //     renderGroup = settings.renderGroup;
        // }

        const fragment = doc.createDocumentFragment();
        let prevGroup = "#9?$";

        items.forEach(function (item: T): void {
            if (item["group"] && item["group"] !== prevGroup) {
                prevGroup = item["group"];
                const groupDiv = renderGroup(item["group"], inputValue);
                if (groupDiv) {
                    groupDiv.className += " group";
                    fragment.appendChild(groupDiv);
                }
            }
            const div = render(item, inputValue);
            if (div) {
                div.addEventListener("click", function (ev: MouseEvent): void {
                    input.value = item[labelAttr];
                    settings.onSelect(item, input);
                    console.info("isBeforeStart267 true");
                    isBeforeStart = true;
                    clear();
                    ev.preventDefault();
                    ev.stopPropagation();
                });
                if (item === selected) {
                    div.className += " selected";
                }
                fragment.appendChild(div);
            }
        });
        container.appendChild(fragment);
        if (items.length < 1) {
            if (settings.emptyMsg) {
                const empty = doc.createElement("div");
                empty.className = "empty";
                empty.textContent = settings.emptyMsg;
                container.appendChild(empty);
            } else {
                clear();
                return;
            }
        }

        attach();
        updatePosition();

        updateScroll();
    }

    function updateIfDisplayed(): void {
        if (containerDisplayed()) {
            update();
        }
    }

    function resizeEventHandler(): void {
        updateIfDisplayed();
    }

    function scrollEventHandler(e: Event): void {
        if (e.target !== container) {
            updateIfDisplayed();
        } else {
            e.preventDefault();
        }
    }

    function keyupEventHandler(ev: KeyboardEvent): void {
        const keyCode = ev.which || ev.keyCode || 0;

        const ignore = [Keys.Up, Keys.Esc, Keys.Right, Keys.Left, Keys.Shift, Keys.Ctrl, Keys.Alt, Keys.CapsLock, Keys.WindowsKey, Keys.Tab];
        for (const key of ignore) {
            if (keyCode === key) {
                return;
            }
        }

        if (keyCode >= Keys.F1 && keyCode <= Keys.F12) {
            return;
        }

        // the down key is used to open autocomplete
        if (keyCode === Keys.Down && containerDisplayed()) {
            return;
        }

        startFetch(EventTrigger.Keyboard);
    }

    /**
     * Automatically move scroll bar if selected item is not visible
     */
    function updateScroll(): void {
        const elements = container.getElementsByClassName("selected");
        if (elements.length > 0) {
            let element = elements[0] as HTMLDivElement;

            // make group visible
            const previous = element.previousElementSibling as HTMLDivElement;
            if (previous && previous.className.indexOf("group") !== -1 && !previous.previousElementSibling) {
                element = previous;
            }

            if (element.offsetTop < container.scrollTop) {
                container.scrollTop = element.offsetTop;
            } else {
                const selectBottom = element.offsetTop + element.offsetHeight;
                const containerBottom = container.scrollTop + container.offsetHeight;
                if (selectBottom > containerBottom) {
                    container.scrollTop += selectBottom - containerBottom;
                }
            }
        }
    }

    /**
     * Select the previous item in suggestions
     */
    function selectPrev(): void {
        if (items.length < 1) {
            selected = undefined;
        } else {
            if (selected === items[0]) {
                selected = items[items.length - 1];
            } else {
                for (let i = items.length - 1; i > 0; i--) {
                    if (selected === items[i] || i === 1) {
                        selected = items[i - 1];
                        break;
                    }
                }
            }
        }
    }

    /**
     * Select the next item in suggestions
     */
    function selectNext(): void {
        if (items.length < 1) {
            selected = undefined;
        }
        if (!selected || selected === items[items.length - 1]) {
            selected = items[0];
            return;
        }
        for (let i = 0; i < items.length - 1; i++) {
            if (selected === items[i]) {
                selected = items[i + 1];
                break;
            }
        }
    }

    function keydownEventHandler(ev: KeyboardEvent): void {
        const keyCode = ev.which || ev.keyCode || 0;

        if (isBeforeStart) {
            if (settings.onSearchStart) {
                console.info("keydownEventHandler", ev);
                settings.onSearchStart(input);
            }
            isBeforeStart = false;
        }

        if (ev.keyCode == 65 && ev.ctrlKey) {
            (<any>ev.target).select();
        }

        if (keyCode === Keys.Up || keyCode === Keys.Down || keyCode === Keys.Esc) {
            const containerIsDisplayed = containerDisplayed();

            if (keyCode === Keys.Esc) {
                clear();
                // cancel();
            } else {
                if (!containerDisplayed || items.length < 1) {
                    return;
                }
                keyCode === Keys.Up ? selectPrev() : selectNext();
                update();
            }

            ev.preventDefault();
            if (containerIsDisplayed) {
                ev.stopPropagation();
            }

            return;
        }

        if (keyCode === Keys.Enter) {
            if (selected) {
                input.value = selected[labelAttr];
                settings.onSelect(selected, input);
                console.info("isBeforeStart444 true");
                isBeforeStart = true;
                clear();
            }

            if (preventSubmit) {
                ev.preventDefault();
            }
        }
    }

    function focusEventHandler(): void {
        if (showOnFocus) {
            startFetch(EventTrigger.Focus);
        }
        if (initialItems) {
            items = initialItems;
            update();
        }
        if (input) {
            input.select();
        }
    }

    // function startFetch(trigger: EventTrigger) {
    //     // if multiple keys were pressed, before we get update from server,
    //     // this may cause redrawing our autocomplete multiple times after the last key press.
    //     // to avoid this, the number of times keyboard was pressed will be
    //     // saved and checked before redraw our autocomplete box.
    //     const savedKeypressCounter = ++keypressCounter;

    //     const val = input.value;
    //     if (val.length >= minLen || trigger === EventTrigger.Focus) {
    //         clearDebounceTimer();
    //         debounceTimer = window.setTimeout(function(): void {
    //             settings.fetch(val, function(elements: T[] | false): void {
    //                 if (keypressCounter === savedKeypressCounter && elements) {
    //                     items = elements;
    //                     inputValue = val;
    //                     selected = items.length > 0 ? items[0] : undefined;
    //                     update();
    //                 }
    //             }, EventTrigger.Keyboard);
    //         }, trigger === EventTrigger.Keyboard ? debounceWaitMs : 0);
    //     } else {
    //         clear();
    //     }
    // }

    function addToSearchCounter(i: number) {
        searchCounter = searchCounter + i;
        // console.info(`addToSearchCounter(${i})=>${searchCounter}`);
        if (searchCounter < 0) {
            searchCounter = 0;
        }
        if (searchCounter === 0) {
            // console.warn("allSsearchFetchDone");
            if (settings.onSearchFinished) {
                settings.onSearchFinished(input);
            }
        } else {
            // console.warn("searching");
            if (settings.onSearchStartRunning) {
                settings.onSearchStartRunning(input);
            }
        }
    }

    function removePromise(p: Promise<any>) {
        promises = promises.filter((f) => {
            return f !== p;
        });
    }

    function startFetch(trigger: EventTrigger) {
        // if multiple keys were pressed, before we get update from server,
        // this may cause redrawing our autocomplete multiple times after the last key press.
        // to avoid this, the number of times keyboard was pressed will be
        // saved and checked before redraw our autocomplete box.
        const savedKeypressCounter = ++keypressCounter;
        // console.info(`startFetch "${input.value}" ${trigger}`, trigger);
        const val = input.value;
        // if (val.length >= minLen || trigger === EventTrigger.Focus) {
        if (val.length >= minLen && val !== lastSearch) {
            // if (val === lastSearch) {
            //     console.info(`equ ${val} ${lastSearch}`);
            // }
            lastSearch = val;

            // console.info("startfetch");

            clearDebounceTimer();
            debounceTimer = window.setTimeout(
                function (): void {
                    addToSearchCounter(1);
                    const promise: Promise<any> = settings.fetch(val);
                    promises.push(promise);
                    promise
                        .then((elements: T[]) => {
                            // console.info("Autocomnplete.update", elements.length, elements);
                            // console.info(`autocompleter keypressCounter=${keypressCounter} savedKeypressCounter=${savedKeypressCounter}`, elements);
                            if (keypressCounter === savedKeypressCounter && elements) {
                                items = elements;
                                inputValue = val;
                                selected = items.length > 0 ? items[0] : undefined;
                                update();
                            }
                            addToSearchCounter(-1);
                            removePromise(promise);
                        })
                        .catch((reason) => {
                            // console.info(`fetch not succedded`, reason);
                            addToSearchCounter(-1);
                            removePromise(promise);
                        });
                },
                trigger === EventTrigger.Keyboard ? debounceWaitMs : 0
            );
        } else {
            console.info("startFetch=>clear");
            clear();
        }
    }

    function blurEventHandler(): void {
        // we need to delay clear, because when we click on an item, blur will be called before click and remove items from DOM
        setTimeout(() => {
            if (doc.activeElement !== input) {
                clear();
            }
        }, 200);
    }

    /**
     * Fixes #26: on long clicks focus will be lost and onSelect method will not be called
     */
    container.addEventListener("mousedown", function (evt: Event) {
        evt.stopPropagation();
        evt.preventDefault();
    });

    /**
     * Fixes #30: autocomplete closes when scrollbar is clicked in IE
     * See: https://stackoverflow.com/a/9210267/13172349
     */
    container.addEventListener("focus", () => input.focus());

    /**
     * This function will remove DOM elements and clear event handlers
     */
    function destroy(): void {
        input.removeEventListener("focus", focusEventHandler);
        input.removeEventListener("keydown", keydownEventHandler);
        input.removeEventListener(keyUpEventName, keyupEventHandler as EventListenerOrEventListenerObject);
        input.removeEventListener("blur", blurEventHandler);
        window.removeEventListener("resize", resizeEventHandler);
        doc.removeEventListener("scroll", scrollEventHandler, true);
        clearDebounceTimer();
        clear();
    }

    // setup event handlers
    input.addEventListener("keydown", keydownEventHandler);
    input.addEventListener(keyUpEventName, keyupEventHandler as EventListenerOrEventListenerObject);
    input.addEventListener("blur", blurEventHandler);
    input.addEventListener("focus", focusEventHandler);
    window.addEventListener("resize", resizeEventHandler);
    doc.addEventListener("scroll", scrollEventHandler, true);

    return {
        destroy,
    };
}
