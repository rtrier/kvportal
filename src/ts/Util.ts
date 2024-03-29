import { Browser } from "leaflet";

export interface CancelablePromise extends Promise<any> {
    onCancel(cb: () => void): this;
    cancel(): void;
}

export function createCancellablePromise(executor: (resolve: (value?: any | PromiseLike<any>) => void, reject: (reason?: any) => void) => any): CancelablePromise {
    const t = (<CancelablePromise>new Promise(executor)) as CancelablePromise;
    t.onCancel = (cb: () => void) => {
        (<any>t).cancelMethod = cb;
        return t;
    };
    t.cancel = () => {
        // console.info("createCancellablePromise cancel called");
        if ((<any>t).cancelMethod) {
            (<any>t).cancelMethod();
        }
    };
    return t;
}

export function loadJson(url: string, params?: any): CancelablePromise {
    // let promise: CancelablePromise;
    const sUrl = url + getParamString(params);
    const promise = makeRequest(sUrl);
    return createCancellablePromise(function (resolve, reject) {
        promise
            .then((value) => {
                try {
                    const result = JSON.parse(value);
                    resolve(result);
                } catch (ex) {
                    reject(`Error parsing response from "${sUrl}" reason:"${ex}"`);
                }
            })
            .catch((reason) => {
                reject(reason);
            });
    }).onCancel(() => {
        // console.info("onCancel");
        if (promise) {
            promise.cancel();
        }
    });
    // let value = await makeRequest(url + getParamString(params));
    // return JSON.parse(value);
}

export function makeRequest(url: string, auth?: string): CancelablePromise {
    const xhr = new XMLHttpRequest();
    return createCancellablePromise(function (resolve, reject) {
        xhr.onloadend = function () {
            if (this.status === 200) {
                resolve(xhr.responseText);
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText,
                });
            }
        };
        xhr.onerror = function (ev) {
            reject({
                status: this.status,
                statusText: xhr.statusText,
                event: ev,
            });
        };
        xhr.open("GET", url);
        if (auth) {
            xhr.setRequestHeader("Authorization", auth);
        }
        // console.info(`run request "${url}"`);
        xhr.send();
    }).onCancel(() => {
        xhr.abort();
        // console.debug("xhr aborted " + url, xhr);
    });
}

export function getParamString(obj: any, existingUrl?: string, uppercase?: boolean) {
    if (!obj) {
        return "";
    }
    const params = [];
    for (let i in obj) {
        const key = encodeURIComponent(uppercase ? i.toUpperCase() : i);
        const value = obj[i];
        if (!Array.isArray(value)) {
            params.push(key + "=" + encodeURIComponent(value));
        } else {
            for (let j = 0; j < value.length; j++) {
                params.push(key + "=" + encodeURIComponent(value[j]));
            }
        }
    }
    return (!existingUrl || existingUrl.indexOf("?") === -1 ? "?" : "&") + params.join("&");
}

export function createSlider(min: string, max: string, value: string, onchange?: (ev: Event) => void, className?: string): HTMLInputElement {
    // <input type="range" min="1" max="100" value="50" class="slider" id="myRange">
    const input = document.createElement("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.value = value;
    if (onchange) {
        input.addEventListener("input", onchange);
    }
    if (className) {
        input.className = className;
    }
    return input;
}

export function createHtmlElement<K extends keyof HTMLElementTagNameMap>(tag: K, parent?: HTMLElement, className?: string, mixin?: any): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (parent) {
        parent.appendChild(el);
    }
    if (className) {
        el.className = className;
    }
    if (mixin) {
        for (const k in mixin) {
            el[k] = mixin[k];
        }
    }
    return el;
}

export function createCloseButton(cb: (ev: MouseEvent) => void) {
    const closeBttn = document.createElement("span");
    closeBttn.className = "close-button";
    /* closeBttn.innerHTML = '&#xf00d;'; */
    closeBttn.addEventListener("click", cb);
    return closeBttn;
}

export function createRow(attName: string, value: any, parent: HTMLElement): HTMLTableRowElement {
    const row = document.createElement("tr");
    const c1 = document.createElement("td");
    c1.innerText = attName;
    const c2 = document.createElement("td");
    c2.innerText = value;
    row.appendChild(c1);
    row.appendChild(c2);
    parent.appendChild(row);
    return row;
}

const fnStopPropagation = (ev: Event) => {
    if (ev.stopPropagation) {
        ev.stopPropagation();
    } else {
        ev.cancelBubble = true;
    }
    ev.stopPropagation();
    if (ev.preventDefault) {
        ev.preventDefault();
    } else {
        ev.returnValue = false;
    }
    return false;
};
// if (type === 'touchstart' || type === 'touchmove' || type === 'wheel' ||  type === 'mousewheel') {
export function disableEvtPropagation(dom: HTMLElement): void {
    const passiveEvents = (<any>Browser).passiveEvents;
    dom.addEventListener("pointermove", fnStopPropagation);
    dom.addEventListener("mousedown", fnStopPropagation);
    dom.addEventListener("dblclick", fnStopPropagation);
    dom.addEventListener("dragstart", fnStopPropagation);
    dom.addEventListener("drag", fnStopPropagation);
    dom.addEventListener("wheel", fnStopPropagation, passiveEvents ? { passive: false } : false);
}

/**/
export function createCSSSelector(selector, style) {
    console.info(`createCSSSelector(${selector}, ${style})`);
    if (!document.styleSheets) return;
    if (document.getElementsByTagName("head").length == 0) return;

    let styleSheet: CSSStyleSheet;
    // let mediaType;

    for (let i = 0, count = document.styleSheets.length; i < count && styleSheet; i++) {
        if (!document.styleSheets[i].disabled) {
            const media = document.styleSheets[i].media;

            if (typeof media == "object") {
                if (media.mediaText === "" || media.mediaText.indexOf("screen") !== -1) {
                    styleSheet = document.styleSheets[i];
                }
            }
        }
    }

    if (!styleSheet) {
        const styleSheetElement = document.createElement("style");
        styleSheetElement.type = "text/css";
        document.getElementsByTagName("head")[0].appendChild(styleSheetElement);

        for (let i = 0; i < document.styleSheets.length; i++) {
            if (document.styleSheets[i].disabled) {
                continue;
            }
            styleSheet = document.styleSheets[i];
        }
    }

    const styleSheetLength = styleSheet.cssRules ? styleSheet.cssRules.length : 0;
    for (let i = 0; i < styleSheetLength; i++) {
        const rule = styleSheet.cssRules[i];
        if (rule instanceof CSSStyleRule) {
            if (rule.selectorText && rule.selectorText.toLowerCase() == selector.toLowerCase()) {
                rule.style.cssText = style;
                return;
            }
        }
    }
    styleSheet.insertRule(selector + "{" + style + "}", styleSheetLength);
}
