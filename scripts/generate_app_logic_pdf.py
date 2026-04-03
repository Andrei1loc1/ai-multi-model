from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_FILE = OUTPUT_DIR / "logica-aplicatiei.pdf"


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TitleCustom",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=28,
            textColor=colors.HexColor("#132238"),
            alignment=TA_LEFT,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Meta",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#5B6575"),
            spaceAfter=14,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Section",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=18,
            textColor=colors.HexColor("#0F3D5E"),
            spaceBefore=8,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyCustom",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=7,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BulletCustom",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            leftIndent=12,
            bulletIndent=0,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=5,
        )
    )
    return styles


def bullet(text, styles):
    return Paragraph(text, styles["BulletCustom"], bulletText="-")


def build_pdf():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    styles = build_styles()

    doc = SimpleDocTemplate(
        str(OUTPUT_FILE),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Logica aplicatiei AI Multi-Model",
        author="Codex",
    )

    story = []
    story.append(Paragraph("Logica aplicatiei AI Multi-Model", styles["TitleCustom"]))
    story.append(
        Paragraph(
            "Rezumat scurt al modului in care UI-ul, endpoint-urile si integratiile externe lucreaza impreuna.",
            styles["Meta"],
        )
    )

    story.append(Paragraph("1. Ce face aplicatia", styles["Section"]))
    story.append(
        Paragraph(
            "Aplicatia este un hub de chat construit cu Next.js. Utilizatorul scrie un mesaj, alege un model AI si un stil de prompt, iar serverul trimite cererea catre OpenRouter. Raspunsul este afisat in interfata si poate fi salvat ca nota in Firebase.",
            styles["BodyCustom"],
        )
    )

    story.append(Paragraph("2. Fluxul principal", styles["Section"]))
    flow_rows = [
        ["Pas", "Rol"],
        ["UI chat", "Componenta ChatUI tine starea: input, model, prompt preset, raspuns si istoric."],
        ["Pregatire prompt", "Daca este activ contextul, ultimele mesaje sunt comprimate prin /api/compress, apoi sunt combinate cu presetul ales."],
        ["Trimitere mesaj", "sendMessage trimite cererea la /api/ai si actualizeaza starea de loading si raspunsul curent."],
        ["Selectie model", "getModel alege modelul cerut sau primul model activ care are cheia configurata."],
        ["Cerere externa", "aiRequest trimite promptul la OpenRouter si incearca mai multe chei API pana cand una functioneaza."],
        ["Afisare", "Raspunsul revine in UI si este randat in fereastra de chat."],
    ]
    flow_table = Table(flow_rows, colWidths=[32 * mm, 132 * mm], repeatRows=1)
    flow_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DCEBFA")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#12324D")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 12),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#B9CADE")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(flow_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("3. Module importante", styles["Section"]))
    story.extend(
        [
            bullet("`app/chat/ChatUI.tsx` coordoneaza experienta de chat si decide daca se foloseste contextul.", styles),
            bullet("`app/api/ai/route.ts` valideaza promptul, rezolva modelul si expune varianta normala sau streaming.", styles),
            bullet("`app/lib/chatUtils/aiRequest.ts` centralizeaza integrarea OpenRouter si logica de fallback pe chei API.", styles),
            bullet("`app/api/compress/route.ts` reduce contextul conversatiei cu un model separat, ca promptul final sa ramana relevant.", styles),
            bullet("`app/lib/database/firebase.ts` salveaza raspunsuri si chei API in Firebase Realtime Database.", styles),
        ]
    )

    story.append(Paragraph("4. Functionalitati secundare", styles["Section"]))
    story.extend(
        [
            bullet("Pagina de notes asculta in timp real colectia `responses` si afiseaza notitele salvate.", styles),
            bullet("Pagina `generateAPI` cere o parola din env, apoi genereaza o cheie noua prin `/api/generate-key`.", styles),
            bullet("Endpoint-ul public `/api/v1/chat` valideaza cheia Bearer in Firebase si permite acces extern la chat.", styles),
        ]
    )

    story.append(Paragraph("5. Observatii tehnice", styles["Section"]))
    story.extend(
        [
            bullet("Arhitectura separa destul de clar UI-ul, utilitarele de chat si endpoint-urile server-side.", styles),
            bullet("Rezistenta la erori vine in special din retry-ul clientului si din fallback-ul pe mai multe chei OpenRouter.", styles),
            bullet("Aplicatia depinde de variabilele de mediu pentru modelele active, Firebase si protectia generatorului de chei.", styles),
        ]
    )

    doc.build(story)


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT_FILE)
