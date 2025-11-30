

export const humanPrompt = ({ compressedContext, input } : {compressedContext: any, input: any}) => {
    return compressedContext
        ? `
        Context disponibil:
        ${compressedContext}

        Întrebare: ${input}

        Instrucțiuni:
        - Stil natural, simplu, amabil.
        - Folosește context dacă relevant, altfel răspunde normal.
        - Pentru formule matematice, folosește $ pentru inline, $$ pentru display
        - Pentru vag, continuă de la ultimul răspuns.
        - Fără proces intern.
        `
        : `
        Întrebare: ${input}

        Instrucțiuni:
        - Stil natural, simplu.
        - Pentru formule matematice, folosește $ pentru inline, $$ pentru display
        - Pentru vag, continuă de la ultimul răspuns.
        `;
};
