export const mathPrompt = ({ compressedContext, input } :  {compressedContext: any, input: any}) => {
    return compressedContext
        ? `
        Context disponibil:
        ${compressedContext}

        Întrebare: ${input}

        Instrucțiuni:
        - Răspuns matematic concis: formule, calcule, pași.
        - Folosește context dacă matematic relevant, altfel general.
        - Pentru formule, folosește $ pentru inline, $$ pentru display
        - Evită explicații lungi.
        - Pentru vag, leagă de ultimul concept matematic.
        `
        : `
        Întrebare: ${input}

        Instrucțiuni:
        - Răspuns matematic scurt: formule, pași.
        - Pentru formule, folosește $ pentru inline, $$ pentru display
        - Pentru vag, continuă ultimul concept.
        `;
};
