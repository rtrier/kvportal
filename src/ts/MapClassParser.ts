// const CLOSING_TO_OPENING_CHARACTER = {
//     ')': '(',
//     ']': '[',
//     '>': '<',
//     '"': '"'
// };

type Operator = {
    symbol: string;
    key: string;
    precedence: number;
    associativity: 'left'|'right';
    fct: (...params:any[])=>number|boolean;
}

type booleanExpr = () => boolean;



function andOperator(...args: booleanExpr[]): boolean {
    args.forEach(f => {
        if (!f()) {
            return false;
        }
    })
    return true;
}

function orOperator(...args: booleanExpr[]): boolean {
    args.forEach(f => {
        if (f()) {
            return true;
        }
    })
    return true;
}

function eqOperator(arg01: any, arg02: any): boolean {
    return arg01 == arg02;
}

function ltOperator(arg01: any, arg02: any): boolean {
    return arg01 < arg02;
}

function gtOperator(arg01: any, arg02: any): boolean {
    return arg01 > arg02;
}

function leOperator(arg01: any, arg02: any): boolean {
    return arg01 <= arg02;
}

function geOperator(arg01: any, arg02: any): boolean {
    return arg01 >= arg02;
}

function neOperator(arg01: any, arg02: any): boolean {
    return arg01 != arg02;
}

const Operators = [
    { symbols: ["and", "&&"], fct: andOperator, precedence: 1, associativity: 'left'},
    { symbols: ["or", "||"], fct: andOperator, precedence: 2, associativity: 'left'},
    { symbols: ["eq", "="], fct: eqOperator, precedence: 3, associativity: 'left'},
    { symbols: ["lt", "<"], fct: ltOperator, precedence: 3, associativity: 'left'},
    { symbols: ["gt", ">"], fct: gtOperator, precedence: 3, associativity: 'left'},
    { symbols: ["le", "<="], fct: leOperator, precedence: 3, associativity: 'left'},
    { symbols: ["ge", ">="], fct: leOperator, precedence: 3, associativity: 'left'},
    { symbols: ["ne", "!="], fct: neOperator, precedence: 3, associativity: 'left'}
];

function createBinaries(operators):Operator[] {
    const ops:Operator[] = [];
    operators.forEach(element => {
        element.symbols.forEach((symbol:string) => {
            ops.push({
                symbol: symbol,
                key: element.symbols[0],
                fct: element.fct,
                precedence: element.fct,
                associativity: element.associativity
            })
        });
    });
    return ops;
}

const binaries = createBinaries(Operators);


// const unaries = [
//     { symbol: '-', key: 'neg', precedence: 4 }
//   ];
  
//   const binaries = [
//   //   { symbol: '^', key: 'exp',  precedence: 3, associativity: 'right' },
//   //   { symbol: '/', key: 'div',  precedence: 2, associativity: 'left'  },
//   //   { symbol: '*', key: 'mult', precedence: 2, associativity: 'left'  },
//   //   { symbol: '-', key: 'sub',  precedence: 1, associativity: 'left'  },
//   //   { symbol: '+', key: 'plus', precedence: 1, associativity: 'left'  },
//     { symbol: 'AND', key: 'eq',   precedence: 1, associativity: 'left'  },
//     { symbol: '=', key: 'eq',   precedence: 1, associativity: 'left'  },
//     { symbol: '>', key: 'gt',   precedence: 2, associativity: 'left'  },
//     { symbol: '<=', key: 'le',   precedence: 2, associativity: 'left'  }
//   ];


// class Parser {
//     exp: string;

//     constructor(exp: string) {
//         this.exp = exp;
//         this._parse();
//     }

//     private _parse() {
//         const expr = this.exp;
//         const stack: string[] = [];

//         let skipChar = false;
//         let nestedDoubleQuote = false;
//         let c = '';
//         for (let p = 0, s = 0, count = expr.length; p < count; p++) {
//             c = expr.charAt(p);

//             if (c == '(' || c == '[' || c == '<' || (!nestedDoubleQuote && !skipChar && c == '"')) {
//                 stack.push(c);
//                 if (c == '"') {
//                     nestedDoubleQuote = true;
//                     skipChar = true;
//                 }
//             }

//             // decrease nesting if a close character is found
//             if (c == ')' || c == ']' || c == '>' || (nestedDoubleQuote && !skipChar && c == '"')) {

//                 if (c == '"') {
//                     while (stack.length > 0 && '"' !== stack[stack.length - 1]) {
//                         stack.pop();
//                     }
//                     nestedDoubleQuote = false;
//                     stack.pop();
//                 } else {
//                     const ch = CLOSING_TO_OPENING_CHARACTER[c];
//                     if (stack.length > 0 && ch != null && ch === stack[stack.length - 1]) {
//                         stack.pop();
//                     }
//                 }
//             }

//             skipChar = c == '\\';

//             //   if (stack.lengthisEmpty() && c == delim) {
//             //     tokens.add(string.substring(s, p));
//             //     s = p + 1; // +1 to skip the delimiter
//             //   }

//             // }

//             // // Don't forget the last token ;-)
//             // if (s < string.length()) {
//             //   tokens.add(string.substring(s));
//             // }

//             // // check for last token empty
//             // if ( s == string.length() && c == delim) {
//             //   tokens.add("");
//             // }

//             // return tokens.size();
//         }
//     }

// }


const MIN_PRECEDENCE = 0;



/**
 * Returns the remainder of a given string after slicing off
 * the length of a given symbol and any following whitespace.
 * (Does not verify that the symbol is an initial substring.)
 *
 * @private
 * @static
 * @param {string} str    - a string to slice
 * @param {string} symbol - an initial substring
 * @returns {string}
 */
function sliceSymbol(str:string, symbol:string):string {
    return str.slice(symbol.length).trim();
}

/**
 * Attempts to match a given list of operators against the head of a given string.
 * Returns the first match if successful, otherwise null.
 *
 * @private
 * @static
 * @param {string}   str          - a string to match against
 * @param {Object[]} operatorList - an array of operator definitions, sorted by longest symbol
 * @returns {?Object}
 */
function matchOperator(str: string, operatorList:Operator[]):Operator|undefined {
    const s = str.toLowerCase();
    return operatorList.reduce((match:Operator, operator:Operator) => {
        return match ||
            (s.startsWith(operator.symbol) ? operator : undefined);
    }, undefined);
}


/**
 * A parser class for "operator-precedence languages", i.e.,
 * context-free languages which have only variables, unary operators, and binary operators.
 *
 * The grammar for a parser instance is thus wholly specified by the operator definitions
 * (as well as a key with which to label variable nodes).
 *
 * An operator definition is an object like the following:
 *   { symbol: '+', key: 'plus', precedence: 1, associativity: 'left' }
 * It specifies a symbol, a key for its AST node, a precedence level,
 * and (for binaries) an associativity direction.
 */
export class FormulaParserX {
    unaries: any[];
    binaries: any[];
    variableKey: string;
    /**
     * @param {string}   variableKey - key to use for a variable's AST node
     * @param {Object[]} unaries     - an array of unary operator definitions
     * @param {Object[]} binaries    - an array of binary operator definitions
     */
    constructor(variableKey = 'var', unaries = [], binaries = []) {
        const byLongestSymbol = (x, y) => y.symbol.length - x.symbol.length;
        this.variableKey = variableKey,
            this.unaries = unaries.slice().sort(byLongestSymbol),
            this.binaries = binaries.slice().sort(byLongestSymbol)

    }

    /**
     * Attempts to parse a binary subformula at the head of a given string,
     * given a lower precedence bound and an AST node to be used as a left operand.
     * Returns an AST node and string remainder if successful, otherwise null.
     *
     * @private
     * @param {FormulaParser} self
     * @param {string}        currentString     - remainder of input string left to parse
     * @param {number}        currentPrecedence - lowest binary precedence allowable at current parse stage
     * @param {Object}        leftOperandJSON   - AST node for already-parsed left operand
     * @returns {?Object}
     */
    private _parseBinarySubformula(currentString:string, currentPrecedence:number, leftOperandJSON) {
        const binary = matchOperator(currentString, this.binaries);
        if (!binary || binary.precedence < currentPrecedence) {
            return null;
        }
        const nextPrecedence =  (binary.associativity === 'left') ? binary.precedence + 1 : binary.precedence;
        const parsedRightOperand = this._parseFormula(sliceSymbol(currentString, binary.symbol), nextPrecedence);

        return {
            // json: { [binary.key]: [leftOperandJSON, parsedRightOperand.json] },
            json: { key:binary.key, fct:binary.fct, param:[leftOperandJSON, parsedRightOperand.json] },
            remainder: parsedRightOperand.remainder
        };
    }


    /**
     * Attempts to parse a unary subformula at the head of a given string.
     * Returns an AST node and string remainder if successful, otherwise null.
     *
     * @private
     * @param {string}        currentString - remainder of input string left to parse
     * @returns {?Object}
     */
    private _parseUnarySubformula(currentString:string) {
        const unary = matchOperator(currentString, this.unaries);
        if (!unary) {
            return null;
        }

        const parsedSubformula = this._parseFormula(sliceSymbol(currentString, unary.symbol), unary.precedence);

        return {
            json: { [unary.key]: parsedSubformula.json },
            remainder: parsedSubformula.remainder
        };
    }
    /**
     * Recursively parses a formula according to this parser's parameters.
     * Returns an complete AST and a (hopefully empty) string remainder.
     *
     * @private
     * @param {FormulaParser} self
     * @param {string}        currentString     - remainder of input string left to parse
     * @param {number}        currentPrecedence - lowest binary precedence allowable at current parse stage
     * @param {Object}        [currentJSON]     - AST node retained from previous parse stage
     * @returns {Object}
     */
    _parseFormula(currentString: string, currentPrecedence: number, currentJSON?: any) {
        console.info(`parse ${currentString}`, currentJSON);
        if (!currentString.length && !currentJSON) {
            throw new SyntaxError('Invalid formula! Unexpected end of input.');
        }

        // First, we need an initial subformula.
        // A valid formula can't start with a binary operator, but anything else is possible.
        const parsedHead =
            currentJSON ? { json: currentJSON, remainder: currentString } :
                this._parseUnarySubformula(currentString) ||
                this._parseParenthesizedSubformula(currentString) ||
                this._parseVariable(currentString);

        if (!parsedHead) {
            throw new SyntaxError('Invalid formula! Could not find an initial subformula.');
        }

        // Having found an initial subformula, let's see if it's the left operand to a binary operator...
        const parsedBinary = this._parseBinarySubformula(parsedHead.remainder, currentPrecedence, parsedHead.json);
        if (!parsedBinary) {
            // ...if it isn't, we're done!
            return parsedHead;
        }

        // ...if it is, we parse onward, with our new binary subformula as the next initial subformula.
        return this._parseFormula(parsedBinary.remainder, currentPrecedence, parsedBinary.json);
    }

    /**
     * Attempts to parse a variable (i.e., any alphanumeric substring) at the head of a given string.
     * Returns an AST node and string remainder if successful, otherwise null.
     *
     * @private
     * @param {string}        currentString - remainder of input string left to parse
     * @returns {?Object}
     */
    private _parseVariable(currentString: string) {
        const variable = (currentString.match(/^[\[\]\w]+/) || [])[0];
        if (!variable) {
            return null;
        }

        return {
            json: { [this.variableKey]: variable },
            remainder: sliceSymbol(currentString, variable)
        };
    }
    /**
     * Attempts to parse a parenthesized subformula at the head of a given string.
     * Returns an AST node and string remainder if successful, otherwise null.
     *
     * @private
     * @param {string}        currentString - remainder of input string left to parse
     * @returns {?Object}
     */
    private _parseParenthesizedSubformula(currentString: string) {
        if (currentString.charAt(0) !== '(') {
            return null;
        }

        const parsedSubformula = this._parseFormula(sliceSymbol(currentString, '('), MIN_PRECEDENCE);
        if (parsedSubformula.remainder.charAt(0) !== ')') {
            throw new SyntaxError('Invalid formula! Found unmatched parenthesis.');
        }

        return {
            json: parsedSubformula.json,
            remainder: sliceSymbol(parsedSubformula.remainder, ')')
        };
    }
    /**
     * Parses a formula according to this parser's parameters.
     * Returns an AST in JSON format.
     *
     * @param {string} input - a formula to parse
     * @returns {Object}
     */
    parse(input: string) {

        if (typeof input !== 'string') {
            throw new SyntaxError('Invalid formula! Found non-string input.');
        }

        const parsedFormula = this._parseFormula(input.trim(), MIN_PRECEDENCE);
        if (parsedFormula.remainder.length) {
            throw new SyntaxError('Invalid formula! Unexpected continuation of input.');
        }

        return parsedFormula.json;
    }
}

const FormularParser = new FormulaParserX('var', [], binaries);

export function parseExpression(s:string):any {
    return FormularParser.parse(s);
}