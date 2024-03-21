import { MarkerClusterGroup, Map as LMap, Marker } from "leaflet";
import { CategoryMarker } from "./controls/CategorieLayer";

export class EditLayer extends MarkerClusterGroup {
    url: string;
    data: any = null;
    markers: Marker[];

    constructor(url: string) {
        super();
        this.url = url;
        this.loadData();
        console.info("EditLayer");
    }

    async loadData() {
        const response = await fetch(this.url);
        const json = await response.json();
        this.data = json;
        if (this._map) {
            this.drawFeatures();
        }
    }
    private _loadData() {
        window.fetch(this.url).then((response) => {
            response.json().then((data) => {
                this.data = data.data;
                for (let i = 0; i < data.length; i++) {
                    const marker = new Marker({ lat: data[i].lat, lng: data[i].lng });
                    this.markers.push(marker);
                }
                if (this._map) {
                    this.drawFeatures();
                }
            });
        });
    }

    onAdd(map: LMap): this {
        console.info("this._map", this._map);
        if (this.data) {
            this.drawFeatures();
        }
        return this;
    }

    drawFeatures(): void {
        for (let i = 0; i < this.markers.length; i++) {
            console.info("row:", this.markers[i]);
            this._map.addLayer(this.markers[i]);
        }
    }
}
