require('./css/main.scss');
import { initMap } from './ts/MapApp';
function switchSidebar() {
    document.getElementById("main").classList.toggle("sidebar-collapsed");
}
document.addEventListener("DOMContentLoaded", ()=>{
    document.getElementById("sidebar-switch").addEventListener('click', switchSidebar);
    initMap();
})

