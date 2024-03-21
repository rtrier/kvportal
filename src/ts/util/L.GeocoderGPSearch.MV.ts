// import * as L from 'leaflet';
import { LatLng, Projection } from "leaflet";
import * as Util from "../Util";

export class Geocoder {
    options: {
        serviceUrl: "https://www.geodaten-mv.de/geocoding-api/";
        nameProperties: ["_title_"];
        geocodingQueryParams: {};
        reverseQueryParams: {};
        htmlTemplate: any;
    };

    constructor(options: any) {
        this.options = { ...this.options, ...options };
    }

    geocode(query: string): Promise<any> {
        const params = {
            q: query.toLowerCase(),
            crs: "EPSG:4326",
            geom: true,
            ...this.options.geocodingQueryParams,
        };

        // getJSON(this.options.serviceUrl + "/place/autocomplete", params, (data: any) => {
        // getJSON(this.options.serviceUrl + "/place/search/", params, (data: any) => {
        //     cb.call(context, this._decodeFeatures(data, params.q));
        // });

        // const promise: Promise<any> = new Promise((resolve, reject) => {
        //     Util.loadJson(this.options.serviceUrl + "/place/search/", params).then((data) => {
        //         const d = this._decodeFeatures(data, params.q);
        //         resolve(d);
        //     });
        // });

        const lPromise = Util.loadJson(this.options.serviceUrl + "/place/search/", params);
        const promise: Promise<any> = new Promise((resolve, reject) => {
            lPromise
                .then((data) => {
                    const d = this._decodeFeatures(data, params.q);
                    resolve(d);
                })
                .catch((reason) => {
                    console.info("search reason: ", reason);
                    reject(reason);
                });
        });

        promise["cancel"] = () => {
            lPromise.cancel();
            // console.info("xhr.canceled done");
        };
        return promise;
    }

    suggest(query: string, cb: Function) {
        return this.geocode(query);
    }

    reverse(latLng: L.LatLng, scale, cb: Function, context: any) {
        const bb = latLng.toBounds(200);
        let params = {
            type: "reverse",
            query: latLng.lng + "," + latLng.lat,
            bbox: bb.getWest() + "," + bb.getNorth() + "," + bb.getEast() + "," + bb.getSouth(),
            bbox_epsg: "4326",
        };
        params = { ...this.options.reverseQueryParams, ...params };

        // getJSON(this.options.serviceUrl, params, (data: any) => {
        //     cb.call(context, this._decodeReverseFeatures(data));
        // });
        Util.loadJson(this.options.serviceUrl, params).then((data: any) => {
            cb.call(context, this._decodeReverseFeatures(data));
        });
    }

    _decodeFeatures(data, query: string) {
        const results = [];

        // console.info(query);
        if (data && data.features) {
            for (let i = 0; i < data.features.length; i++) {
                const f = data.features[i];
                const boundsLower = f.properties.geobounds_lower.split(",");
                const boundsUpper = f.properties.geobounds_upper.split(",");
                const x = (parseFloat(boundsLower[0]) + parseFloat(boundsUpper[0])) / 2;
                const y = (parseFloat(boundsLower[1]) + parseFloat(boundsUpper[1])) / 2;

                // const coords4326 = Projection.SphericalMercator.project(new LatLng(x, y));
                // console.info(x, y, coords4326, f);

                results.push({
                    name: f.properties.placeName,
                    html: this.options.htmlTemplate ? this.options.htmlTemplate(f) : undefined,
                    feature: f,
                    properties: f.properties,
                    center: new LatLng(x, y),
                    group: f.properties.primaryType,
                });

                // if (f.properties.objektgruppe === "Adresse") {
                //     results.push({
                //         name: this._deocodeFeatureNameAdresse(f),
                //         html: this.options.htmlTemplate ? this.options.htmlTemplate(f) : undefined,
                //         feature: f,
                //         properties: f.properties,
                //         center: new LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0]),
                //     });
                // } else if (f.properties.objektgruppe === "Straße") {
                //     results.push({
                //         name: this._deocodeFeatureNameStrasse(f),
                //         html: this.options.htmlTemplate ? this.options.htmlTemplate(f) : undefined,
                //         feature: f,
                //         properties: f.properties,
                //         center: new LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0]),
                //     });
                // } else if (f.properties.objektgruppe === "Gemeindeteil") {
                //     results.push({
                //         name: this._deocodeFeatureNameGemeindeteil(f),
                //         html: this.options.htmlTemplate ? this.options.htmlTemplate(f) : undefined,
                //         feature: f,
                //         properties: f.properties,
                //         center: new LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0]),
                //     });
                // } else if (f.properties.objektgruppe === "Gemeinde") {
                //     results.push({
                //         name: this._deocodeFeatureNameGemeinde(f),
                //         html: this.options.htmlTemplate ? this.options.htmlTemplate(f) : undefined,
                //         feature: f,
                //         properties: f.properties,
                //         center: new LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0]),
                //     });
                // } else {
                //     results.push({
                //         name: this._deocodeFeatureName(f),
                //         html: this.options.htmlTemplate ? this.options.htmlTemplate(f) : undefined,
                //         feature: f,
                //         properties: f.properties,
                //         center: new LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0]),
                //     });
                // }
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
                        center: new LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0]),
                    });
                }
            }
        }
        return results;
    }

    _deocodeFeatureNameGemeinde(f) {
        const name = f.properties["gemeinde_name"];
        const idx = name.indexOf(",");
        return idx > 0 ? name.substring(0, idx) : name;
    }

    _deocodeFeatureNameGemeindeteil(f) {
        const gemeinde_name = f.properties["gemeinde_name"];
        const gemeindeteil_name = f.properties["gemeindeteil_name"];

        const idx = gemeinde_name.indexOf(",");
        let name = idx > 0 ? gemeinde_name.substring(0, idx) : gemeinde_name;
        if (gemeindeteil_name && name !== gemeindeteil_name) {
            name += ", " + gemeindeteil_name;
        }
        return name;
    }

    _deocodeFeatureNameStrasse(f) {
        const gemeinde_name = f.properties["gemeinde_name"];
        const gemeindeteil_name = f.properties["gemeindeteil_name"];
        const strasse_name = f.properties["strasse_name"];
        const idx = gemeinde_name.indexOf(",");
        // console.info(gemeinde_name + " " + idx);
        let name = idx > 0 ? gemeinde_name.substring(0, idx) : gemeinde_name;

        if (gemeindeteil_name && name !== gemeindeteil_name) {
            name += ", " + gemeindeteil_name;
        }
        name += ", " + strasse_name;
        return name;
    }

    _deocodeFeatureNameAdresse(f) {
        const gemeinde_name = f.properties["gemeinde_name"];
        const gemeindeteil_name = f.properties["gemeindeteil_name"];
        const strasse_name = f.properties["strasse_name"];
        const idx = gemeinde_name.indexOf(",");
        let name = idx > 0 ? gemeinde_name.substring(0, idx) : gemeinde_name;

        if (gemeindeteil_name && name !== gemeindeteil_name) {
            name += ", " + gemeindeteil_name;
        }
        name += ", " + strasse_name;

        const hausnummer = f.properties["hausnummer"];
        const hausnummer_zusatz = f.properties["hausnummer_zusatz"];
        if (hausnummer) {
            name += " " + hausnummer;
        }
        if (hausnummer_zusatz) {
            name += hausnummer_zusatz;
        }

        return name;
    }

    _deocodeFeatureName(f) {
        let name: string;
        for (let j = 0; !name && j < this.options.nameProperties.length; j++) {
            name = f.properties[this.options.nameProperties[j]];
        }
        if (f.properties.objektgruppe === "Gemeindeteil" || f.properties.objektgruppe === "Gemeinde") {
            const idx = f.properties["_title_"].indexOf(",");
            name = idx > 0 ? f.properties["_title_"].substring(0, idx) : f.properties["_title_"];
        }
        return name;
    }
}
