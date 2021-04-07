import *  as Util from "../Util";
import {IconOptions, CRS} from "leaflet";
import { LayerWrapper } from "../controls/MapControl";

let mapDescr: MapDescription;

export async function getConf(url: string):Promise<MapDescription> {

	if (!mapDescr) {
        const json = await Util.loadJson(url);
        mapDescr = {
			default_wms_legend_icon: json.default_wms_legend_icon,
			baseLayers: json.baseLayers,
			themes:[]
		};
		
        const themes:{ [id: string] : Theme } = {};
        for (let i=0, count=json.overlays.length; i<count; i++) {
            const overlay:LayerDescription = json.overlays[i];
            let theme = themes[overlay.thema];
            if (!theme) {
                theme = themes[overlay.thema] = {thema:overlay.thema, layers:[]};
                mapDescr.themes.push(theme);
            }
            if (overlay.type === "WMS") {
                overlay.options.crs = CRS[<string>overlay.options.crs];
            }
            theme.layers.push(new LayerWrapper(overlay));
        }
	}
	return mapDescr;
}

export function getMapDescription():MapDescription {
	if (!mapDescr) {
		throw new Error("Mapdescription not initializied");
	}
	return mapDescr;
}

export type MapDescription = {
	default_wms_legend_icon: string,
	baseLayers: LayerDescription[],
	themes: Theme[]
}

export type Theme = {
	thema: string,
	layers: LayerWrapper[]
}

export type LayerOptions = {
	pane: string;
	attribution: string;
	/** transparent if WMS */
	transparent: boolean;
	/** CRS if WMS */
	crs:string|L.CRS;
	layers?:string;
}
export type LayerClass = {
	def: string;
	name: string;
    style: any;
}
export type LayerDescription = {
	id: number|string,
	thema?: string,
    label?: string,
    infoAttribute?: string,
	img?: string,
	backgroundColor?: string,
	url?: string,
	whereClausel?: string,
	params?: any,
	contactOrganisation?: string,
	abstract?: string,
	contactPersonName?: string,
	contactEMail?: string,
	contactPhon?: string,
	actuality?: string,
	actualityCircle?: string,
	type?: string,
	url_legend?: string,
	geomType?: string,
	options?: LayerOptions,
    style?: any,    
	classes?: LayerClass[],
    icon?:IconOptions,
	popup?:string,
	layerAttributes?:any
	hideEmptyLayerAttributes?:boolean
}