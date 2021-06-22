function createFormatExpression(s: string) {
    const tokens = [];
    let token = '';
    for (let i = 0; i < s.length; i++) {
        if (s[i] === '$' && token.length > 0) {
            tokens.push(token);
            token = '$';
        } else {
            token += s[i];
            if (s[i] === '}') {
                tokens.push(token);
                token = '';
            }
        }
    }
    tokens.push(token);
    return tokens;
}

export function createExpressionFct(s: string) {
    const tokens = createFormatExpression(s);

    console.info("createf");
    return (obj: any) => {
        console.info("kshdkdhjaskkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
        console.info("popup", obj);
        
        if (tokens.length === 1) {
            return obj[tokens[0]];
        }
        s = '';
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.startsWith('$')) {
                const attN = token.substring(2, token.length - 1);
                const v = obj[attN];
                s += v;
            } else {
                s += token;
            }
        }
        return s;
    };
};
