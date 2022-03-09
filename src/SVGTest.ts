import { Expression, FormulaParserX, parseExpression } from "./ts/MapClassParser";
import { createPiechart } from "./ts/svg/piechart";
import * as svg from "./ts/svg/svg";
import { createHtmlElement } from "./ts/Util";
import FormulaParser from "./ts/util/FormulaParser";

document.addEventListener("DOMContentLoaded", start);

function createLegendArea(style: svg.SvgStyle): Element {
    const svgEl = new svg.SVG({
        x: -50,
        y: 0,
        width: 100,
        height: 100,
    });
    svgEl.addPolygGon(
        [
            [-45, 5],
            [45, 5],
            [45, 90],
            [-45, 90],
        ],
        style
    );
    return svgEl.svg;
}

// Start
function start01() {
    //-------------------------------------
    const example = {
        //set parameters for pie chart
        radius: 150, //set radius of pie
        segments: [
            { value: 5, style: { fill: "rgb(255, 0, 0)" } },
            { value: 4, style: { fill: "DarkBlue" } },
            { value: 2, style: { fill: "#0b0" } },
            { value: 3, style: { fill: "#f8bb00" } },
        ],
    };

    const e2 = {
        radius: 20,
        segments: [
            { value: "174", style: { fill: "red" } },
            { value: "6", style: { fill: "blue" } },
            { value: "23", style: { fill: "yellow" } },
            { value: "122", style: { fill: "cyan" } },
            { value: "23", style: { fill: "blue" } },
            { value: "223", style: { fill: "green" } },
            { value: "16", style: { fill: "gray" } },
        ],
    };
    const content = document.getElementById("testarea");
    content.appendChild(createPiechart(example));
}

// function createPie(data) {
//     const svgEl = new svg.SVG({
//         x: 0,
//         y: 0,
//         width: 2 * data.radius,
//         height: 2 * data.radius,
//     });
//     // calculate sum of values
//     var sum = 0;
//     var radius = data.radius;
//     for (var e = 0; e < data.segments.length; e++) {
//         sum += data.segments[e].value;
//     }
//     // generate proportional pie for all segments
//     var startAngle = 0,
//         endAngle = 0;
//     for (var i = 0; i < data.segments.length; i++) {
//         var element = data.segments[i];
//         var angle = (element.value * 2 * Math.PI) / sum;
//         endAngle += angle;
//         var svgLine = makeSVG("line", { x1: radius, y1: radius, x2: Math.cos(endAngle) * radius + radius, y2: Math.sin(endAngle) * radius + radius, stroke: element.color });
//         svgEl.svg.append(svgLine);
//         var pathStr = "M " + radius + "," + radius + " " + "L " + (Math.cos(startAngle) * radius + radius) + "," + (Math.sin(startAngle) * radius + radius) + " " + "A " + radius + "," + radius + " 0 " + (angle < Math.PI ? "0" : "1") + " 1 " + (Math.cos(endAngle) * radius + radius) + "," + (Math.sin(endAngle) * radius + radius) + " " + "Z";
//         var svgPath = makeSVG("path", { d: pathStr, fill: element.color });
//         svgEl.svg.append(svgPath);
//         startAngle += angle;
//     }
//     return svgEl.svg;
// }

// // SVG Maker - to draw SVG by script
// function makeSVG(tag, attrs) {
//     var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
//     for (var k in attrs) el.setAttribute(k, attrs[k]);
//     return el;
// } //SVG Maker

// // end

class SVGItem {
    start() {
        console.info("TEST-SVG PIE");
        start01();
    }
}

class SVGItem1 {
    svg: svg.SVG;
    circle: svg.Circle;
    arrow: svg.Polygon;
    angle = 0;

    start() {
        console.info("TEST-SVG");

        const content = document.getElementById("testarea");

        // const table = createHtmlElement('table', content);
        // for (let i=0; i<5; i++) {
        //     const tr = createHtmlElement('tr', table);
        //     const td01 = createHtmlElement('td', tr);
        //     td01.innerText = 'test'+i;
        //     const td02 = createHtmlElement('td', tr);
        //     td02.appendChild(createLegendArea({fill:'#888', stroke:'blue'}));
        // }

        const svgEl = (this.svg = new svg.SVG({
            x: 0,
            y: 0,
            width: 200,
            height: 200,
        }));
        content.appendChild(svgEl.svg);

        this.circle = svgEl.addCircle(100, 100, 92, { stroke: "black", strokeWidth: "2", fill: "green" });

        this.arrow = svgEl.addPolygGon(
            [
                [100, 11],
                [145, 178],
                [55, 178],
            ],
            {
                stroke: "black",
                strokeWidth: "2",
                //strokeDasharray: "2,2",
                opacity: "0.4",
                fill: "blue",
                transformOrigin: "center",
                // transform: "rotate(309deg)"
            }
        );

        svgEl.addLine(0, 8, 200, 8, { stroke: "black", strokeWidth: "2" });
        svgEl.addLine(0, 200, 200, 200, { strokeWidth: "3" });

        // svgEl.addPolygGon([[50, 50], [50, 150], [150, 150]], {
        //     stroke: 'black',
        //     strokeWidth: "2",
        //     strokeDasharray: "2,2",
        //     fillOpacity: "0.4",
        //     fill: "blue",
        //     transformOrigin: "center",
        //     // transform: "rotate(309deg)"
        // });

        // document.addEventListener('click', evt => this.adjustAngle(svgEl.svg, evt));

        const bttnRotate = document.createElement("button");
        bttnRotate.innerText = "rotate";
        bttnRotate.addEventListener("click", (evt: MouseEvent) => {
            this.rotate(evt);
        });
        document.getElementById("bttnarea").appendChild(bttnRotate);
        console.info(this.angle);
    }
    rotate(evt: MouseEvent) {
        console.info(this.angle);
        this.angle += 30;
        console.info(this.angle);
        const s = `rotate(${this.angle}deg)`;
        console.info(s);
        this.arrow.svg.style.transform = `rotate(${this.angle}deg)`;
    }

    adjustAngle(el: SVGSVGElement, evt: MouseEvent): any {
        console.log(evt);
        console.log(`offsetLeft/offsetTop='${el.x}, ${el.y}'`, el.x, el.y, el.viewBox, el.viewportElement);
        console.log(`el.getBoundingClientRect()='${el.getBoundingClientRect()}'`);
        if (el.getBoundingClientRect()) {
            const r = el.getBoundingClientRect();
            console.log(`r.left/top w/h='${r.left} ${r.top} ${r.width} ${r.height}'`);
            console.log(`evt.x/y='${evt.x}/${evt.y}'`);
            const x1 = r.left + r.width / 2;
            const y1 = r.top + r.height / 2;
            const dY = evt.clientY - y1;
            const dX = evt.clientX - x1;
            console.log(`x1,y1 ${x1}, ${y1}, x2,y2 ${evt.clientX}, ${evt.clientY}`);
            console.log(`dx,dy => angle ${dX}, ${dY}`);
            const tan = dX / dY;
            console.log(`sin ${tan}`);
            const angle = Math.atan(tan);
            const grad = (angle * 180) / Math.PI;
            console.log(`angle ${angle} ${grad}`);
            // , ${sin} => ${angle}`);
        }
    }
}

function start() {
    // const variableKey = 'var';

    // const unaries = [
    //   { symbol: '-', key: 'neg', precedence: 4 }
    // ];

    // const binaries = [
    // //   { symbol: '^', key: 'exp',  precedence: 3, associativity: 'right' },
    // //   { symbol: '/', key: 'div',  precedence: 2, associativity: 'left'  },
    // //   { symbol: '*', key: 'mult', precedence: 2, associativity: 'left'  },
    // //   { symbol: '-', key: 'sub',  precedence: 1, associativity: 'left'  },
    // //   { symbol: '+', key: 'plus', precedence: 1, associativity: 'left'  },
    //   { symbol: 'and', key: 'eq',   precedence: 1, associativity: 'left'  },
    //   { symbol: '=', key: 'eq',   precedence: 1, associativity: 'left'  },
    //   { symbol: '>', key: 'gt',   precedence: 2, associativity: 'left'  },
    //   { symbol: '<=', key: 'le',   precedence: 2, associativity: 'left'  }
    // ];

    // const algebraParser = new FormulaParserX(variableKey, unaries, binaries);

    // // const r = algebraParser.parse("(a + b * c)");
    // const r = algebraParser.parse("(summe_mwh > 1000 and summe_mwh <= 5000)");

    // const exp = "([summe_mwh] > 1000 and [summe_mwh] <= 5000)";
    const exp = "('Test test' = [summe_mwh])";

    const r = <Expression>parseExpression(exp);
    console.info(r);
    console.info(exp);
    // console.info(r.eval({summe_mwh:2000}));
    console.info(r.eval({ summe_mwh: "Test test" }));

    new SVGItem().start();
}
