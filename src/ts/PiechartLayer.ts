import { Marker, Icon, DivIcon, IconOptions, featureGroup, FeatureGroup, LeafletEvent, Map, LayerOptions, Layer, BaseIconOptions, CRS, LatLng, Point } from "leaflet";
import { LayerDescription } from "./conf/MapDescription";
import { CategorieLayer, CategoryMapObject, InteractiveLayer, PopupCreator } from "./controls/CategorieLayer";
import { MapDispatcher } from "./controls/MapControl";
import { MarkerView } from "./controls/MarkerListView";
import { View } from "./controls/ViewControl";
import { createPiechart, PieChartParam } from "./svg/piechart";
import { SvgStyle } from "./svg/svg";

function z(map: Map) {
    const zoom = map.getZoom();
    // var l2 = L.GeometryUtil.destination(map.getCenter(),90,distance);

    const heading = 90;
    const distance = 1000;
    const latlng = map.getCenter();

    let rad = Math.PI / 180,
        radInv = 180 / Math.PI,
        R = (<any>CRS.Earth).R, // approximation of Earth's radius
        lon1 = latlng.lng * rad,
        lat1 = latlng.lat * rad,
        rheading = heading * rad,
        sinLat1 = Math.sin(lat1),
        cosLat1 = Math.cos(lat1),
        cosDistR = Math.cos(distance / R),
        sinDistR = Math.sin(distance / R),
        lat2 = Math.asin(sinLat1 * cosDistR + cosLat1 * sinDistR * Math.cos(rheading)),
        lon2 = lon1 + Math.atan2(Math.sin(rheading) * sinDistR * cosLat1, cosDistR - sinLat1 * Math.sin(lat2));
    lon2 = lon2 * radInv;
    lon2 = lon2 > 180 ? lon2 - 360 : lon2 < -180 ? lon2 + 360 : lon2;

    const l2 = new LatLng(lat2 * radInv, lon2);
    var p1 = map.project(map.getCenter(), zoom);
    var p2 = map.project(l2, zoom);
    return p1.distanceTo(p2);
}

export interface PiechartMarkerOptions extends BaseIconOptions {
    radius: number;
    fillOpacity?: number;
    color?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    // piechart: { attN: string; color: string }[];
    piechart: { [id: string]: SvgStyle };
}

export class PiechartIcon extends Icon<PiechartMarkerOptions> {
    piechart: SVGSVGElement;

    constructor(private data: any, options: PiechartMarkerOptions) {
        super(options);
        // console.info("PiechartIcon", options, data);
        // this.data = data;
    }

    createIcon() {
        if (!this.piechart) {
            const param: PieChartParam = <any>{ ...this.options };
            param.segments = [];
            // for (let k in this.options) {}
            //     radius: this.options.radius, //set radius of pie
            //     fillOpacity: this.options.fillOpacity,
            //     segments: [],
            // };
            // console.info("PiechartIcon.createIcon param", param);
            // console.info("PiechartIcon.createIcon options", this.options);
            // for (let i = 0, count = this.options.piechart.length; i < count; i++) {
            for (let k in this.options.piechart) {
                console.debug(k, this.data[k], this.options.piechart[k]);
            }

            for (let k in this.options.piechart) {
                // const p = this.options.piechart[i];
                // param.segments.push({ value: this.data[p.attN], color: p.color });
                param.segments.push({ value: parseFloat(this.data[k]), style: this.options.piechart[k] });
            }
            this.piechart = createPiechart(param);
            if (this.options.className) {
                this.piechart.classList.add(this.options.className);
            }
        }
        return <any>this.piechart;
    }
}

export class PiechartMarker<T extends L.LatLngExpression> extends Marker {
    visible: boolean = false;

    parentLayer: CategorieLayer<T, any> | InteractiveLayer;
    data: T;
    private _clickClosure: (ev: any) => void;
    selected = false;
    private _icon: HTMLImageElement;
    // icon:L.Icon;

    constructor(parentLayer: PiechartLayer, coord: L.LatLngExpression, data: any, options?: PiechartMarkerOptions) {
        super(coord, options);
        // console.info("PiechartMarker", options, data, parentLayer.getPiechartMarkerOptions());
        const option2 = parentLayer.getPiechartMarkerOptions();
        option2.iconAnchor = new Point(-200, -200);
        option2.iconSize = new Point(60, 60);
        // this.options.icon = new PiechartIcon(data, parentLayer.getPiechartMarkerOptions());
        this.options.icon = new PiechartIcon(data, option2);
        this.data = data;
        this.parentLayer = parentLayer;
        // this.options = options;
    }

    onAdd(map: Map): this {
        super.onAdd(map);
        const w = 10 + Math.pow(map.getZoom() - 8, 2) * 4;
        const icon = <PiechartIcon>this.options.icon;
        icon.piechart.setAttribute("width", w.toString());
        icon.piechart.setAttribute("height", w.toString());
        icon.piechart.style.marginTop = (-w / 2).toString() + "px";
        icon.piechart.style.marginLeft = (-w / 2).toString() + "px";
        return this;
    }

    setVisible(visible: boolean) {
        this.visible = visible;
    }

    isVisible(): boolean {
        return this.visible;
    }

    highlight(highlight: boolean) {
        console.info("CategoryMarker.highlight", this.data["id"], highlight);
        this.selected = highlight;
        if (this._icon) {
            if (highlight) {
                this._icon.classList.add("icon-highlighted");
                for (let i = 0; i < this._icon.children.length; i++) {
                    (<HTMLElement>this._icon.children[i]).style.opacity = "1";
                }
            } else {
                this._icon.classList.remove("icon-highlighted");
                for (let i = 0; i < this._icon.children.length; i++) {
                    (<HTMLElement>this._icon.children[i]).style.opacity = "";
                }
            }
        }
        console.info("this", this);
    }

    getPiechart() {
        return (<PiechartIcon>this.options.icon).piechart.cloneNode(true);
    }

    // getIcon(): DivIcon | Icon<IconOptions> {
    //     return new PiechartIcon(this.data, this.options as PiechartMarkerOptions);
    // }
}
export interface PiechartLayerLayerOptions extends LayerOptions {
    layerDescription: LayerDescription;
}
export class PiechartLayer extends FeatureGroup implements InteractiveLayer {
    layerDescription: LayerDescription;
    piechartMarkerOptions: PiechartMarkerOptions;

    constructor(layers?: Layer[], options?: PiechartLayerLayerOptions) {
        super(layers, options);
        this.layerDescription = options.layerDescription;
        // console.error("PiechartLayer", options);
    }

    highlightMarker(marker: CategoryMapObject<any>, highlight: boolean) {
        marker.highlight(highlight);
    }

    mapItemClicked(marker: CategoryMapObject<any>, ev: L.LeafletMouseEvent): void {
        // MapDispatcher.onMapFeatureClick.dispatch(marker, {...ev, layer:this, feature:marker});
        MapDispatcher.onMapFeatureClick.dispatch(marker, ev);
    }

    renderData(marker: CategoryMapObject<any>): View {
        return new MarkerView(this, marker);
    }

    onAdd(map: Map): this {
        // console.error("PiechartLayer, onAdd");

        const f = (ev: LeafletEvent) => {
            // const w = 10 + (map.getZoom() - 8) * 10;
            const w = 10 + Math.pow(map.getZoom() - 8, 2) * 4;
            // console.info("zoomend", ev, map.getMinZoom(), map.getMaxZoom(), map.getZoom(), z(map), w);
            // const iconAnchor = new Point(-w, -w);

            this.getLayers().forEach((l: any) => {
                l.options.icon.piechart.setAttribute("width", w.toString());
                l.options.icon.piechart.setAttribute("height", w.toString());
                l.options.icon.piechart.style.marginTop = (-w / 2).toString() + "px";
                l.options.icon.piechart.style.marginLeft = (-w / 2).toString() + "px";
            });
        };

        map.addEventListener("zoomend", f);
        return super.onAdd(map);
    }

    getPiechartMarkerOptions(): PiechartMarkerOptions {
        if (!this.piechartMarkerOptions) {
            let radius = this.layerDescription?.processing?.style?.radius;
            if (typeof radius === "string") {
                radius = parseFloat(radius);
            }
            const options = (this.piechartMarkerOptions = {
                radius: radius ?? 15,
                color: this.layerDescription.processing.style.color ?? "darkgray",
                strokeOpacity: this.layerDescription.processing.style.strokeOpacity ?? 1,
                strokeWeight: this.layerDescription.processing.style.strokeWeight ?? 1,
                className: "svground",
                piechart: {},
            });
            const lDescrClasses = this.layerDescription.classes;
            for (let i = 0, count = lDescrClasses.length; i < count; i++) {
                const clasz = lDescrClasses[i];
                options.piechart[clasz.style.size] = {
                    fill: clasz.style.fillColor,
                    opacity: clasz.style.fillOpacity,
                    stroke: clasz.style.color ?? "#bbb",
                    strokeOpacity: clasz.style.strokeOpacity ?? "0.6",
                    strokeWidth: clasz.style.strokeWeight ?? "1",
                };
            }
        }
        // console.info(this.piechartMarkerOptions);
        return this.piechartMarkerOptions;
    }
}
