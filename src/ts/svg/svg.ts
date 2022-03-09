function applyStyle(el: SVGElement, style: SvgStyle) {
    for (let k in style) {
        el.style[k] = style[k];
    }
}

export interface SvgStyle {
    // extends CSSStyleDeclaration
    fill?: string;
    opacity?: string | number;
    stroke?: string;
    strokeOpacity?: string | number;
    strokeWidth?: string | number;
    strokeDasharray?: string;
    strokeDashoffset?: string;
    strokeLinecap?: string;
    strokeLinejoin?: string;
    fillRule?: string;
    transformOrigin?: string;
    transform?: string;
}

export interface SvgPathParam extends SvgStyle {
    d: string;
}
export interface SvgLineParam extends SvgStyle {
    x1: string | number;
    y1: string | number;
    x2: string | number;
    y2: string | number;
}
export interface SvgCircleParam extends SvgStyle {
    cx: string | number;
    cy: string | number;
    r: string | number;
}
export interface SvgRectangleParam extends SvgStyle {
    x: string | number;
    y: string | number;
    width: string | number;
    height: string | number;
    rx?: string | number;
    ry?: string | number;
}

export class SvgBaseElement<K extends SVGGeometryElement> {
    svg: K;

    constructor(el: K, style?: SvgStyle) {
        this.svg = el;
        if (style) {
            applyStyle(el, style);
        }
    }

    updateStyle(style?: SvgStyle) {
        applyStyle(this.svg, style);
    }

    getSVG(): K {
        return this.svg;
    }

    getPathLength() {
        return this.svg.pathLength;
    }

    isPointInFill(point: DOMPoint) {
        return this.svg.isPointInFill(point);
    }
    isPointInStroke(point: DOMPoint) {
        return this.svg.isPointInStroke(point);
    }
    getTotalLength() {
        return this.svg.getTotalLength();
    }
    getPointAtLength(distance: number) {
        return this.svg.getPointAtLength(distance);
    }
}

export class Circle extends SvgBaseElement<SVGCircleElement> {
    constructor(cx: number, cy: number, radius: number, style?: SvgStyle) {
        super(document.createElementNS("http://www.w3.org/2000/svg", "circle"), style);
        this.update(cx, cy, radius);
    }

    update(cx: number, cy: number, radius: number) {
        this.svg.setAttribute("r", String(radius));
        this.svg.setAttribute("cx", String(cx));
        this.svg.setAttribute("cy", String(cy));
    }
}

export class Line extends SvgBaseElement<SVGLineElement> {
    constructor(x1: number, y1: number, x2: number, y2: number, style?: SvgStyle) {
        super(document.createElementNS("http://www.w3.org/2000/svg", "line"), style);
        this.update(x1, y1, x2, y2);
    }

    update(x1: number, y1: number, x2: number, y2: number) {
        this.svg.setAttribute("x1", String(x1));
        this.svg.setAttribute("y1", String(y1));
        this.svg.setAttribute("x2", String(x2));
        this.svg.setAttribute("y2", String(y2));

        this.svg.style["x1"] = String(x1);
        this.svg.style["y1"] = String(y1);
        this.svg.style["x2"] = String(x2);
        this.svg.style["y2"] = String(y2);
    }
}

export class PolyLine extends SvgBaseElement<SVGPolylineElement> {
    constructor(points: string | number[][], style?: SvgStyle) {
        super(document.createElementNS("http://www.w3.org/2000/svg", "polyline"), style);
        this.update(points);
    }

    update(points: string | number[][]) {
        // points="100,10 40,198 190,78 10,78 160,198"
        if (points) {
            if (typeof points === "string") {
                this.svg.setAttribute("points", points);
            } else {
                if (points.length > 0) {
                    let s = points[0][0] + "," + points[0][1];
                    for (let i = 1, count = points.length; i < count; i++) {
                        s += " " + points[i][0] + "," + points[i][1];
                    }
                    this.svg.setAttribute("points", s);
                }
            }
        }
    }
}

export class Polygon extends SvgBaseElement<SVGPolygonElement> {
    constructor(points: string | number[][], style?: SvgStyle) {
        super(document.createElementNS("http://www.w3.org/2000/svg", "polygon"), style);
        this.update(points);
    }

    update(points: string | number[][]) {
        // points="100,10 40,198 190,78 10,78 160,198"
        if (points) {
            if (typeof points === "string") {
                this.svg.setAttribute("points", points);
            } else {
                if (points.length > 0) {
                    let s = points[0][0] + "," + points[0][1];
                    for (let i = 1, count = points.length; i < count; i++) {
                        s += " " + points[i][0] + "," + points[i][1];
                    }
                    this.svg.setAttribute("points", s);
                }
            }
        }
    }
}

export class SVG {
    svg: SVGSVGElement;
    g: SVGGElement;

    constructor(viewbox?: { x: number; y: number; width: number; height: number }) {
        const svg: SVGSVGElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        if (viewbox) {
            if (svg.viewBox.baseVal) {
                svg.viewBox.baseVal.x = viewbox.x;
                svg.viewBox.baseVal.y = viewbox.y;
                svg.viewBox.baseVal.width = viewbox.width;
                svg.viewBox.baseVal.height = viewbox.height;
            } else {
                // svg.setAttribute("viewBox", "x:viewbox.x, y:viewbox.y, width:viewbox.width, height:viewbox.height");
                const viewboxString = "" + viewbox.x.toString() + " " + viewbox.y.toString() + " " + viewbox.width.toString() + " " + viewbox.height.toString();
                svg.setAttribute("viewBox", viewboxString);
                console.debug("svg.viewBox", svg.viewBox);
            }
        }
        this.svg = svg;
    }

    getGElement(): SVGGElement {
        if (!this.g) {
            this.g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.svg.appendChild(this.g);
        }
        return this.g;
    }

    addCircle(cx: number, cy: number, radius: number, style?: SvgStyle): Circle {
        const circle = new Circle(cx, cy, radius, style);
        this.getGElement().appendChild(circle.svg);
        return circle;
    }

    addLine(x1: number, y1: number, x2: number, y2: number, style?: SvgStyle): Line {
        const line = new Line(x1, y1, x2, y2, style);
        this.getGElement().appendChild(line.svg);
        return line;
    }

    addPolyLine(points: string | number[][], style?: SvgStyle): PolyLine {
        const polygon = new PolyLine(points, style);
        this.getGElement().appendChild(polygon.svg);
        return polygon;
    }

    addPolygGon(points: string | number[][], style?: SvgStyle): Polygon {
        const polygon = new Polygon(points, style);
        this.getGElement().appendChild(polygon.svg);
        return polygon;
    }
}
