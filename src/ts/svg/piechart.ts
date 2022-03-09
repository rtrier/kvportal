import { SvgLineParam, SvgPathParam, SvgStyle } from "./svg";

export type PieChartParam = {
    radius: number;
    color?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    segments: { value: number; style: SvgStyle }[];
};

export function createPiechart(param: PieChartParam): SVGSVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const d = 2 * param.radius;
    if (svg.viewBox.baseVal) {
        svg.viewBox.baseVal.x = 0;
        svg.viewBox.baseVal.y = 0;
        svg.viewBox.baseVal.width = d;
        svg.viewBox.baseVal.height = d;
    } else {
        const viewboxString = "0 0 " + d.toString() + " " + d.toString();
        svg.setAttribute("viewBox", viewboxString);
    }

    svg.setAttribute("width", d.toString());
    svg.setAttribute("height", d.toString());

    // calculate sum of values
    let sum = 0;
    let radius = param.radius;
    for (let e = 0; e < param.segments.length; e++) {
        sum += param.segments[e].value;
    }
    // generate proportional pie for all segments
    let startAngle = 0,
        endAngle = 0;
    for (let i = 0; i < param.segments.length; i++) {
        const element = param.segments[i];
        const angle = (element.value * 2 * Math.PI) / sum;
        endAngle += angle;
        const svgLine = makeSVG("line", {
            x1: radius,
            y1: radius,
            x2: Math.cos(endAngle) * radius + radius,
            y2: Math.sin(endAngle) * radius + radius,
            stroke: param.color,
            strokeOpacity: param.strokeOpacity,
            strokeWidth: param.strokeWeight,
        });
        svg.append(svgLine);
        const pathStr = "M " + radius + "," + radius + " " + "L " + (Math.cos(startAngle) * radius + radius) + "," + (Math.sin(startAngle) * radius + radius) + " " + "A " + radius + "," + radius + " 0 " + (angle < Math.PI ? "0" : "1") + " 1 " + (Math.cos(endAngle) * radius + radius) + "," + (Math.sin(endAngle) * radius + radius) + " " + "Z";
        const svgPath = makeSVG("path", {
            d: pathStr,
            fill: element.style.fill,
            opacity: element.style.opacity,
            stroke: param.color ?? "#bbb",
            strokeOpacity: param.strokeOpacity ?? "0.6",
            strokeWidth: param.strokeWeight ?? "1",
        });
        svg.append(svgPath);
        startAngle += angle;
    }
    return svg;
}

// SVG Maker - to draw SVG by script
function makeSVG(tag: string, attrs: SvgPathParam | SvgLineParam): SVGElement {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (let k in attrs) {
        el.setAttribute(k, attrs[k]);
    }
    return el;
}
