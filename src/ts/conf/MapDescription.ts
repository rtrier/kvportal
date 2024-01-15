import { IconOptions, CRS, MapOptions } from "leaflet";
import { LayerWrapper } from "../controls/MapControl";
import { loadJson } from "../Util";

let mapDescr: MapDescription;

export async function getConf(url: string): Promise<MapDescription> {
    if (!mapDescr) {
        const json = await loadJson(url);

        mapDescr = {
            default_wms_legend_icon: json.default_wms_legend_icon,
            mapOptions: json.mapOptions,
            baseLayers: json.baseLayers,
            searchfieldplaceholder: json.searchfieldplaceholder,
            geocoder: json.geocoder,
            themes: [],
        };
        const mapThemes: { [id: string]: Theme } = {};
        const parse = function (themes: Theme[]) {
            for (let i = 0; i < themes.length; i++) {
                const theme = themes[i];
                theme.layers = [];
                if (theme.themes) {
                    parse(theme.themes);
                }
                mapThemes[theme.thema] = theme;
                const themesArr = theme.thema.split("|");
                theme.thema = themesArr[themesArr.length - 1];
            }
        };
        parse(json.themes);
        mapDescr.themes = json.themes;

        for (let i = 0, count = json.overlays.length; i < count; i++) {
            const overlay: LayerDescription = json.overlays[i];

            let theme = mapThemes[overlay.thema];

            if (theme) {
                if (overlay.type === "WMS") {
                    overlay.options["crs"] = CRS[<string>overlay.options["crs"]];
                }
                theme.layers.push(new LayerWrapper(overlay));
                overlay.theme = theme;
            } else {
                console.error("Thema not defined", overlay);
            }
        }
    }
    return mapDescr;
}

/*
export async function getConfOld(url: string): Promise<MapDescription> {

	if (!mapDescr) {
		const json = await Util.loadJson(url);
		mapDescr = {
			default_wms_legend_icon: json.default_wms_legend_icon,
			mapOptions: json.mapOptions,
			baseLayers: json.baseLayers,
			themes: []
		};

		const themes: { [id: string]: Theme } = {};
		for (let i = 0, count = json.overlays.length; i < count; i++) {
			const overlay: LayerDescription = json.overlays[i];
			
			let theme = themes[overlay.thema];

			if (!theme) {
				const themesArr = overlay.thema.split('|');
				let themesId:string;
				let currentTheme:Theme;
				for (let i=0; i<themesArr.length; i++) {
					themesId = themesId ? (themesId+'|'+themesArr[i]) : themesArr[i];					
					theme = themes[themesId];
					if (!theme) {
						theme = themes[themesId] = { thema: themesArr[i], layers: [] };
						if (currentTheme) {
							if (!currentTheme.themes) {
								currentTheme.themes = [];
							}
							currentTheme.themes.push(theme);
						} else {
							mapDescr.themes.push(theme);
						}
					}
					currentTheme = theme;
				}
			}
			if (overlay.type === "WMS") {
				overlay.options["crs"] = CRS[<string>overlay.options["crs"]];
			}
			theme.layers.push(new LayerWrapper(overlay));
		}

		for (let i=0, count = json.themes.length; i<count; i++) {
			const t = json.themes[i];
			const thema = themes[t["thema"]];
			if (thema) {
				thema['icon'] = t["icon"];
			}
		}
	}
	return mapDescr;
}*/

export function getMapDescription(): MapDescription {
    if (!mapDescr) {
        throw new Error("Mapdescription not initializied");
    }
    return mapDescr;
}

export type MapDescription = {
    default_wms_legend_icon: string;
    mapOptions: MapOptions;
    geocoder?: {
        type: string;
        params: Record<string, unknown>;
    };
    searchfieldplaceholder?: string;
    baseLayers: LayerDescription[];
    themes: Theme[];
};

export type Theme = {
    thema: string;
    layers: LayerWrapper[];
    icon?: string;
    themes?: Theme[];
};

export interface LayerOptions {
    pane?: string;
    attribution?: string;
}
export interface LayerOptionsWMS extends LayerOptions {
    /** transparent if WMS */
    transparent?: boolean;
    /** in leaflet defined CRS see: https://leafletjs.com/reference-1.7.1.html#crs  */
    crs: string | CRS;
    /** Comma-separated list of WMS layers to show. */
    layers: string;
}
export type LayerClass = {
    def: string;
    name: string;
    style?: any;
    icon?: any;
};

export type ProcessingInstruction = {
    chart_type: "pie";
    style: {
        radius?: number | string;
        color?: string;
        strokeOpacity?: number;
        strokeWeight?: number;
    };
};

export type LayerDescription = {
    id: number | string;
    thema?: string;
    theme?: Theme;
    label?: string;
    infoAttribute?: string;
    img?: string;
    backgroundColor?: string;
    url?: string;
    whereClausel?: string;
    params?: any;
    contactOrganisation?: string;
    abstract?: string;
    contactPersonName?: string;
    contactEMail?: string;
    contactPhon?: string;
    actuality?: string;
    actualityCircle?: string;
    type?: "GeoJSON" | "WMS";
    url_legend?: string;
    geomType?: "Point" | "Linestring" | "Polygon" | "Chart";
    options?: LayerOptions | LayerOptionsWMS;
    style?: any;
    classes?: LayerClass[];
    minScale?: number;
    maxScale?: number;
    processing?: ProcessingInstruction;
    /**
     * @option iconUrl: String = null
     * **(required)** The URL to the icon image (absolute or relative to your script path).
     *
     * @option iconRetinaUrl: String = null
     * The URL to a retina sized version of the icon image (absolute or relative to your
     * script path). Used for Retina screen devices.
     *
     * @option iconSize: Point = null
     * Size of the icon image in pixels.
     *
     * @option iconAnchor: Point = null
     * The coordinates of the "tip" of the icon (relative to its top left corner). The icon
     * will be aligned so that this point is at the marker's geographical location. Centered
     * by default if size is specified, also can be set in CSS with negative margins.
     *
     * @option popupAnchor: Point = [0, 0]
     * The coordinates of the point from which popups will "open", relative to the icon anchor.
     *
     * @option tooltipAnchor: Point = [0, 0]
     * The coordinates of the point from which tooltips will "open", relative to the icon anchor.
     *
     * @option shadowUrl: String = null
     * The URL to the icon shadow image. If not specified, no shadow image will be created.
     *
     * @option shadowRetinaUrl: String = null
     *
     * @option shadowSize: Point = null
     * Size of the shadow image in pixels.
     *
     * @option shadowAnchor: Point = null
     * The coordinates of the "tip" of the shadow (relative to its top left corner) (the same
     * as iconAnchor if not specified).
     *
     * @option className: String = ''
     * A custom class name to assign to both icon and shadow images. Empty by default.
     */
    icon?: IconOptions;

    popup?: string;

    /**
     *
     */
    layerAttributes?: any;
    /**
     * displaying empty fields in the data view
     */
    hideEmptyLayerAttributes?: boolean;
};

export class PathOptions {
    /**
     * Set it to `false` to disable borders on polygons or circles.
     */
    stroke = true;

    /**
     * Stroke color
     */
    color: string = "#3388ff";

    /**
     * Stroke width in pixels
     */
    weight = 3;

    /**
     * Stroke opacity
     */
    opacity = 1;

    /**
     * A string that defines [shape to be used at the end](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-linecap) of the stroke.
     */
    lineCap: string = "round";

    /**
     * A string that defines [shape to be used at the corners](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-linejoin) of the stroke.
     */
    lineJoin: "round";

    /**
     * A string that defines the stroke [dash pattern](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dasharray). Doesn't work on `Canvas`-powered layers in [some old browsers](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash#Browser_compatibility).
     */
    dashArray: string = null;

    /**
     * A string that defines the [distance into the dash pattern to start the dash](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dashoffset). Doesn't work on `Canvas`-powered layers in [some old browsers](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash#Browser_compatibility).
     */
    dashOffset: string = null;

    /**
     * Whether to fill the path with color. Set it to `false` to disable filling on polygons or circles.
     */
    fill: boolean = false;

    /**
     * Fill color. Defaults to the value of the [`color`](#path-color) option
     */
    fillColor: string = null;

    /**
     * Fill opacity. Standard = 0.2
     */
    fillOpacity: number = 0.2;

    /**
     * A string that defines [how the inside of a shape](https://developer.mozilla.org/docs/Web/SVG/Attribute/fill-rule) is determined.
     */
    fillRule = "evenodd";

    /**
     * When `true`, a mouse event on this path will trigger the same event on the map
     * (unless [`L.DomEvent.stopPropagation`](#domevent-stoppropagation) is used).
     */
    bubblingMouseEvents = true;
}

class CircleMarkerOptions extends PathOptions {
    fill = true;

    /**
     * Radius of the circle marker, in pixels
     */
    radius: 10;
}

export const StandardPathOptions = new PathOptions();
export const StandardCircleMarkerOptions = new CircleMarkerOptions();
