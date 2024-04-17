import { Control, Map, Util, DomEvent, DomUtil, LayerEvent } from "leaflet";
// import * as Util from '../core/Util';
// import * as DomEvent from '../dom/DomEvent';
// import * as DomUtil from '../dom/DomUtil';

/*
 * @class Control.Attribution
 * @aka L.Control.Attribution
 * @inherits Control
 *
 * The attribution control allows you to display attribution data in a small text box on a map. It is put on the map by default unless you set its [`attributionControl` option](#map-attributioncontrol) to `false`, and it fetches attribution texts from layers with the [`getAttribution` method](#layer-getattribution) automatically. Extends Control.
 */

export const AttributionCtrl = Control.extend({
    // @section
    // @aka Control.Attribution options
    options: {
        position: "bottomright",
        // @option prefix: String = 'Leaflet'
        // The HTML text shown before the attributions. Pass `false` to disable.
        prefix: '<a href="https://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>',
    },

    initialize: function (options) {
        Util.setOptions(this, options);
        this._open = false;
        this._attributions = {};
    },

    onAdd: function (map) {
        console.info("AttributionCtrl.add");
        map.attributionControl = this;
        this._container = DomUtil.create("div", "control-attribution");
        this._DivAttribution = DomUtil.create("div", "div-attribution", this._container);
        const bttn = (this._Bttn = DomUtil.create("button", "ctrl-icon", this._container));
        bttn.innerHTML = "&copy;";
        this.clickFct = (evt: MouseEvent) => {
            bttn.parentElement.append(this._DivAttribution);
            const isOpened = bttn.parentElement.classList.toggle("open");
            // bttn.innerHTML = isOpened? "»" : "&copy;"
            bttn.innerHTML = isOpened ? "<span>&#xbb;</span>" : "<span>&copy;</span>";
        };
        bttn.addEventListener("click", this.clickFct);
        DomEvent.disableClickPropagation(this._container);

        // TODO ugly, refactor
        for (let i in map._layers) {
            if (map._layers[i].getAttribution) {
                this.addAttribution(map._layers[i].getAttribution());
            }
        }

        this._update();
        // console.error("onAdd", this);
        map.on("layeradd", this._addAttribution, this);
        map.on("layerremove", this._removeAttribution, this);
        return this._container;
    },

    // @method setPrefix(prefix: String): this
    // Sets the text before the attributions.
    setPrefix: function (prefix) {
        this.options.prefix = prefix;
        this._update();
        return this;
    },

    // @method addAttribution(text: String): this
    // Adds an attribution text (e.g. `'Vector data &copy; Mapbox'`).
    _addAttribution: function (ev: LayerEvent) {
        if (ev.layer.getAttribution()) {
            const text = ev.layer.getAttribution();

            // console.error(`addAttribution ${text}`);
            if (!text) {
                return this;
            }

            if (!this._attributions[text]) {
                this._attributions[text] = 0;
            }
            this._attributions[text]++;

            this._update();
        }
        return this;
    },

    // @method removeAttribution(text: String): this
    // Removes an attribution text.
    _removeAttribution: function (ev: LayerEvent) {
        if (ev.layer.getAttribution()) {
            const text = ev.layer.getAttribution();
            // console.error(`removeAttribution ${text}`);
            if (!text) {
                return this;
            }

            if (this._attributions[text]) {
                this._attributions[text]--;
                this._update();
            }
        }
        return this;
    },

    _update: function () {
        if (!this._map) {
            return;
        }

        const attribs = [];

        for (let i in this._attributions) {
            if (this._attributions[i]) {
                attribs.push(i);
            }
        }
        console.info("xattribs.join(", ")", attribs.join(", "));

        const prefixAndAttribs = [];

        if (this.options.prefix) {
            prefixAndAttribs.push(this.options.prefix);
        }
        if (attribs.length) {
            // prefixAndAttribs.push(attribs.join(", "));
            prefixAndAttribs.push(attribs.join("<br>"));
        }

        // this._DivAttribution.innerHTML = prefixAndAttribs.join(' | ');
        // console.info('prefixAndAttribs.join("<br>")', prefixAndAttribs.join("<br>"));
        this._DivAttribution.innerHTML = prefixAndAttribs.join("<br>");
    },
});

// @namespace Map
// @section Control options
// @option attributionControl: Boolean = true
// Whether a [attribution control](#control-attribution) is added to the map by default.
Map.mergeOptions({
    attributionControl: true,
});

// Map.addInitHook(function () {
//     if (this.options.attributionControl) {
//         new AttributionCtrl().addTo(this);
//     }
// });
