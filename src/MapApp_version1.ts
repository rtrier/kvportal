require("./css/main.scss");
import { initMap } from "./ts/MapApp";
declare var LAYERDEFURL;
function switchSidebar() {
    document.getElementById("main").classList.toggle("sidebar-collapsed");
}
function init() {
    document.getElementById("sidebar-switch").addEventListener("click", switchSidebar);
    let url: string;
    if (typeof LAYERDEFURL !== "undefined") {
        url = LAYERDEFURL;
    }
    initMap(url);
}
if (document.readyState === "interactive" || document.readyState === "complete") {
    init();
} else {
    document.addEventListener("DOMContentLoaded", init);
}
