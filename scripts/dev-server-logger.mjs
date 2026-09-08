import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const logsDir = path.join(projectRoot, "logs");

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const serverLogPath = path.join(logsDir, "server.log");
const errorLogPath = path.join(logsDir, "error.log");
const auditLogPath = path.join(logsDir, "audit.jsonl");
const sessionSummaryPath = path.join(logsDir, "session-summary.json");

// Create write streams (append mode)
const serverLogStream = fs.createWriteStream(serverLogPath, { flags: "a" });
const errorLogStream = fs.createWriteStream(errorLogPath, { flags: "a" });
const auditLogStream = fs.createWriteStream(auditLogPath, { flags: "a" });

// Regex to strip ANSI escape codes for clean disk logging
const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
function stripAnsi(str) {
  return typeof str === "string" ? str.replace(ansiRegex, "") : str;
}

// Track session statistics
const sessionStats = {
  sessionId: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  startTime: new Date().toISOString(),
  port: 8080,
  host: "localhost",
  pid: null,
  totalLinesLogged: 0,
  errorCount: 0,
  warningCount: 0,
  status: "STARTING",
  lastActive: new Date().toISOString(),
};

function updateSessionSummary() {
  try {
    sessionStats.lastActive = new Date().toISOString();
    fs.writeFileSync(sessionSummaryPath, JSON.stringify(sessionStats, null, 2), "utf8");
  } catch (err) {
    // ignore write errors during shutdown
  }
}

function writeAuditEntry(level, source, message, data = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    sessionId: sessionStats.sessionId,
    timestamp,
    level,
    source,
    message: stripAnsi(message).trim(),
    ...data,
  };
  auditLogStream.write(JSON.stringify(entry) + "\n");
}

function isBenignSourcemapWarning(text) {
  return (
    typeof text === "string" &&
    text.includes("Failed to load source map") &&
    (text.includes("@tanstack") || text.includes("node_modules"))
  );
}

function logToFiles(rawChunk, isStderr = false, isSuppressedBenign = false) {
  const text = rawChunk.toString();
  const cleanText = stripAnsi(text);
  const now = new Date().toISOString();
  const lines = cleanText.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    sessionStats.totalLinesLogged++;
    const formattedLine = `[${now}] ${line}\n`;
    serverLogStream.write(formattedLine);

    if (isSuppressedBenign || isBenignSourcemapWarning(line)) {
      sessionStats.warningCount++;
      writeAuditEntry("DEBUG", isStderr ? "stderr" : "stdout", line);
      continue;
    }

    const isInformativeNotice =
      line.includes("vite-tsconfig-paths") ||
      line.includes("tsconfig paths resolution");

    const isErrorOrWarn =
      isStderr ||
      /error|exception|fail|unhandled|fatal|syntaxerror|typeerror|referenceerror/i.test(line);
    const isWarning = /warn|warning|deprecat/i.test(line) || isInformativeNotice;

    if (isErrorOrWarn && !isWarning) {
      sessionStats.errorCount++;
      errorLogStream.write(`[ERROR] [${now}] ${line}\n`);
      writeAuditEntry("ERROR", isStderr ? "stderr" : "stdout", line);
    } else if (isWarning) {
      sessionStats.warningCount++;
      errorLogStream.write(`[WARN]  [${now}] ${line}\n`);
      writeAuditEntry("WARN", isStderr ? "stderr" : "stdout", line);
    }
  }

  updateSessionSummary();
}

console.log("===============================================================");
console.log("🚀 INICIANDO VITE DEV SERVER COM LOGS DE AUDITORIA ATIVOS");
console.log(`📂 Pasta de Logs: ${logsDir}`);
console.log(`📄 Log Completo:  ${serverLogPath}`);
console.log(`🚨 Log de Erros:  ${errorLogPath}`);
console.log(`📊 Log JSONL:     ${auditLogPath}`);
console.log(`🌐 Porta Alvo:    http://localhost:8080`);
console.log("===============================================================\n");

writeAuditEntry("INFO", "system", "Iniciando servidor de desenvolvimento Vite", {
  port: 8080,
  host: "localhost",
  nodeVersion: process.version,
});

const viteBin = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");
const viteArgs = [viteBin, "dev", "--port", "8080", "--host", "localhost", "--strictPort"];

const child = spawn(process.execPath, viteArgs, {
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: "8080",
    HOST: "localhost",
    NODE_ENV: "development",
  },
  stdio: ["inherit", "pipe", "pipe"],
});

sessionStats.pid = child.pid;
sessionStats.status = "RUNNING";
updateSessionSummary();

// Stream stdout and stderr to terminal and log files
child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  logToFiles(chunk, false);
});

child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  if (isBenignSourcemapWarning(text)) {
    logToFiles(chunk, true, true);
    return;
  }
  process.stderr.write(chunk);
  logToFiles(chunk, true, false);
});

child.on("error", (err) => {
  console.error("❌ Falha ao iniciar processo do Vite:", err);
  logToFiles(Buffer.from(`Process error: ${err.stack || err.message}`), true);
  sessionStats.status = "ERROR";
  updateSessionSummary();
});

child.on("close", (code, signal) => {
  sessionStats.status = code === 0 ? "STOPPED" : "FAILED";
  updateSessionSummary();
  const exitMsg = `Servidor finalizado com código ${code} e sinal ${signal}`;
  console.log(`\n[${new Date().toISOString()}] ${exitMsg}`);
  writeAuditEntry(code === 0 ? "INFO" : "ERROR", "system", exitMsg, { code, signal });

  serverLogStream.end();
  errorLogStream.end();
  auditLogStream.end();
  process.exit(code ?? 0);
});

// Handle graceful termination
function handleExit(signal) {
  console.log(`\nRecebido sinal de encerramento ${signal}, finalizando servidor Vite...`);
  writeAuditEntry("INFO", "system", `Recebido sinal ${signal}`);
  if (child && !child.killed) {
    if (process.platform === "win32" && child.pid) {
      spawn("taskkill", ["/pid", child.pid.toString(), "/f", "/t"]);
    } else {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", () => handleExit("SIGINT"));
process.on("SIGTERM", () => handleExit("SIGTERM"));
