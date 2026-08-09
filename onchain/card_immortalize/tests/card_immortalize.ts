import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CardImmortalize } from "../target/types/card_immortalize";

describe("card_immortalize", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.cardImmortalize as Program<CardImmortalize>;

  it("program is loaded", async () => {
    console.log("program id", program.programId.toBase58());
  });
});
