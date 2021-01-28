export async function loadJson(url: string, params?:string[]) {
	let value = await makeRequest(url + getParamString(params));
	return JSON.parse(value);
}

export function makeRequest(url:string, auth?:string):Promise<any> {
	return new Promise<any>(function (resolve, reject) {
		var xhr = new XMLHttpRequest();		
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
		xhr.send();
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

export function createHtmlElement(tag:string, parent:HTMLElement, className?:string):HTMLElement {
    const el = document.createElement(tag);
    if (parent) {
        parent.appendChild(el);
    }
    if (className) {
        el.className = className;
    }
    return el;
}