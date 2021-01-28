import *  as Util from "../Util";
import {IconOptions, CRS} from "leaflet";

let mapDescr: MapDescription;

export async function getConf(url: string) {
	if (!mapDescr) {
        const json = await Util.loadJson(url);
        mapDescr = {baseLayers:json.baseLayers, themes:[]};
        const themes:{ [id: string] : Theme } = {};
        for (let i=0, count=json.overlays.length; i<count; i++) {
            const overlay:LayerDescription = json.overlays[i];
            let theme = themes[overlay.thema];
            if (!theme) {
                theme = {thema:overlay.thema, layers:[]};
                mapDescr.themes.push(theme);
            }
            if (overlay.type === "WMS") {
                overlay.options.crs = CRS[overlay.options.crs];
            }
            theme.layers.push(overlay);
        }
	}
	return mapDescr;
}

export type MapDescription = {
	baseLayers: LayerDescription[],
	themes: Theme[]
}

export type Theme = {
	thema: string,
	layers: LayerDescription[]
}

export type LayerDescription = {
	id: number,
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
	geomType?: string,
	options?: any,
    style?: any,    
    icon?:IconOptions
}