import "server-only";
/**
 * The certificate PDF (@react-pdf/renderer, rendered on the server: no headless browser). A4
 * landscape on navy, the logo drawn from its own geometry, IBM Plex Sans (OFL, vendored for link
 * previews). Static brand colours, like the logo files, since a PDF can't read CSS tokens.
 */
import path from "node:path";
import { Circle, Document, Font, Page, Path, renderToBuffer, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { BRAND, connectorPath, HUB, MARK_STROKE, NODE_R, NODES, SHIELD_PATH } from "@/components/brand/geometry";
import { SITE_NAME } from "@/lib/site";
import { formatCertificateDate, verificationUrl } from "./certificates";

// Literal paths, so the bundler includes exactly these files.
Font.register({
  family: "Plex",
  fonts: [
    { src: path.join(process.cwd(), "assets/og-fonts/ibm-plex-sans-latin-400-normal.woff"), fontWeight: 400 },
    { src: path.join(process.cwd(), "assets/og-fonts/ibm-plex-sans-latin-600-normal.woff"), fontWeight: 600 },
  ],
});
// Names never break mid-word.
Font.registerHyphenationCallback((word) => [word]);

const INK = "#E6EEF9";
const MUTED = "#A3B6D2";
const LINE = "#1C3A66";

const s = StyleSheet.create({
  page: { backgroundColor: BRAND.navy, padding: 36, fontFamily: "Plex", color: INK },
  frame: { flexGrow: 1, borderWidth: 1.5, borderColor: BRAND.cyan, borderRadius: 14, padding: 40, justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center" },
  brandName: { fontSize: 20, fontWeight: 600, marginLeft: 12 },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: MUTED, textTransform: "uppercase" },
  name: { fontSize: 40, fontWeight: 600, marginTop: 14 },
  line: { fontSize: 15, color: MUTED, marginTop: 14 },
  course: { fontSize: 26, fontWeight: 600, color: BRAND.cyan, marginTop: 6 },
  footer: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 14 },
  label: { fontSize: 9, letterSpacing: 1.5, color: MUTED, textTransform: "uppercase" },
  value: { fontSize: 12, marginTop: 3 },
});

function Mark() {
  return (
    <Svg viewBox="0 0 64 64" style={{ width: 44, height: 44 }}>
      <Path d={SHIELD_PATH} stroke={BRAND.cyan} strokeWidth={MARK_STROKE} fill="none" />
      {NODES.map((n) => (
        <Path key={`${n.x}-${n.y}`} d={connectorPath(n)} stroke={BRAND.cyan} strokeWidth={MARK_STROKE} />
      ))}
      <Circle cx={HUB.x} cy={HUB.y} r={HUB.r} fill={BRAND.cyan} />
      {NODES.map((n) => (
        <Circle key={`n${n.x}-${n.y}`} cx={n.x} cy={n.y} r={NODE_R} fill={BRAND.cyan} />
      ))}
    </Svg>
  );
}

export interface CertificatePdfData {
  id: string;
  name: string;
  courseTitle: string;
  completedOn: string;
}

function CertificateDocument({ cert }: { cert: CertificatePdfData }) {
  return (
    <Document title={`${cert.courseTitle}: certificate of completion`} author={SITE_NAME} creator={SITE_NAME} producer={SITE_NAME}>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.frame}>
          <View style={s.brand}>
            <Mark />
            <Text style={s.brandName}>{SITE_NAME}</Text>
          </View>
          <View>
            <Text style={s.eyebrow}>Certificate of completion</Text>
            <Text style={s.name}>{cert.name}</Text>
            <Text style={s.line}>has completed the course</Text>
            <Text style={s.course}>{cert.courseTitle}</Text>
          </View>
          <View style={s.footer}>
            <View>
              <Text style={s.label}>Completed</Text>
              <Text style={s.value}>{formatCertificateDate(cert.completedOn)}</Text>
            </View>
            <View>
              <Text style={s.label}>Certificate ID</Text>
              <Text style={s.value}>{cert.id}</Text>
            </View>
            <View>
              <Text style={s.label}>Check it at</Text>
              <Text style={s.value}>{verificationUrl(cert.id).replace(/^https:\/\//, "")}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function renderCertificatePdf(cert: CertificatePdfData): Promise<Buffer> {
  return renderToBuffer(<CertificateDocument cert={cert} />);
}
