export const detailedPrompt = ({ compressedContext, input } : { compressedContext: any, input: any }) => {
    return compressedContext
        ? `
        Context disponibil:
        ${compressedContext}

        Întrebare: ${input}

        Instrucțiuni:
        - Răspuns detaliat, clar, structurat.
        - Folosește context dacă relevant, altfel cunoștințe generale.
        - Pentru formule matematice, folosește $ pentru inline, $$ pentru display
        - Exemple/analogii dacă ajută.
        - Pentru vag ("explică-mi"), leagă de ultimul răspuns anterior.
        - Ton prietenos, fără proces intern.
        `
        : `
        Întrebare: ${input}

        Instrucțiuni:
        - Răspuns detaliat, clar, structurat.
        - Pentru formule matematice, folosește $ pentru inline, $$ pentru display
        - Folosește exemple dacă ajută.
        - Pentru vag ("explică-mi"), leagă de ULTIMUL răspuns anterior.
        `;
};
