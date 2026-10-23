// modules/handout/renderHandout.tsx
//
// The heavy half of the download: @react-pdf/renderer, the fonts and the
// document. Only downloadHandout.ts imports it, dynamically, so none of this
// reaches a page's bundle until someone asks for a PDF.
import { pdf } from "@react-pdf/renderer";
import regular from "../../assets/fonts/handout/manrope-400.ttf?url";
import bold from "../../assets/fonts/handout/manrope-700.ttf?url";
import extraBold from "../../assets/fonts/handout/manrope-800.ttf?url";
import { registerHandoutFonts } from "./fonts";
import { HandoutDocument } from "./HandoutDocument";
import type { HandoutModel } from "./handoutModel";

const FONT_URLS = { 400: regular, 700: bold, 800: extraBold } as const;

export async function renderHandout(model: HandoutModel): Promise<Blob> {
  registerHandoutFonts((weight) => FONT_URLS[weight]);
  return pdf(<HandoutDocument model={model} />).toBlob();
}
