// modules/handout/HandoutDocument.tsx
//
// The part's PDF, laid out as a small bilingual book: the comic as a
// full-bleed first page, then the text with the part's words picked out and
// its translation beside it (English left, Russian right), then the grammar
// and a glossary.
//
// @react-pdf/renderer is heavy, so this file is only ever loaded by the
// dynamic import in downloadHandout.ts, never from a page's own bundle.
import { Document, Image, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { HANDOUT_FONT } from "./fonts";
import type { HandoutModel, HandoutParagraph, NumberedWord } from "./handoutModel";

const INK = "#0f151c";
const DIM = "#5b6b7a";
const MUTED = "#9aa8b5";
const LINE = "#e0e7ed";
const LINE_STRONG = "#c8d3dc";

const base = StyleSheet.create({
  page: { fontFamily: HANDOUT_FONT, fontSize: 11, color: INK, paddingTop: 64, paddingBottom: 56, paddingHorizontal: 44 },
  kicker: { fontSize: 7.5, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: MUTED,
  },
});

/** The white milk drop with a dark outline (components/Brand/BrandMark.tsx, `drop`). */
const Drop = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 2C8.2 7.4 4.9 11.6 4.9 14.6a7.1 7.1 0 0 0 14.2 0C19.1 11.6 15.8 7.4 12 2Z"
      fill="#ffffff"
      stroke={INK}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  </Svg>
);

const Brand = () => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
    <Drop size={13} />
    <Text style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.2 }}>малако</Text>
  </View>
);

const partLine = (m: HandoutModel) => `${m.storyTitle} · ${m.labels.part} ${m.partNumber}/${m.totalParts}`;

const Footer = ({ m }: { m: HandoutModel }) => (
  <View style={base.footer} fixed>
    <Text>{m.labels.site}</Text>
    <Text>{partLine(m)}</Text>
    <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
  </View>
);

const SectionTitle = ({ children, m, first }: { children: string; m: HandoutModel; first?: boolean }) => (
  <View style={{ marginTop: first ? 0 : 26, marginBottom: 12 }} minPresenceAhead={60}>
    <Text style={[base.kicker, { color: m.palette.ink }]}>{children}</Text>
    <View style={{ height: 2, width: 28, backgroundColor: m.palette.accent, marginTop: 5 }} />
  </View>
);

/** The paragraph's runs, each of the part's words on a tint with its glossary number. */
const Runs = ({ p, m }: { p: HandoutParagraph; m: HandoutModel }) => (
  <>
    {p.runs.map((run, i) =>
      run.word === undefined ? (
        <Text key={i}>{run.text}</Text>
      ) : (
        <Text key={i} style={{ backgroundColor: m.palette.tint, color: m.palette.ink, fontWeight: 700 }}>
          {run.text}
          <Text style={{ fontSize: 6.5, fontWeight: 800, color: m.palette.accent }}>
            {/* A no-break space keeps the number on its word's line. */}
            {`\u00a0${run.word}`}
          </Text>
        </Text>
      ),
    )}
  </>
);

const GrammarList = ({ m }: { m: HandoutModel }) => (
  <View style={{ gap: 7 }}>
    {m.grammar.map((g, i) => (
      <View key={i} style={{ flexDirection: "row", gap: 7, alignItems: "flex-start" }} wrap={false}>
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: m.palette.accent,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 0.5,
          }}
        >
          <Text style={{ fontSize: 7, fontWeight: 800, color: "#ffffff" }}>{i + 1}</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 9.5, lineHeight: 1.45 }}>{g}</Text>
      </View>
    ))}
  </View>
);

const Glossary = ({ words, m }: { words: NumberedWord[]; m: HandoutModel }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 24 }}>
    {words.map((w) => (
      <View
        key={w.n}
        wrap={false}
        style={{
          width: 241,
          flexDirection: "row",
          alignItems: "flex-end",
          paddingVertical: 4.5,
          borderBottomWidth: 0.5,
          borderBottomColor: LINE,
        }}
      >
        <Text style={{ width: 16, fontSize: 7, fontWeight: 800, color: m.palette.accent }}>{w.n}</Text>
        <Text style={{ fontSize: 10, fontWeight: 700 }}>{w.en}</Text>
        <Text style={{ flex: 1, fontSize: 9.5, color: DIM, textAlign: "right" }}>{w.ru}</Text>
      </View>
    ))}
  </View>
);

/** The comic full-bleed, with the brand and the part's title card laid over it. */
const Cover = ({ m }: { m: HandoutModel }) => (
  <Page size="A4" style={{ fontFamily: HANDOUT_FONT, backgroundColor: INK }}>
    {m.comicUrl ? (
      <Image src={m.comicUrl} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, objectFit: "cover" }} />
    ) : null}
    <View style={{ position: "absolute", top: 30, left: 32, backgroundColor: "#ffffff", borderRadius: 4, paddingVertical: 5, paddingHorizontal: 8 }}>
      <Brand />
    </View>
    <View
      style={{
        position: "absolute",
        left: 32,
        right: 32,
        bottom: 32,
        backgroundColor: "#ffffff",
        borderRadius: 6,
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderTopWidth: 3,
        borderTopColor: m.palette.accent,
      }}
    >
      <Text style={[base.kicker, { color: m.palette.ink }]}>
        {`${partLine(m)} · ${m.labels.level} ${m.labels.fat}`}
      </Text>
      <Text style={{ fontSize: 26, fontWeight: 800, color: INK, marginTop: 5, letterSpacing: -0.5 }}>{m.partTitle}</Text>
      {m.description ? (
        <Text style={{ fontSize: 9.5, color: DIM, lineHeight: 1.45, marginTop: 5 }}>{m.description}</Text>
      ) : null}
    </View>
  </Page>
);

const Reader = ({ m }: { m: HandoutModel }) => (
  <Page size="A4" style={base.page}>
    <View
      fixed
      style={{
        position: "absolute",
        top: 28,
        left: 44,
        right: 44,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingBottom: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: LINE_STRONG,
      }}
    >
      <Text style={[base.kicker, { color: DIM }]}>{m.partTitle}</Text>
      <Text style={[base.kicker, { color: m.palette.ink }]}>
        {m.hasTranslation ? `${m.labels.english} · ${m.labels.russian}` : m.labels.text}
      </Text>
    </View>

    {m.paragraphs.map((p) => (
      // A paragraph and its translation stay on one page together.
      <View key={p.n} style={{ flexDirection: "row", gap: 20, marginBottom: 12 }} wrap={!m.hasTranslation}>
        <Text style={{ flex: 1.15, fontSize: 11.5, lineHeight: 1.6 }}>
          <Runs p={p} m={m} />
        </Text>
        {m.hasTranslation && (
          <Text
            style={{
              flex: 1,
              fontSize: 10,
              lineHeight: 1.6,
              color: DIM,
              borderLeftWidth: 0.75,
              borderLeftColor: m.palette.tint,
              paddingLeft: 12,
            }}
          >
            {p.translation}
          </Text>
        )}
      </View>
    ))}

    <View break>
      {m.grammar.length > 0 && (
        <>
          <SectionTitle m={m} first>{m.labels.grammar}</SectionTitle>
          <GrammarList m={m} />
        </>
      )}
      {m.tip ? (
        <Text style={{ fontSize: 9.5, color: DIM, lineHeight: 1.5, marginTop: 12 }}>
          <Text style={{ fontWeight: 800, color: m.palette.ink }}>{`${m.labels.tip}: `}</Text>
          {m.tip}
        </Text>
      ) : null}
      {m.vocabulary.length > 0 && (
        <>
          <SectionTitle m={m} first={m.grammar.length === 0 && !m.tip}>{m.labels.vocabulary}</SectionTitle>
          <Glossary words={m.vocabulary} m={m} />
        </>
      )}
      {m.phrasal.length > 0 && (
        <>
          <SectionTitle m={m} first={m.grammar.length === 0 && !m.tip && m.vocabulary.length === 0}>
            {m.labels.phrasal}
          </SectionTitle>
          <Glossary words={m.phrasal} m={m} />
        </>
      )}
    </View>
    <Footer m={m} />
  </Page>
);

export function HandoutDocument({ model }: { model: HandoutModel }) {
  return (
    <Document title={`${model.storyTitle} — ${model.partTitle}`} author="малако" creator="малако.рф" language="en">
      <Cover m={model} />
      <Reader m={model} />
    </Document>
  );
}
