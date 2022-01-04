# kvportal

Webapp to display a map of WMS, WFS and GeoJSON layers. The Map is composed by a json file layerdef.json.

* layer tree with legends are created automatically 
* popup content of a feature can be specified through expression
* features of a layer can be classified by mapserver notation
* feature data can be displayed
* names of feature attributes can be adjusted
* empty feature attributes can be hidden

Based on [Leaflet](https://leafletjs.com/)

## map description file: layerdef.json ##

see: [layerdef.json.md](layerdef.json.md)

```javascript
{
  "baseLayers": [
    {
      "label": "OpenStreeMap",
      "url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "options": {
        "attribution": "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
      }
    },
    {
      "label": "webatlas",     
      "url": "https://sgx.geodatenzentrum.de/wmts_webatlasde.light/tile/1.0.0/webatlasde.light/default/DE_EPSG_3857_LIGHT/{z}/{y}/{x}.png",
      "options": {          
        "id": "webatlasde.light",
        "minZoom": 5,
        "maxZoom": 15,		      
        "zoomOffset": -5,
        "attribution": ""
      }
    }
  ],
  "overlays": [
  ]
}
```

### Overlays WFS and GeoJSon ###

Features can be classified by mapserver syntax. The attribute display name can be specified.

Popup can be specified like _**"popup": "${att_name01} AnyText ${att_name02}"**_

For Styling the attributes of leaflet are used (corresponding to geometry type)

```javascript
{
	"thema": "displayname_of_layer_group",
	"label": "displayname_of_layer",			
	"url": "https://your_map_url/",	
	"params": {
		"urlParamName01": urlParamValue01,
		"urlParamName02": urlParamValue02
	},			
	"type": "GeoJSON",
	"geomType": "Polygon",
	"hideEmptyLayerAttributes": true,
	"layerAttributes": {
		"wfs_att01": "Displayname01:",
		"wfs_att02": "Displayname02:"
	},
	"classes": [
		{
			"def": "([wfs_att01] = 1)",
			"name": "name_of_class_01",
			"style": {
				"color": "#000000",
				"weight": 1,
				"fill": true,
				"fillColor": "#ebebeb",
				"fillOpacity": 0.6
			}
		},
		{
			"def": "([wfs_att02] = 2)",
			"name": "name_of_class_01",
			"style": {
				"color": "#000000",
				"weight": 1,
				"fill": true,
				"fillColor": "#afffa9",
				"fillOpacity": 0.6
			}
		}
	],
	"style": {
		"color": "#000000",
		"weight": 1,
		"fill": true,
		"fillColor": "#afffa9",
		"fillOpacity": 0.6
	},
	"popup": "${wfs_att01} AnyText ${wfs_att02}"
}
```

### Overlay WMS ###

```javascript
{
	"thema": "layer_group_name",
	"label": "layername",
	"url": "https://wms_url",
	"params": {},
	"type": "WMS",
	"options": {
		"crs": "EPSG4326",
		"version": "1.1.0",
		"layers": "BRD_1km_winddaten_80m",
		"format": "image/png",
		"transparent": true,
		"attribution": "DWD"
	}
}
```

# SOURCE
Repository rtrier/kvportal on [GitHub](https://github.com/rtrier/kvportal.git)
Repository rtrier/treecomponent on [GitHub](https://github.com/rtrier/treecomponent.git)
# INSTALL
    cd ~
    git clone https://github.com/rtrier/kvportal.git
    git clone https://github.com/rtrier/treecomponent.git
    cd treecomponent
    npm install
    cd ../energie-atlas
    npm install
    npm run build

# DEVELOPMENT
    run live environment
    npm run watch
