"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import { useAuth } from "@/components/AuthProvider";
import API from "@/config";

const COMMANDS = ["ping", "traceroute", "tracert", "nslookup", "arp", "ipconfig", "ip"];
const COMMAND_HELP = [
  "ping <IP>",
  "traceroute <IP>",
  "tracert <IP>",
  "nslookup <hostname>",
  "arp",
  "ipconfig",
  "ip"
];
const HELP_TEXT = [
  "Net-Lens controlled terminal",
  "",
  "Allowed commands:",
  "  ping <IP>              Check whether an IPv4 host is reachable.",
  "  traceroute <IP>        Trace the route to an IPv4 host.",
  "  tracert <IP>           Windows alias for traceroute.",
  "  nslookup <hostname>    Resolve a hostname.",
  "  arp                    Display the server ARP table.",
  "  ipconfig               Display server network configuration.",
  "  ip                     Display server interface addresses.",
  "",
  "Examples:",
  "  ping 192.168.1.1",
  "  traceroute 8.8.8.8",
  "  nslookup router.local",
  "",
  "Enter ? at any time to show this help. Arguments must be valid IP addresses or hostnames."
].join("\n");

export default function TerminalPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [mode, setMode] = useState("local");
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [session, setSession] = useState(null);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const outputRef = useRef(null);

  useEffect(() => {
    if (!can("terminal:use")) return;
    Promise.all([
      API.fetch(API.routes.terminal.session, { method: "POST" }),
      API.fetch(API.routes.terminal.devices),
    ]).then(async ([sessionResponse, devicesResponse]) => {
      const sessionPayload = await sessionResponse.json();
      const devicesPayload = await devicesResponse.json();
      if (!sessionResponse.ok) throw new Error(sessionPayload.error || "Unable to create terminal session");
      if (!devicesResponse.ok) throw new Error(devicesPayload.error || "Unable to load devices");
      setSession(sessionPayload);
      setDevices(devicesPayload.devices || []);
    }).catch((loadError) => setError(loadError.message));
  }, [can]);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [history, executing]);

  function parseInput(value) {
    const tokens = value.trim().split(/\s+/);
    const command = tokens.shift()?.toLowerCase();
    if (command === "?" && tokens.length === 0) return { help: true, command };
    if (!COMMANDS.includes(command)) throw new Error(`Unknown command. Allowed: ${COMMANDS.join(", ")}`);
    const args = tokens;
    if (mode === "device" && !args.length && ["ping", "traceroute"].includes(command)) {
      const device = devices.find((item) => item.id === deviceId);
      if (!device) throw new Error("Select a device first");
      args.push(device.ip);
    }
    return { command, args };
  }

  async function runCommand(event) {
    event?.preventDefault();
    if (!input.trim() || executing) return;
    let parsed;
    try {
      parsed = parseInput(input);
    } catch (parseError) {
      setHistory((current) => [...current, { command: input, error: parseError.message }]);
      setInput("");
      return;
    }
    if (parsed.help) {
      setHistory((current) => [...current, { command: "?", output: HELP_TEXT }]);
      setHistoryIndex(-1);
      setInput("");
      return;
    }
    const commandLine = `${parsed.command}${parsed.args.length ? ` ${parsed.args.join(" ")}` : ""}`;
    setHistory((current) => [...current, { command: commandLine }]);
    setHistoryIndex(-1);
    setInput("");
    setExecuting(true);
    setError("");
    const response = await API.fetch(API.routes.terminal.execute, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session?.sessionId, command: parsed.command, args: parsed.args }),
    });
    const payload = await response.json().catch(() => ({}));
    setExecuting(false);
    if (!response.ok) {
      setHistory((current) => [...current, { error: payload.error || "Command failed" }]);
      return;
    }
    setHistory((current) => [...current, { output: payload.output, error: payload.error }]);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const commands = history.filter((entry) => entry.command).map((entry) => entry.command);
      if (!commands.length) return;
      const next = Math.max(0, historyIndex < 0 ? commands.length - 1 : historyIndex - 1);
      setHistoryIndex(next);
      setInput(commands[next]);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const commands = history.filter((entry) => entry.command).map((entry) => entry.command);
      const next = Math.min(commands.length, historyIndex + 1);
      setHistoryIndex(next);
      setInput(next === commands.length ? "" : commands[next]);
    } else if (event.key === "c" && event.ctrlKey && executing) {
      setHistory((current) => [...current, { error: "^C Command cancellation is not available for this request." }]);
    }
  }

  if (!can("terminal:use")) return <div className="min-h-screen bg-[var(--canvas)]"><Navbar /><div className="p-8 text-sm text-[var(--critical-text)]">You do not have permission to use the terminal.</div></div>;

  return <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--canvas)] text-slate-100"><Navbar /><div className="flex min-h-0 w-full flex-1 gap-6 overflow-hidden px-4 py-3 md:px-6"><Aside /><main className="flex min-h-0 min-w-0 w-full flex-1 flex-col xl:ml-[106px]"><div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-xl"><div className="flex-none border-b border-slate-700 px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">diagnostic console</p><h1 className="mt-1 text-2xl font-bold">Net-Lens Terminal</h1><p className="mt-2 text-xs text-slate-400">Allowed commands: <span className="font-mono text-teal-300">{COMMAND_HELP.join(" · ")}</span></p></div><button type="button" onClick={() => setHistory([])} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">Clear terminal</button></div><div className="mt-5 flex flex-wrap gap-3"><label className="text-xs font-semibold text-slate-400">Mode<select value={mode} onChange={(event) => setMode(event.target.value)} className="ml-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200"><option value="local">Local</option><option value="device">Device</option></select></label>{mode === "device" && <label className="text-xs font-semibold text-slate-400">Device<select value={deviceId} onChange={(event) => setDeviceId(event.target.value)} className="ml-2 max-w-xs rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200"><option value="">Select device</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.name} · {device.ip} · {device.status}</option>)}</select></label>}</div></div><div ref={outputRef} className="min-h-0 flex-1 overflow-y-auto p-5 font-mono text-sm leading-6">{history.length === 0 && <p className="text-slate-500">Controlled network diagnostics only. Try: ping 192.168.1.1</p>}{history.map((entry, index) => <div key={`${index}-${entry.command || "output"}`} className="mb-3"><p className="text-teal-300">netlens@network:~$ {entry.command || ""}</p>{entry.output && <pre className="whitespace-pre-wrap text-slate-200">{entry.output}</pre>}{entry.error && <pre className="whitespace-pre-wrap text-rose-300">{entry.error}</pre>}</div>)}{executing && <p className="text-amber-300">Executing...</p>}</div><form onSubmit={runCommand} className="flex flex-none items-center border-t border-slate-700 p-4 font-mono"><span className="mr-2 text-teal-300">netlens@network:~$</span><input autoFocus value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} disabled={executing || !session} aria-label="Terminal command" className="min-w-0 flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-600" placeholder={session ? "ping 192.168.1.1" : "Opening session..."} /></form>{error && <p className="flex-none border-t border-rose-900 bg-rose-950/40 px-5 py-3 text-sm text-rose-300">{error}</p>}</div></main></div></div>;
}
