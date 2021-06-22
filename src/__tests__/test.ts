console.info("TEST");


import { Expression, parseExpression } from "../ts/MapClassParser";

const rStringEq = <Expression>parseExpression("([label] = 'E.DIS Netz GmbH')");
console.info(rStringEq);
console.info(rStringEq.eval({label:'E.DIS Netz GmbH'}));
console.info(rStringEq.eval({label:'E.DIS Netz GmbH1'}));


const rIntEq = <Expression>parseExpression("([label] = 22)");
console.info(rIntEq);
console.info(rIntEq.eval({label:22}));
console.info(rIntEq.eval({label:23}));
