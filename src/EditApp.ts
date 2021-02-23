require('./css/main.scss');

import { LayerConfigurationEditor } from './ts/LayerConfigurationEditor';

document.addEventListener("DOMContentLoaded", start);


function start() {
    console.info("TEST");

    const content = document.getElementById("content");
    // const lce = new LayerConfigurationEditor("http://localhost:8989/", content);
    const lce = new LayerConfigurationEditor("layerdef.json", content);

}