import "server-only";
import dns from "node:dns/promises";
import net from "node:net";

const MAX_ENDPOINT_LEN = 400;

export async function safeHttpAgentEndpoint(raw: string): Promise<string | null> {
  const value = raw.trim().slice(0, MAX_ENDPOINT_LEN);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  // BYO agents are server-fetched, so require a public HTTPS origin. This blocks
  // metadata endpoints, localhost, VPC hosts, and downgrade/plaintext SSRF.
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname || url.hostname.length > 253) return null;

  const host = stripBrackets(url.hostname);
  const literal = net.isIP(host);
  const addresses = literal ? [host] : (await dns.lookup(host, { all: true, verbatim: true }).then((r) => r.map((a) => a.address)).catch(() => []));
  if (!addresses.length) return null;
  if (addresses.some(isPrivateAddress)) return null;

  url.hash = "";
  return url.toString();
}

function stripBrackets(host: string) {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function isPrivateAddress(addr: string) {
  if (addr.startsWith("::ffff:")) return isPrivateAddress(addr.slice(7));
  const family = net.isIP(addr);
  if (family === 4) return isPrivateV4(addr);
  if (family === 6) return isPrivateV6(addr);
  return true;
}

function isPrivateV4(addr: string) {
  const p = addr.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateV6(addr: string) {
  const h = addr.toLowerCase();
  return h === "::1" || h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80:") || h.startsWith("ff");
}
