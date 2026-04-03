export type ResponseCalloutTone =
    | "important"
    | "warning"
    | "note"
    | "recommendation"
    | "next-step";

export type ResponseBlock =
    | {
          type: "lead";
          content: string;
      }
    | {
          type: "heading";
          level: number;
          text: string;
      }
    | {
          type: "steps";
          items: string[];
      }
    | {
          type: "key-points";
          items: string[];
      }
    | {
          type: "callout";
          tone: ResponseCalloutTone;
          title: string;
          content: string;
      }
    | {
          type: "code";
          language: string | null;
          content: string;
      }
    | {
          type: "table";
          content: string;
      }
    | {
          type: "quote";
          content: string;
      }
    | {
          type: "markdown";
          content: string;
      };
