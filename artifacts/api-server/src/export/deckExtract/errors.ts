// User-visible, non-bug failures raised by the extraction stages. The
// pipeline shell turns these into an honest failed-job message verbatim.

export class DeckExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckExtractionError";
  }
}
