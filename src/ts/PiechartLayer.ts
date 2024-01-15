import { Marker, Icon, DivIcon, IconOptions, featureGroup, FeatureGroup, LeafletEvent, Map, LayerOptions, Layer, BaseIconOptions } from "leaflet";
import { LayerDescription } from "./conf/MapDescription";
import { CategorieLayer, CategoryMapObject, InteractiveLayer, PopupCreator } from "./controls/CategorieLayer";
import { MapDispatcher } from "./controls/MapControl";
import { MarkerView } from "./controls/MarkerListView";
import { View } from "./controls/ViewControl";
import { createPiechart, PieChartParam } from "./svg/piechart";
import { SvgStyle } from "./svg/svg";

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
        console.info("PiechartIcon", options, data);
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
            console.info("PiechartIcon.createIcon param", param);
            console.info("PiechartIcon.createIcon options", this.options);
            // for (let i = 0, count = this.options.piechart.length; i < count; i++) {
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
        // console.info("PiechartMarker", options, data);
        this.options.icon = new PiechartIcon(data, parentLayer.getPiechartMarkerOptions());
        this.data = data;
        this.parentLayer = parentLayer;
        // this.options = options;
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
        console.info(this.piechartMarkerOptions);
        return this.piechartMarkerOptions;
    }
}
