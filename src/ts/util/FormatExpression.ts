function createFormatExpression(s) {
    const tokens = [];
    let token = '';
    // let placeHolder = undefined;
    for (let i=0; i<s.length; i++) {        
        if (s[i]==='$' && token.length>0) {
            tokens.push(token);
            token = '$';
        } else {
            token += s[i];
            if (s[i]==='}') {
                tokens.push(token);
                token = '';
            } 
        }
    }
    tokens.push(token);
    return tokens;
}

export function createExpressionFct(s:string) {
    const tokens = createFormatExpression(s);
    // for (let i=0; i<tokens.length; i++)  {
    //     console.info(i, tokens[i]);
    // }
    console.info("createf");
    return (obj) => {
        // console.info("fCall");
        // console.info(obj);
        // console.info(tokens);
        s = '';
        for (let i=0; i<tokens.length; i++)  {
            const token = tokens[i];
            if (token.startsWith('$')) {
                const attN = token.substring(2, token.length-1);
                const v = obj[attN];
                s += v;
            } else {
                s += token;
            }
        }
        return s;
    };
};



// const fct = createExpressionFct("${gemeindename}: ${summe_mwh} MWh");
// const res = fct({gemeindename:"GemX", summe_mwh:12});