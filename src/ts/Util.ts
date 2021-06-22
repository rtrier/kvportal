
export interface CancelablePromise extends Promise<any> {
	onCancel(cb:()=>void):this
	cancel():void
}
  

export function createCancellablePromise(executor: (
	resolve: (value?: any | PromiseLike<any>) => void, 
	reject: (reason?: any) => void) => any):CancelablePromise {

	const t = <CancelablePromise> new Promise(executor) as CancelablePromise;
	t.onCancel = (cb:()=>void) => {
		(<any>t).cancelMethod = cb;
		return t;
	}    
    t.cancel = () => {
		console.info("cancel called");
        if ((<any>t).cancelMethod) {
            (<any>t).cancelMethod();
        }
    }
	return t;
}

export class XCancelablePromise<T> extends Promise<T>{

    private cancelMethod: () => void;

    constructor(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
        super(executor);
    }

	onCancel(cb:()=>void):this {
		this.cancelMethod = cb;
		return this;
	}

    
    public cancel() {
        if (this.cancelMethod) {
            this.cancelMethod();
        }
    }
}


export function loadJson(url: string, params?:any):CancelablePromise {
	let promise:CancelablePromise;
	return  createCancellablePromise(function (resolve, reject) {
		const sUrl = url + getParamString(params);
		promise = makeRequest(sUrl);
		promise.then(
			(value)=>{
				try {
					const result = JSON.parse(value);
					resolve(result);
				} catch(ex) {
					reject( `Error parsing response from "${sUrl}" reason:"${ex}"`);
				}
			}
		).catch((reason)=>{
			reject(reason);
		});
	}).onCancel(()=>{
		console.info("cancel");
		if (promise) {
			promise.cancel();
		}
	});
	// let value = await makeRequest(url + getParamString(params));
	// return JSON.parse(value);
}

export function makeRequest(url:string, auth?:string):CancelablePromise {
	const xhr = new XMLHttpRequest();	
	return createCancellablePromise(function (resolve, reject) {			
		xhr.onloadend = function () {
			if (this.status === 200) {
				resolve(xhr.responseText);
			} 
			else {
				reject({
					status: this.status,
					statusText: xhr.statusText
				});
			}
		}
		xhr.onerror = function (ev) {
			reject({
				status: this.status,
				statusText: xhr.statusText,
				event: ev
			});
		}
		xhr.open('GET', url);  
		if (auth) {
			xhr.setRequestHeader("Authorization", auth);
        }
		console.info(`run request "${url}"`);
		xhr.send();
	}).onCancel(()=>{
		console.info("xhr abort", xhr);
		xhr.abort();
	});
}

export function getParamString(obj:any, existingUrl?:string, uppercase?:boolean) {
	if (!obj) {
		return "";
	}
	const params = [];	
	for (let i in obj) {
		const key = encodeURIComponent(uppercase ? i.toUpperCase() : i);
		const value = obj[i];
		if (!Array.isArray(value)) {
			params.push(key + '=' + encodeURIComponent(value));
		} else {
			for (let j = 0; j < value.length; j++) {
				params.push(key + '=' + encodeURIComponent(value[j]));
			}
		}
	}
	return (!existingUrl || existingUrl.indexOf('?') === -1 ? '?' : '&') + params.join('&');
}

// export function addTooltip(el:HTMLElement, txt?:string) {
// 	const t = createHtmlElement('div', el, 'csstooltip');
// 	t.innerHTML = txt;
// }

export function createHtmlElement<K extends keyof HTMLElementTagNameMap>(tag:K, parent?:HTMLElement, className?:string): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (parent) {
        parent.appendChild(el);
    }
    if (className) {
        el.className = className;
    }
    return el;
}

export function createRow(attName:string, value:any, parent:HTMLElement):HTMLTableRowElement {
    const row = document.createElement('tr');
    const c1 = document.createElement('td');
    c1.innerText = attName;
    const c2 = document.createElement('td');
    c2.innerText = value;
    row.appendChild(c1);
    row.appendChild(c2);
    parent.appendChild(row);
    return row;
}