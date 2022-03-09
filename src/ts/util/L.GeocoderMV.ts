import * as L from 'leaflet';
import { RadioGroupTreeNode } from '../../../../treecomponent/src/ts/TreeNode';
import *  as Util from "../Util";
import { CancelablePromise } from '../Util';

export interface GeocoderGeocodingQueryParams {

}

export interface GeocoderReverseQueryParams {
}

export interface GeocoderParam {
    serviceUrl: string,
    nameProperties?: ['_title_'],
    geocodingQueryParams: any,
    reverseQueryParams: any,
    htmlTemplate?:any
}


export class Geocoder {
    options:GeocoderParam = {
        serviceUrl: undefined,
        nameProperties: ['_title_'],
        geocodingQueryParams: undefined,
        reverseQueryParams: undefined,
    }
    _key: string;
    _activeRequest: XMLHttpRequest;

    constructor(key: string, options:GeocoderParam) {
        this.options = { ...this.options, ...options };
        this._key = key;
    }

    geocode(query:string):Promise<any> {
        if (this._activeRequest) {
            console.info("cancel last");
            this._activeRequest.abort();
        } 
        const params = {
            type: 'search',
            key: this._key,
            query: query.toLowerCase(),
            ...this.options.geocodingQueryParams
        }
        const url = this.options.serviceUrl + Util.getParamString(params);   
        const xhr = this._activeRequest = new XMLHttpRequest();	
        const promise = new Promise((resolve, reject) => {
            xhr.onloadend = () => {
                if (xhr.status === 200) {
                    const json = JSON.parse(xhr.responseText);
                    const data = this._decodeFeatures(json, params);
                    console.info(`resolved`);
                    resolve(data);
                } 
                else {
                    reject({
                        status: xhr.status,
                        statusText: xhr.statusText
                    });
                }
            };
            xhr.onerror = function (ev) {
                reject({
                    status: this.status,
                    statusText: xhr.statusText,
                    event: ev
                });
            };
            xhr.open('GET', url);              
            console.info(`run request "${url}"`);
            xhr.send();
        });
        promise["cancel"] = () => {
            xhr.abort();
            console.info("xhr.canceled");
        }
        return promise;
    }
    /*
    async geocode2(query:string):Promise<any> {
        if (this._activeRequest) {
            console.info("cancel last");
            this._activeRequest.cancel();
        }
        return new Promise<any>( (resolve, reject) => {
            const params = {
                type: 'search',
                key: this._key,
                query: query.toLowerCase(),
                ...this.options.geocodingQueryParams
            }
            console.info("create Request");
            const promise = this._activeRequest = Util.loadJson(this.options.serviceUrl, params);
            promise.then(                
                data => { 
                    console.info("loadJson=>then");                 
                    this._activeRequest = undefined;
                    resolve(this._decodeFeatures(data, params));
                }
            ).catch(reason => {
                this._activeRequest = undefined;
                reject(reason);
            });
        });

        // getJSON(
        //     this.options.serviceUrl,
        //     params,
        //     (data) => { cb.call(context, this._decodeFeatures(data, params.query)) }
        // )
    }
*/
    suggest(query:string):Promise<any> {
        return this.geocode(query);
    }

    reverse(latLng:L.LatLng, scale, cb:Function, context:any) {
        const bb = latLng.toBounds(200);
        let params = {
            type: 'reverse',
            key: this._key,
            query: latLng.lng + ',' + latLng.lat,
            bbox: bb.getWest() + ',' + bb.getNorth() + ',' + bb.getEast() + ',' + bb.getSouth(),
            bbox_epsg: '4326'
        };
        params = { ...this.options.reverseQueryParams, ...params };

        Util.loadJson(this.options.serviceUrl, params).then(
            data => { 
                cb.call(context, this._decodeReverseFeatures(data));
            }
        );

        // getJSON(
        //     this.options.serviceUrl,
        //     params,
        //     (data: any) => { cb.call(context, this._decodeReverseFeatures(data)) }
        // );
    }

    _decodeFeatures(data, query) {

        // console.info(`decodeFeatures ${query.class}`, query, data);
        const results = [];
        const group = query.class;

        // console.info(query, data);
        if (data && data.features) {
            for (let i = 0; i < data.features.length; i++) {
                const f = data.features[i];
                if (f.properties.objektgruppe === "Adresse") {
                    results.push({
                        name: this._deocodeFeatureNameAdresse(f),
                        group: f.properties.objektgruppe,
                        // html: this.options.htmlTemplate ? this.options.htmlTemplate(f) : undefined,
                        feature: f,
                        // properties: f.properties,
                        // rtr center: new L.LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0])
                    });
                } else if (f.properties.objektgruppe === "Straße") {
                    results.push({
                        name: this._deocodeFeatureNameStrasse(f),
                        group: f.properties.objektgruppe,
                        // html: this.options.htmlTemplate ? this.options.htmlTemplate(f) : undefined,
                        feature: f,
                        // properties: f.properties,
                        // rtr center: new L.LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0])
                    });
                } else if (f.properties.objektgruppe === "Gemeindeteil") {
                    results.push({
                        name: this._deocodeFeatureNameGemeindeteil(f),
                        group: f.properties.objektgruppe,
                        // html: this.options.htmlTemplate ? this.options.htmlTemplate(f) : undefined,
                        feature: f,
                        // properties: f.properties,
                        // rtr center: new L.LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0])
                    });
                } else if (f.properties.objektgruppe === "Gemeinde") {
                    results.push({
                        name: this._deocodeFeatureNameGemeinde(f),
                        group: f.properties.objektgruppe,
                        // html: this.options.htmlTemplate ? this.options.htmlTemplate(f) : undefined,
                        feature: f,
                        // properties: f.properties,
                        // rtr center: new L.LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0])
                    });
                } else {
                    results.push({
                        name: this._deocodeFeatureName(f),
                        group: f.properties.objektgruppe,
                        // html: this.options.htmlTemplate ? this.options.htmlTemplate(f) : undefined,
                        feature: f,
                        // properties: f.properties,
                        // rtr center: new L.LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0])
                    });
                }
            }
        }
        return results;
    }

    _decodeReverseFeatures(data) {
        const results = [];
        if (data && data.features) {
            for (let i = 0; i < data.features.length; i++) {
                const f = data.features[i];
                if (f.properties.objektgruppe === "Adresse") {
                    results.push({
                        name: this._deocodeFeatureNameAdresse(f),
                        html: this.options.htmlTemplate ? this.options.htmlTemplate(f) : undefined,
                        feature: f,
                        properties: f.properties,
                        center: new L.LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0])
                    });
                }
            }
        }
        return results;
    }

    _deocodeFeatureNameGemeinde(f) {
        const name = f.properties['gemeinde_name'];
        const idx = name.indexOf(',');
        return (idx > 0) ? name.substring(0, idx) : name;
    }

    _deocodeFeatureNameGemeindeteil(f) {
        const gemeinde_name = f.properties['gemeinde_name'];
        const gemeindeteil_name = f.properties['gemeindeteil_name'];

        const idx = gemeinde_name.indexOf(',');
        let name = (idx > 0) ? gemeinde_name.substring(0, idx) : gemeinde_name;
        if (gemeindeteil_name && name !== gemeindeteil_name) {
            name += ", " + gemeindeteil_name;
        }
        return name;
    }

    _deocodeFeatureNameStrasse(f) {
        const gemeinde_name = f.properties['gemeinde_name'];
        const gemeindeteil_name = f.properties['gemeindeteil_name'];
        const strasse_name = f.properties['strasse_name'];
        const idx = gemeinde_name.indexOf(',');
        // console.info(gemeinde_name + " " + idx);
        let name = (idx > 0) ? gemeinde_name.substring(0, idx) : gemeinde_name;

        if (gemeindeteil_name && name !== gemeindeteil_name) {
            name += ", " + gemeindeteil_name;
        }
        name += ", " + strasse_name;
        return name;
    }

    _deocodeFeatureNameAdresse(f) {
        const gemeinde_name = f.properties['gemeinde_name'];
        const gemeindeteil_name = f.properties['gemeindeteil_name'];
        const strasse_name = f.properties['strasse_name'];
        const idx = gemeinde_name.indexOf(',');
        let name = (idx > 0) ? gemeinde_name.substring(0, idx) : gemeinde_name;

        if (gemeindeteil_name && name !== gemeindeteil_name) {
            name += ", " + gemeindeteil_name;
        }
        name += ", " + strasse_name;

        const hausnummer = f.properties['hausnummer'];
        const hausnummer_zusatz = f.properties['hausnummer_zusatz'];
        if (hausnummer) {
            name += " " + hausnummer;
        }
        if (hausnummer_zusatz) {
            name += hausnummer_zusatz;
        }

        return name;
    }

    _deocodeFeatureName(f) {
        let name:string;
        for (let j = 0; !name && j < this.options.nameProperties.length; j++) {
            name = f.properties[this.options.nameProperties[j]];
        }
        if (f.properties.objektgruppe === "Gemeindeteil" || f.properties.objektgruppe === "Gemeinde") {
            let idx = f.properties['_title_'].indexOf(',');
            name = (idx > 0) ? f.properties['_title_'].substring(0, idx) : f.properties['_title_'];
        }
        return name;
    }
}

