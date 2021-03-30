import { getConf, LayerDescription, MapDescription } from './conf/MapDescription';

const atts = [
	["img", "string"],
	["backgroundColor", "string"],
	["url", "string"],
	["params", "object"],
	["contactOrganisation", "string"],
	["abstract", "string"],
	["contactPersonName", "string"],
	["contactEMail", "string"],
	["contactPhon", "string"],
	["actuality", "string"],
	["actualityCircle", "string"],
	["type", "string"],
	["geomType", "string"],
	["options", "object"],
	["style", "object"]
];

function getType(attName:string):string {
	for (let i=0, count=atts.length; i<count; i++) {
		if (atts[i][0]===attName) {
			return atts[i][1];
		}
	}
	return undefined;
}



export class LayerConfigurationEditor {
	dom: HTMLElement;
	layerConfig: MapDescription;
	url: string;

	fThemeClicked: (evt: MouseEvent) => void;
	fLayerClicked: (evt: MouseEvent) => void;
	fKeyPressed: (evt: KeyboardEvent) => void;

	changedItems: HTMLElement[] = [];

	constructor(url: string, dom: HTMLElement) {
		this.dom = dom;
		this.url = url;
		const urlMC = url; 
		// const urlMC = url+"layer/list";
		getConf(urlMC).then(value => {
			this.layerConfig = <MapDescription>value;
			console.info("this.layerConfig", this.layerConfig);
			this.render();
		});
		this.fThemeClicked = (evt: MouseEvent) => {
			this.toogleTheme(evt);
		};
		this.fLayerClicked = (evt: MouseEvent) => {
			this.toogleLayerDescr(evt);
		};
		this.fKeyPressed = (evt: KeyboardEvent) => {
			
			// console.info(evt.type, evt.code);
			if (this.changedItems.indexOf(<HTMLElement>evt.target) < 0) {
				this.changedItems.push(<HTMLElement>evt.target);
			};
			
		};
	};

	render() {
		const d = document.createElement('div');
		document.addEventListener("keydown", (evt) =>{
			if ((window.navigator.platform.match("Mac") ? evt.metaKey : evt.ctrlKey)  && evt.keyCode == 83) {
				console.info("^S pressed", evt.type);
				this.commit();
				evt.preventDefault();
			}	
		});
		
		const themes = this.layerConfig.themes;

		for (let i = 0, count = themes.length; i < count; i++) {
			const thema = themes[i];
			console.info(thema);
			const d1 = appendElement("div", "themen collapse", d);
			const h2 = appendElement("h2", undefined, d1);
			h2.innerHTML = thema.thema;
			h2.addEventListener('click', this.fThemeClicked);
			const layers = thema.layers;
			for (let lId = 0, lCount = layers.length; lId < lCount; lId++) {
				this.appendLayer(layers[lId].layerDescription, d1);
			}
		}


		const bttnDiv = appendElement("div", "bttn_fixed", d);
		const bttnCancel = document.createElement('button');
		bttnCancel.innerHTML = "verwerfen";
		bttnCancel.addEventListener('click', (MouseEvent) => this.reset());
		bttnDiv.appendChild(bttnCancel);
		const bttnSave = document.createElement('button');
		bttnSave.addEventListener('click', (MouseEvent) => this.commit());
		bttnSave.innerHTML = "Speichern";
		bttnDiv.appendChild(bttnSave);
		this.dom.appendChild(d);
	}

	reset(): any {
		this.changedItems.forEach((v) => this.resetTextArea(v));
	}
	resetTextArea(txtArea: HTMLElement): void {
		const layerdescr: LayerDescription = txtArea['layerDescr'];
		const attName: string = txtArea['attName'];
		const value = layerdescr[attName];
		if (getType(attName)  === 'object') {
			txtArea.innerHTML = this.stringify(value);
		}
		else {
			txtArea.innerText = value;
		}
	}

	commit(): void {
		this.changedItems.forEach((txtArea) => {
			const layerdescr: LayerDescription = txtArea['layerDescr'];
			const attName: string = txtArea['attName'];
			const value = (<HTMLTextAreaElement>txtArea).value;
			if (getType(attName)  === 'object') {
				try {
					layerdescr[attName] = JSON.parse(value);
					txtArea.classList.remove("input_error");
				} catch (e) {
					alert("Fehler beim Parsen");
					txtArea.classList.add("input_error");
					if (txtArea["scrollIntoViewIfNeeded"]) {
						console.info('scrollIntoViewIfNeeded');
						(<any>txtArea).scrollIntoViewIfNeeded();
					} else {
						txtArea.scrollIntoView();
					}
				}
			}
			else {				
				layerdescr[attName] = value;
			}
		});
		this._save();
		console.info("comm");
	}

	_save() {
		const xhr = new XMLHttpRequest();
		const url = this.url + 'mapconfiguration/save/';

		xhr.open('POST', url, true);
		xhr.setRequestHeader('Content-type', 'application/json');
		// xhr.setRequestHeader("Authorization", this.user.auth);
		// this.showMessage("Bitte warten. Die Route wird gespeichert.");
		
		var fOk = (o: object) => {
				};
				var fError = (o: any) => {					
				};
				xhr.onreadystatechange = (function () {//Call a function when the state changes.
					if (xhr.readyState == 4) {
						let o = null;
						try {
							o = xhr.responseText
						}
						catch (ex) {
							console.error(ex)
						}
						if (xhr.status == 200) {
							fOk(o);
						}
						else {
							fError(o);
						}
					}
				})
				xhr.send(JSON.stringify(this.layerConfig));
			
	}


	appendLayer(layerDescr: LayerDescription, parent: HTMLElement) {
		const d1 = appendElement("div", "layerdescr collapse", parent);
		const h2 = appendElement("h2", undefined, d1);
		h2.innerHTML = layerDescr.label;
		h2.addEventListener('click', this.fLayerClicked);
		const dAtts = appendElement("div", "layeratts", d1);
		for (let i = 0, count = atts.length; i < count; i++) {
			const lbl = appendElement("label", undefined, dAtts);
			lbl.innerText = atts[i][0];
			lbl['for'] = atts[i] + "_" + layerDescr.id;

			// console.info(atts[i], typeof layerDescr[atts[i]], layerDescr[atts[i]]);

			const txtArea = <HTMLTextAreaElement>appendElement("textarea", undefined, dAtts);
			const attName = atts[i][0]; 
			if (layerDescr[attName]) {
				if (atts[i][1] === 'object') {
					console.info('object:' + atts[i], typeof layerDescr[attName], layerDescr[attName], atts[i][1]);
					txtArea['rows'] = 7;
					// txtArea.innerHTML = this.stringify(layerDescr[attName]);
					txtArea.value = this.stringify(layerDescr[attName]);
				}
				else {
					console.info('normal:' + atts[i], typeof layerDescr[attName], layerDescr[attName], atts[i][1]);
					txtArea.value = layerDescr[attName];
				}
			}
			txtArea['layerDescr'] = layerDescr;
			txtArea['attName'] = attName;
			txtArea.id = atts[i] + "_" + layerDescr.id;
			txtArea.addEventListener("keyup", this.fKeyPressed);
			txtArea.addEventListener("paste", this.fKeyPressed);
		}

	}

	stringify(o: any): string {
		console.info("\t", o);
		let s = JSON.stringify(o);
		
		s = s.replace(/,/g, ',\r\n');
		// s = s.replace(',', String.fromCharCode(13, 10));
		
		console.info("xxx", s);
		return s;
	}

	toogleTheme(evt) {
		document.body.querySelectorAll(".themen h2").forEach((value) => {
			if (value !== evt.target) {
				value.parentElement.classList.add("collapse");
			}
		});
		evt.target.parentElement.classList.toggle("collapse");
	}

	toogleLayerDescr(evt) {
		document.body.querySelectorAll(".layerdescr h2").forEach((value) => {
			if (value !== evt.target) {
				value.parentElement.classList.add("collapse");
			}
		});
		evt.target.parentElement.classList.toggle("collapse");
	}
}



function appendElement(tag: string, className: string, parent: HTMLElement): HTMLElement {
	const d1 = document.createElement(tag);
	if (className) {
		d1.className = className;
	}
	if (parent) {
		parent.appendChild(d1);
	}
	return d1;
}

/*
<div class="themen collapse">
					<h2>Windenergie</h2>
									<div class="kartenthema" style="background-color: #c1d8ff">
						<h3>Windenergieanlagen Onshore</h3>
						<input type="checkbox" class="themeSelector" value="Windenergieanlagen Onshore" onchange="toggleMapButton()">
						<!--i
							class="fa fa-map-o"
							aria-hidden="true"
							style="float: right; cursor: pointer; margin-top: -12px; margin-right: 0px;"
							onclick="window.location.href = 'map.php?layers=Windenergieanlagen Onshore'"
						></i//-->
						<div class="wrapper"></div>
						<div style="cursor: pointer; height: 200px;" onclick="$(this).hide(); $(this).next().show(400);">
							<img src="img/wind_power.svg" alt="Windenergieanlagen Onshore" class="karten-image">
						</div>
						<div class="themen-details" style="cursor: pointer" onclick="$(this).hide(100, 'swing', function() { $(this).prev().show(); });">
							<i class="fa fa-map-o" aria-hidden="true" style="cursor: pointer; margin-bottom: 5px" onclick="window.location.href = 'map.php?layers=Windenergieanlagen Onshore'"></i>
							<a href="map.php?layers=Windenergieanlagen Onshore">Thema in Karte Anzeigen</a><br>
							<b>Quelle:</b> Landesamt für Umwelt, Naturschutz und Geologie M-V (LUNG M-V)<br>
							<b>Beschreibung:</b> Windenergieanlagen in Mecklenburg-Vorpommern<br>
							<b>Ansprechpartner:</b> Herr Neumann<br>
							<b>E-Mail:</b> herr.neumann@lung-mv.de<br>
							<b>Tel:</b> 0381456789<br>
							<b>Aktualität:</b> 20.11.2020<br>
							<b>Aktualisierungszyklus:</b> <br>
						</div>
					</div>					<div class="kartenthema" style="background-color: #c1d8ff">
						<h3>Eignungsgebiete für Windenergieanlagen REP Westmecklenburg</h3>
						<input type="checkbox" class="themeSelector" value="Eignungsgebiete für Windenergieanlagen REP Westmecklenburg" onchange="toggleMapButton()">
						<!--i
							class="fa fa-map-o"
							aria-hidden="true"
							style="float: right; cursor: pointer; margin-top: -12px; margin-right: 0px;"
							onclick="window.location.href = 'map.php?layers=Eignungsgebiete für Windenergieanlagen REP Westmecklenburg'"
						></i//-->
						<div class="wrapper"></div>
						<div style="cursor: pointer; height: 200px;" onclick="$(this).hide(); $(this).next().show(400);">
							<img src="img/wind_power.svg" alt="Eignungsgebiete für Windenergieanlagen REP Westmecklenburg" class="karten-image">
						</div>
						<div class="themen-details" style="cursor: pointer" onclick="$(this).hide(100, 'swing', function() { $(this).prev().show(); });">
							<i class="fa fa-map-o" aria-hidden="true" style="cursor: pointer; margin-bottom: 5px" onclick="window.location.href = 'map.php?layers=Eignungsgebiete für Windenergieanlagen REP Westmecklenburg'"></i>
							<a href="map.php?layers=Eignungsgebiete für Windenergieanlagen REP Westmecklenburg">Thema in Karte Anzeigen</a><br>
							<b>Quelle:</b> Regionaler Planungsverband Westmecklenburg<br>
							<b>Beschreibung:</b> <br>
							<b>Ansprechpartner:</b> <br>
							<b>E-Mail:</b> <br>
							<b>Tel:</b> <br>
							<b>Aktualität:</b> <br>
							<b>Aktualisierungszyklus:</b> <br>
						</div>
					</div>					<div class="kartenthema" style="background-color: #c1d8ff">
						<h3>Eignungsgebiete für Windenergieanlagen REP Mecklenburgische Seenplatte</h3>
						<input type="checkbox" class="themeSelector" value="Eignungsgebiete für Windenergieanlagen REP Mecklenburgische Seenplatte" onchange="toggleMapButton()">
						<!--i
							class="fa fa-map-o"
							aria-hidden="true"
							style="float: right; cursor: pointer; margin-top: -12px; margin-right: 0px;"
							onclick="window.location.href = 'map.php?layers=Eignungsgebiete für Windenergieanlagen REP Mecklenburgische Seenplatte'"
						></i//-->
						<div class="wrapper"></div>
						<div style="cursor: pointer; height: 200px;" onclick="$(this).hide(); $(this).next().show(400);">
							<img src="img/wind_power.svg" alt="Eignungsgebiete für Windenergieanlagen REP Mecklenburgische Seenplatte" class="karten-image">
						</div>
						<div class="themen-details" style="cursor: pointer" onclick="$(this).hide(100, 'swing', function() { $(this).prev().show(); });">
							<i class="fa fa-map-o" aria-hidden="true" style="cursor: pointer; margin-bottom: 5px" onclick="window.location.href = 'map.php?layers=Eignungsgebiete für Windenergieanlagen REP Mecklenburgische Seenplatte'"></i>
							<a href="map.php?layers=Eignungsgebiete für Windenergieanlagen REP Mecklenburgische Seenplatte">Thema in Karte Anzeigen</a><br>
							<b>Quelle:</b> Regionaler Planungsverband Mecklenburgische Seenplatte<br>
							<b>Beschreibung:</b> <br>
							<b>Ansprechpartner:</b> <br>
							<b>E-Mail:</b> poststelle@afrlms.mv-regierung.de<br>
							<b>Tel:</b> 0395 / 777 551 100<br>
							<b>Aktualität:</b> <br>
							<b>Aktualisierungszyklus:</b> <br>
						</div>
					</div>					<div class="kartenthema" style="background-color: #c1d8ff">
						<h3>Eignungsgebiete für Windenergieanlagen REP Region Rostock</h3>
						<input type="checkbox" class="themeSelector" value="Eignungsgebiete für Windenergieanlagen REP Region Rostock" onchange="toggleMapButton()">
						<!--i
							class="fa fa-map-o"
							aria-hidden="true"
							style="float: right; cursor: pointer; margin-top: -12px; margin-right: 0px;"
							onclick="window.location.href = 'map.php?layers=Eignungsgebiete für Windenergieanlagen REP Region Rostock'"
						></i//-->
						<div class="wrapper"></div>
						<div style="cursor: pointer; height: 200px;" onclick="$(this).hide(); $(this).next().show(400);">
							<img src="img/wind_power.svg" alt="Eignungsgebiete für Windenergieanlagen REP Region Rostock" class="karten-image">
						</div>
						<div class="themen-details" style="cursor: pointer" onclick="$(this).hide(100, 'swing', function() { $(this).prev().show(); });">
							<i class="fa fa-map-o" aria-hidden="true" style="cursor: pointer; margin-bottom: 5px" onclick="window.location.href = 'map.php?layers=Eignungsgebiete für Windenergieanlagen REP Region Rostock'"></i>
							<a href="map.php?layers=Eignungsgebiete für Windenergieanlagen REP Region Rostock">Thema in Karte Anzeigen</a><br>
							<b>Quelle:</b> Geschäftsstelle: Amt für Raumordnung und Landesplanung Region Rostock<br>
							<b>Beschreibung:</b> <br>
							<b>Ansprechpartner:</b> <br>
							<b>E-Mail:</b> poststelle@afrlrr.mv-regierung.de<br>
							<b>Tel:</b> 0381 331 89-450<br>
							<b>Aktualität:</b> <br>
							<b>Aktualisierungszyklus:</b> <br>
						</div>
					</div>					<div class="kartenthema" style="background-color: #c1d8ff">
						<h3>Eignungsgebiete für Windenergieanlagen REP Vorpommern</h3>
						<input type="checkbox" class="themeSelector" value="Eignungsgebiete für Windenergieanlagen REP Vorpommern" onchange="toggleMapButton()">
						<!--i
							class="fa fa-map-o"
							aria-hidden="true"
							style="float: right; cursor: pointer; margin-top: -12px; margin-right: 0px;"
							onclick="window.location.href = 'map.php?layers=Eignungsgebiete für Windenergieanlagen REP Vorpommern'"
						></i//-->
						<div class="wrapper"></div>
						<div style="cursor: pointer; height: 200px;" onclick="$(this).hide(); $(this).next().show(400);">
							<img src="img/wind_power.svg" alt="Eignungsgebiete für Windenergieanlagen REP Vorpommern" class="karten-image">
						</div>
						<div class="themen-details" style="cursor: pointer" onclick="$(this).hide(100, 'swing', function() { $(this).prev().show(); });">
							<i class="fa fa-map-o" aria-hidden="true" style="cursor: pointer; margin-bottom: 5px" onclick="window.location.href = 'map.php?layers=Eignungsgebiete für Windenergieanlagen REP Vorpommern'"></i>
							<a href="map.php?layers=Eignungsgebiete für Windenergieanlagen REP Vorpommern">Thema in Karte Anzeigen</a><br>
							<b>Quelle:</b> Regionaler Planungsverband Vorpommern<br>
							<b>Beschreibung:</b> <br>
							<b>Ansprechpartner:</b> <br>
							<b>E-Mail:</b> <br>
							<b>Tel:</b> <br>
							<b>Aktualität:</b> <br>
							<b>Aktualisierungszyklus:</b> <br>
						</div>
					</div>					<div class="kartenthema" style="background-color: #c1d8ff">
						<h3>Windenergieanlagen Onshore<br>Erträge pro WEA pro Jahr</h3>
						<input type="checkbox" class="themeSelector" value="Windenergieanlagen Onshore<BR>Erträge pro WEA pro Jahr" onchange="toggleMapButton()">
						<!--i
							class="fa fa-map-o"
							aria-hidden="true"
							style="float: right; cursor: pointer; margin-top: -12px; margin-right: 0px;"
							onclick="window.location.href = 'map.php?layers=Windenergieanlagen Onshore<BR>Erträge pro WEA pro Jahr'"
						></i//-->
						<div class="wrapper"></div>
						<div style="cursor: pointer; height: 200px;" onclick="$(this).hide(); $(this).next().show(400);">
							<img src="img/dummy.png" alt="Windenergieanlagen Onshore<BR>Erträge pro WEA pro Jahr" class="karten-image">
						</div>
						<div class="themen-details" style="cursor: pointer" onclick="$(this).hide(100, 'swing', function() { $(this).prev().show(); });">
							<i class="fa fa-map-o" aria-hidden="true" style="cursor: pointer; margin-bottom: 5px" onclick="window.location.href = 'map.php?layers=Windenergieanlagen Onshore<BR>Erträge pro WEA pro Jahr'"></i>
							<a href="map.php?layers=Windenergieanlagen Onshore<BR>Erträge pro WEA pro Jahr">Thema in Karte Anzeigen</a><br>
							<b>Quelle:</b> LUNG<br>
							<b>Beschreibung:</b> Windenergieanlagen in Mecklenburg-Vorpommern<br>
							<b>Ansprechpartner:</b> Herr Neumann<br>
							<b>E-Mail:</b> herr.neumann@lung-mv.de<br>
							<b>Tel:</b> 0381456789<br>
							<b>Aktualität:</b> 20.11.2020<br>
							<b>Aktualisierungszyklus:</b> <br>
						</div>
					</div>					<div class="kartenthema" style="background-color: #c1d8ff">
						<h3>Windenergieanlagen Onshore<br>WEA-Dichte</h3>
						<input type="checkbox" class="themeSelector" value="Windenergieanlagen Onshore<BR>WEA-Dichte" onchange="toggleMapButton()">
						<!--i
							class="fa fa-map-o"
							aria-hidden="true"
							style="float: right; cursor: pointer; margin-top: -12px; margin-right: 0px;"
							onclick="window.location.href = 'map.php?layers=Windenergieanlagen Onshore<BR>WEA-Dichte'"
						></i//-->
						<div class="wrapper"></div>
						<div style="cursor: pointer; height: 200px;" onclick="$(this).hide(); $(this).next().show(400);">
							<img src="img/dummy.png" alt="Windenergieanlagen Onshore<BR>WEA-Dichte" class="karten-image">
						</div>
						<div class="themen-details" style="cursor: pointer" onclick="$(this).hide(100, 'swing', function() { $(this).prev().show(); });">
							<i class="fa fa-map-o" aria-hidden="true" style="cursor: pointer; margin-bottom: 5px" onclick="window.location.href = 'map.php?layers=Windenergieanlagen Onshore<BR>WEA-Dichte'"></i>
							<a href="map.php?layers=Windenergieanlagen Onshore<BR>WEA-Dichte">Thema in Karte Anzeigen</a><br>
							<b>Quelle:</b> LUNG<br>
							<b>Beschreibung:</b> Windenergieanlagen in Mecklenburg-Vorpommern<br>
							<b>Ansprechpartner:</b> Herr Neumann<br>
							<b>E-Mail:</b> herr.neumann@lung-mv.de<br>
							<b>Tel:</b> 0381456789<br>
							<b>Aktualität:</b> 20.11.2020<br>
							<b>Aktualisierungszyklus:</b> <br>
						</div>
					</div>					<div class="kartenthema" style="background-color: #c1d8ff">
						<h3>Windenergieanlagen Offshore</h3>
						<input type="checkbox" class="themeSelector" value="Windenergieanlagen Offshore" onchange="toggleMapButton()">
						<!--i
							class="fa fa-map-o"
							aria-hidden="true"
							style="float: right; cursor: pointer; margin-top: -12px; margin-right: 0px;"
							onclick="window.location.href = 'map.php?layers=Windenergieanlagen Offshore'"
						></i//-->
						<div class="wrapper"></div>
						<div style="cursor: pointer; height: 200px;" onclick="$(this).hide(); $(this).next().show(400);">
							<img src="img/wind_power.svg" alt="Windenergieanlagen Offshore" class="karten-image">
						</div>
						<div class="themen-details" style="cursor: pointer" onclick="$(this).hide(100, 'swing', function() { $(this).prev().show(); });">
							<i class="fa fa-map-o" aria-hidden="true" style="cursor: pointer; margin-bottom: 5px" onclick="window.location.href = 'map.php?layers=Windenergieanlagen Offshore'"></i>
							<a href="map.php?layers=Windenergieanlagen Offshore">Thema in Karte Anzeigen</a><br>
							<b>Quelle:</b> LUNG<br>
							<b>Beschreibung:</b> Windenergieanlagen in Mecklenburg-Vorpommern<br>
							<b>Ansprechpartner:</b> Herr Neumann<br>
							<b>E-Mail:</b> herr.neumann@lung-mv.de<br>
							<b>Tel:</b> 0381456789<br>
							<b>Aktualität:</b> 20.11.2020<br>
							<b>Aktualisierungszyklus:</b> <br>
						</div>
					</div>					<div class="kartenthema" style="background-color: #c1d8ff">
						<h3>Windenergie Potentiale</h3>
						<input type="checkbox" class="themeSelector" value="Windenergie Potentiale" onchange="toggleMapButton()">
						<!--i
							class="fa fa-map-o"
							aria-hidden="true"
							style="float: right; cursor: pointer; margin-top: -12px; margin-right: 0px;"
							onclick="window.location.href = 'map.php?layers=Windenergie Potentiale'"
						></i//-->
						<div class="wrapper"></div>
						<div style="cursor: pointer; height: 200px;" onclick="$(this).hide(); $(this).next().show(400);">
							<img src="img/dummy.png" alt="Windenergie Potentiale" class="karten-image">
						</div>
						<div class="themen-details" style="cursor: pointer" onclick="$(this).hide(100, 'swing', function() { $(this).prev().show(); });">
							<i class="fa fa-map-o" aria-hidden="true" style="cursor: pointer; margin-bottom: 5px" onclick="window.location.href = 'map.php?layers=Windenergie Potentiale'"></i>
							<a href="map.php?layers=Windenergie Potentiale">Thema in Karte Anzeigen</a><br>
							<b>Quelle:</b> LUNG<br>
							<b>Beschreibung:</b> Windenergieanlagen in Mecklenburg-Vorpommern<br>
							<b>Ansprechpartner:</b> Herr Neumann<br>
							<b>E-Mail:</b> herr.neumann@lung-mv.de<br>
							<b>Tel:</b> 0381456789<br>
							<b>Aktualität:</b> 20.11.2020<br>
							<b>Aktualisierungszyklus:</b> <br>
						</div>
					</div></div>
*/