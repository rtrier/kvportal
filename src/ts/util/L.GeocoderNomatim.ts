import * as L from "leaflet";
import * as Util from "../Util";

export interface GeocodingResult {
    /**
     * Name of found location
     */
    name: string;
    /**
     * The bounds of the location
     */
    bbox: L.LatLngBounds;
    /**
     * The center coordinate of the location
     */
    center: L.LatLng;
    /**
     * URL for icon representing result; optional
     */
    icon?: string;
    /**
     * HTML formatted representation of the name
     */
    html?: string;
    /**
     * Additional properties returned by the geocoder
     */
    properties?: any;
}

export interface NominatimResult {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    boundingbox: string[];
    lat: string;
    lon: string;
    display_name: string;
    class: string;
    type: string;
    importance: number;
    icon?: string;
    address: NominatimAddress;
}
export interface GeocoderOptions {
    /**
     * URL of the service
     */
    serviceUrl: string;
    /**
     * Additional URL parameters (strings) that will be added to geocoding requests
     */
    geocodingQueryParams?: Record<string, unknown>;
    /**
     * Additional URL parameters (strings) that will be added to reverse geocoding requests
     */
    reverseQueryParams?: Record<string, unknown>;
    /**
     * API key to use this service
     */
    apiKey?: string;
}

export interface NominatimAddress {
    building?: string;
    city_district?: string;
    city?: string;
    country_code?: string;
    country?: string;
    county?: string;
    hamlet?: string;
    house_number?: string;
    neighbourhood?: string;
    postcode?: string;
    road?: string;
    state_district?: string;
    state?: string;
    suburb?: string;
    village?: string;
}

export interface NominatimOptions extends GeocoderOptions {
    /**
     * Additional URL parameters (strings) that will be added to geocoding requests; can be used to restrict results to a specific country for example, by providing the [`countrycodes`](https://wiki.openstreetmap.org/wiki/Nominatim#Parameters) parameter to Nominatim
     */
    geocodingQueryParams?: Record<string, unknown>;

    viewbox?: L.LatLngBoundsExpression;
    /**
     * A function that takes an GeocodingResult as argument and returns an HTML formatted string that represents the result. Default function breaks up address in parts from most to least specific, in attempt to increase readability compared to Nominatim's naming
     */
    // htmlTemplate: (r: NominatimResult) => string;
}

/**
 * Implementation of the [Nominatim](https://wiki.openstreetmap.org/wiki/Nominatim) geocoder.
 *
 * This is the default geocoding service used by the control, unless otherwise specified in the options.
 *
 * Unless using your own Nominatim installation, please refer to the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).
 */
export class Nominatim {
    types = {
        house: "Hausnummer",
        street: "Straße",
        district: "Distrikt",
        city: "Ortschaft",
        county: "Kreis",
        state: "Bundesland",
        country: "Land",
        locality: "Location",
    };

    options: NominatimOptions = {
        serviceUrl: "https://nominatim.openstreetmap.org/",
        // htmlTemplate: function (r: NominatimResult) {
        //     const address = r.address;
        //     let className: string;
        //     const parts = [];
        //     if (address.road || address.building) {
        //         parts.push("{building} {road} {house_number}");
        //     }

        //     if (address.city || (address as any).town || address.village || address.hamlet) {
        //         className = parts.length > 0 ? "leaflet-control-geocoder-address-detail" : "";
        //         parts.push('<span class="' + className + '">{postcode} {city} {town} {village} {hamlet}</span>');
        //     }

        //     if (address.state || address.country) {
        //         className = parts.length > 0 ? "leaflet-control-geocoder-address-context" : "";
        //         parts.push('<span class="' + className + '">{state} {country}</span>');
        //     }

        //     return template(parts.join("<br/>"), address);
        // },
    };
    _activeRequest: XMLHttpRequest;
    viewbox: string;

    constructor(options?: Partial<NominatimOptions>) {
        if (options) {
            this.options = { ...this.options, ...options };
            // if (options.viewbox) {
            //     console.info(options.viewbox);
            //     const v = options.viewbox;
            //     this.viewbox = v[0][1] + "," + v[0][0] + "," + v[1][1] + "," + v[1][0];
            // }
        }
    }

    geocode(query: string): Promise<any> {
        if (this._activeRequest) {
            console.info("cancel last");
            this._activeRequest.abort();
        }
        const params = {
            q: query,
            limit: 5,
            format: "geocodejson",
            addressdetails: 1,
            polygon_geojson: 1,
            countrycodes: "de",
            "accept-language": "de",
            // viewbox: this.viewbox,
            bounded: 1,
            ...this.options.geocodingQueryParams,
        };

        const url = this.options.serviceUrl + Util.getParamString(params);
        const xhr = (this._activeRequest = new XMLHttpRequest());
        const promise = new Promise((resolve, reject) => {
            xhr.onloadend = () => {
                if (xhr.status === 200) {
                    const json = JSON.parse(xhr.responseText);
                    const result = this._decodeFeatures(json);
                    console.error(json);
                    console.error(result);
                    resolve(result);
                } else {
                    reject({
                        status: xhr.status,
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
            console.info(`run request "${url}"`);
            xhr.send();
        });
        promise["cancel"] = () => {
            xhr.abort();
            console.info("xhr.canceled");
        };
        return promise;
    }

    _decodeFeatures(data: any): any[] {
        const results = [];
        if (data && data.features) {
            for (let i = 0; i < data.features.length; i++) {
                const f = data.features[i];
                const type = this.types[f.properties.geocoding.type] ?? f.properties.geocoding.type;
                results.push({
                    name: f.properties.geocoding.label,
                    group: type,
                    feature: f,
                    // properties: f.properties,
                    // rtr center: new L.LatLng(f.geometry.coordinates[1], f.geometry.coordinates[0])
                });
            }
        }

        // for (let i = data.features.length - 1; i >= 0; i--) {
        // const bbox = data[i].boundingbox;
        // for (let j = 0; j < 4; j++) bbox[j] = +bbox[j];
        // results[i] = {
        //     icon: data[i].icon,
        //     name: data[i].display_name,
        //     bbox: L.latLngBounds([bbox[0], bbox[2]], [bbox[1], bbox[3]]),
        //     center: L.latLng(data[i].lat, data[i].lon),
        //     properties: data[i],
        // };
        // }
        return results;
    }

    // reverse(location: L.LatLngLiteral, scale: number, cb: GeocodingCallback, context?: any) {
    //     const params = reverseParams(this.options, {
    //         lat: location.lat,
    //         lon: location.lng,
    //         zoom: Math.round(Math.log(scale / 256) / Math.log(2)),
    //         addressdetails: 1,
    //         format: "json",
    //     });
    //     getJSON(this.options.serviceUrl + "reverse", params, (data) => {
    //         const result: GeocodingResult[] = [];
    //         if (data && data.lat && data.lon) {
    //             const center = L.latLng(data.lat, data.lon);
    //             const bbox = L.latLngBounds(center, center);
    //             result.push({
    //                 name: data.display_name,
    //                 html: this.options.htmlTemplate ? this.options.htmlTemplate(data) : undefined,
    //                 center: center,
    //                 bbox: bbox,
    //                 properties: data,
    //             });
    //         }
    //         cb.call(context, result);
    //     });
    // }
}

// /**
//  * [Class factory method](https://leafletjs.com/reference.html#class-class-factories) for {@link Nominatim}
//  * @param options the options
//  */
// export function nominatim(options?: Partial<NominatimOptions>) {
//     return new Nominatim(options);
// }
