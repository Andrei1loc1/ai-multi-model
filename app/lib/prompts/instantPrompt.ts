export const instantPrompt = ({compressedContext, input} : {compressedContext: any, input: any}) => {
    return compressedContext
        ? `
            Context disponibil:
            ${compressedContext}

            Întrebare:
            ${input}

            Instrucțiuni:
            - Folosește contextul dacă ajută la răspuns, dar nu ești limitat la el
            - Răspunde direct și clar, folosind cunoștințe generale dacă e necesar
            - Pentru formule matematice, folosește $ pentru inline, $$ pentru display
            - Dacă întrebarea e vagă ("explică-mi"), referă-te la ultimul răspuns anterior
            - Răspuns concentrat, fără istoric conversație
            `
        : `
            Întrebare:
            ${input}

            Instrucțiuni:
            - Răspunde direct și clar.
            - Pentru formule matematice, folosește $ pentru inline, $$ pentru display
            - Dacă e vagă ("explică-mi"), răspunde bazat pe ULTIMUL răspuns anterior.
            `;
}