export const teoreticPrompt = ({ compressedContext, input }: {compressedContext: any, input: any}) => {
    return compressedContext
        ? `
        Context disponibil:
        ${compressedContext}

        Întrebare: ${input}

        Instrucțiuni:
        - Răspuns teoretic, conceptual, structurat.
        - Folosește context dacă ajută, altfel cunoștințe generale.
        - Pentru formule matematice, folosește $ pentru inline, $$ pentru display
        - Definiții, principii.
        - Ton obiectiv, academic.
        - Pentru vag, clarifică bazat pe ultimul răspuns.
        `
        : `
        Întrebare: ${input}

        Instrucțiuni:
        - Răspuns teoretic, conceptual.
        - Pentru formule matematice, folosește $ pentru inline, $$ pentru display
        - Pentru vag, continuă ultimul răspuns.
        `;
};
