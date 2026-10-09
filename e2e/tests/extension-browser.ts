import { connect, createServer, type Socket } from "node:net";
import { fileURLToPath } from "node:url";
import { type BrowserContext, chromium, firefox, type Page, type TestInfo } from "@playwright/test";

const CHROME_BUILD = fileURLToPath(new URL("../../apps/extension/dist", import.meta.url));
const FIREFOX_BUILD = fileURLToPath(new URL("../../apps/extension/dist-firefox", import.meta.url));
const FIREFOX_ID = "anchor@clamly.app";
// Firefox gives every installation a random UUID; a fixed one lets tests open the extension's pages.
const FIREFOX_UUID = "5b7e7c55-0c1a-4b4e-9b1e-c1a4a7c4a7c4";

export interface ExtensionSession {
  context: BrowserContext;
  /** Opens the extension's popup in a tab. Its page can also call the extension APIs. */
  openPopup(): Promise<Page>;
  close(): Promise<void>;
}

/**
 * Starts the current project's browser with the built extension installed (run
 * `pnpm build:extension` first). Playwright's Chromium and Microsoft Edge load it
 * through the DevTools protocol, because Chrome and Edge no longer accept
 * --load-extension. Firefox installs it as a temporary add-on through its remote
 * debugging protocol, as web-ext does.
 */
export async function launchWithExtension(testInfo: TestInfo): Promise<ExtensionSession> {
  const { browserName, channel } = testInfo.project.use;
  const profile = testInfo.outputPath("profile");

  if (browserName === "firefox") {
    const port = await freePort();
    const context = await firefox.launchPersistentContext(profile, {
      args: ["-start-debugger-server", String(port)],
      firefoxUserPrefs: {
        "devtools.debugger.remote-enabled": true,
        "devtools.debugger.prompt-connection": false,
        "devtools.chrome.enabled": true,
        "extensions.webextensions.uuids": JSON.stringify({ [FIREFOX_ID]: FIREFOX_UUID })
      }
    });
    try {
      await installTemporaryAddon(port, FIREFOX_BUILD);
    } catch (error) {
      await context.close();
      throw error;
    }
    return session(context, `moz-extension://${FIREFOX_UUID}`);
  }

  const context = await chromium.launchPersistentContext(profile, {
    // "chromium" runs Playwright's full Chromium, which supports extensions headless.
    channel: channel ?? "chromium",
    args: ["--enable-unsafe-extension-debugging"],
    ignoreDefaultArgs: ["--disable-extensions"]
  });
  try {
    const browser = context.browser();
    if (!browser) throw new Error("The persistent context has no browser to install the extension into.");
    const cdp = await browser.newBrowserCDPSession();
    const { id } = await cdp.send("Extensions.loadUnpacked", { path: CHROME_BUILD });
    await cdp.detach();
    return session(context, `chrome-extension://${id}`);
  } catch (error) {
    await context.close();
    throw error;
  }
}

function session(context: BrowserContext, origin: string): ExtensionSession {
  return {
    context,
    async openPopup() {
      const page = await context.newPage();
      await page.goto(`${origin}/popup.html`);
      return page;
    },
    close: () => context.close()
  };
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => (address && typeof address === "object" ? resolve(address.port) : reject(new Error("No free port"))));
    });
  });
}

type Packet = { from?: string; error?: string; message?: string; [key: string]: unknown };

async function installTemporaryAddon(port: number, path: string): Promise<void> {
  const socket = await connectWithRetry(port);
  try {
    const rdp = new RemoteDebuggingClient(socket);
    await rdp.receive("root"); // The server introduces itself first.
    const root = await rdp.request("root", { type: "getRoot" });
    const reply = await rdp.request(String(root["addonsActor"]), { type: "installTemporaryAddon", addonPath: path, openDevTools: false });
    if (reply.error) throw new Error(`Firefox did not install the add-on: ${reply.error} ${reply.message ?? ""}`);
  } finally {
    socket.destroy();
  }
}

async function connectWithRetry(port: number): Promise<Socket> {
  const deadline = Date.now() + 10_000;
  for (;;) {
    try {
      return await new Promise<Socket>((resolve, reject) => {
        const socket = connect(port, "127.0.0.1", () => resolve(socket));
        socket.once("error", reject);
      });
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

/** A minimal client for Firefox's remote debugging protocol: packets are "<byte length>:<JSON>". */
class RemoteDebuggingClient {
  private buffer = Buffer.alloc(0);
  private readonly received: Packet[] = [];
  private readonly waiting: { from: string; resolve: (packet: Packet) => void; reject: (error: Error) => void }[] = [];

  constructor(private readonly socket: Socket) {
    socket.on("data", (chunk: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.drain();
    });
    socket.on("error", (error) => {
      for (const waiter of this.waiting.splice(0)) waiter.reject(error);
    });
  }

  request(to: string, message: Record<string, unknown>): Promise<Packet> {
    const json = JSON.stringify({ to, ...message });
    this.socket.write(`${Buffer.byteLength(json)}:${json}`);
    return this.receive(to);
  }

  receive(from: string): Promise<Packet> {
    const index = this.received.findIndex((packet) => packet.from === from);
    if (index >= 0) return Promise.resolve(this.received.splice(index, 1)[0] as Packet);
    return new Promise((resolve, reject) => this.waiting.push({ from, resolve, reject }));
  }

  private drain(): void {
    for (;;) {
      const colon = this.buffer.indexOf(":");
      if (colon < 0) return;
      const length = Number(this.buffer.subarray(0, colon).toString());
      if (this.buffer.length < colon + 1 + length) return;
      const packet = JSON.parse(this.buffer.subarray(colon + 1, colon + 1 + length).toString()) as Packet;
      this.buffer = this.buffer.subarray(colon + 1 + length);
      const index = this.waiting.findIndex((waiter) => waiter.from === packet.from);
      if (index >= 0) this.waiting.splice(index, 1)[0]?.resolve(packet);
      else this.received.push(packet);
    }
  }
}
