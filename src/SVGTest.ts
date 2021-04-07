
import { Expression, FormulaParserX, parseExpression } from './ts/MapClassParser';
import * as svg from './ts/svg/svg';
import { createHtmlElement } from './ts/Util';
import FormulaParser from './ts/util/FormulaParser';

document.addEventListener("DOMContentLoaded", start);

function createLegendArea(style: svg.SvgStyle): Element {
    const svgEl = new svg.SVG({
        x: -50, y: 0, width: 100, height: 100
    });
    svgEl.addPolygGon([[-45, 5], [45, 5], [45, 90], [-45, 90]], style);
    return svgEl.svg;
}


class SVGItem {

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


        const svgEl = new svg.SVG({
            x: 0, y: 0, width: 100, height: 100
        });
        content.appendChild(svgEl.svg);

        svgEl.addCircle(50, 50, 20, { stroke: 'black', strokeWidth: "2", fill: "green" });

        svgEl.addPolygGon([[50, 50], [50, 150], [150, 150]], {
            stroke: 'black',
            strokeWidth: "2",
            strokeDasharray: "2,2",
            fillOpacity: "0.4",
            fill: "blue",
            transformOrigin: "center",
            // transform: "rotate(309deg)"
        });

        document.addEventListener('click', evt => this.adjustAngle(svgEl.svg, evt));
    }


    adjustAngle(el: SVGSVGElement, evt: MouseEvent): any {
        console.log(evt);
        console.log(`offsetLeft/offsetTop='${el.x}, ${el.y}'`, el.x, el.y,el.viewBox, el.viewportElement, el.viewport);
        console.log(`el.getBoundingClientRect()='${el.getBoundingClientRect()}'`);
        if (el.getBoundingClientRect()) {
            const r = el.getBoundingClientRect();
            console.log(`r.left/top w/h='${r.left} ${r.top} ${r.width} ${r.height}'`);
            console.log(`evt.x/y='${evt.x}/${evt.y}'`);
            const x1 = r.left + r.width/2
            const y1 = r.top + r.height/2;
            const dY = (evt.clientY - y1);
            const dX = (evt.clientX - x1);
            console.log(`x1,y1 ${x1}, ${y1}, x2,y2 ${evt.clientX}, ${evt.clientY}`);
            console.log(`dx,dy => angle ${dX}, ${dY}`);
            const tan = dX/dY;
            console.log(`sin ${tan}`);
            const angle = Math.atan(tan);
            const grad = angle * 180 / Math.PI;
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
    console.info(r.eval({ summe_mwh: 'Test test' }));

    new SVGItem().start();

}