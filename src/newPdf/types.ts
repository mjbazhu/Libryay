export type PdfTask =
  | {
      type: 'html';
      content: string;
      output: string;
    }
  | {
      type: 'url';
      content: string;
      output: string;
    };
