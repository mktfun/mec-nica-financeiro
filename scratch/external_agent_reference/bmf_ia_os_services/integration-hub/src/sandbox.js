const { fork } = require("child_process");
const path = require("path");

/**
 * Plugin Runtime / Sandbox (EA-DOC-002, Secao 8)
 * Executa a chamada de um conector em um processo separado, com
 * limite de tempo. Um conector que trava ou lanca uma excecao nao
 * derruba o Integration Hub -- apenas aquela chamada falha.
 */

const TIMEOUT_PADRAO_MS = Number(process.env.SANDBOX_TIMEOUT_MS) || 10_000;

class SandboxTimeoutError extends Error {
  constructor(nomeConector) {
    super(`Conector "${nomeConector}" excedeu o tempo limite do sandbox e foi encerrado.`);
    this.name = "SandboxTimeoutError";
  }
}

class SandboxCrashError extends Error {
  constructor(nomeConector, motivo) {
    super(`Conector "${nomeConector}" travou dentro do sandbox: ${motivo}`);
    this.name = "SandboxCrashError";
  }
}

function executarIsolado(nomeConector, connectorPath, acao, payload, timeoutMs = TIMEOUT_PADRAO_MS) {
  return new Promise((resolve, reject) => {
    const filho = fork(path.join(__dirname, "sandboxRunner.js"), [], { stdio: "pipe" });
    let finalizado = false;

    const timer = setTimeout(() => {
      if (finalizado) return;
      finalizado = true;
      filho.kill("SIGKILL");
      reject(new SandboxTimeoutError(nomeConector));
    }, timeoutMs);

    filho.on("message", (msg) => {
      if (finalizado) return;
      finalizado = true;
      clearTimeout(timer);
      filho.kill();
      if (msg.ok) resolve(msg.resultado);
      else reject(new SandboxCrashError(nomeConector, msg.erro));
    });

    filho.on("exit", (code) => {
      if (finalizado) return;
      finalizado = true;
      clearTimeout(timer);
      reject(new SandboxCrashError(nomeConector, `processo encerrado inesperadamente (codigo ${code})`));
    });

    filho.on("error", (err) => {
      if (finalizado) return;
      finalizado = true;
      clearTimeout(timer);
      reject(new SandboxCrashError(nomeConector, err.message));
    });

    filho.send({ connectorPath, acao, payload });
  });
}

module.exports = { executarIsolado, SandboxTimeoutError, SandboxCrashError };
