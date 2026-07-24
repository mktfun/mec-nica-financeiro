const crmConnector = require("./connectors/crmConnector");
const seguradorasConnector = require("./connectors/seguradorasConnector");
const esignatureConnector = require("./connectors/esignatureConnector");
const hangTestConnector = require("./connectors/hangTestConnector");
const crashTestConnector = require("./connectors/crashTestConnector");

/**
 * Connector Registry (C4-DOC-002, Secao 2)
 * Decide qual conector usar para cada acao externa. Cada conector
 * e isolado, para que uma falha em um parceiro nao derrube os
 * demais (principio de isolamento de falha).
 */
const CONECTORES = {
  crm: crmConnector,
  seguradoras: seguradorasConnector,
  esignature: esignatureConnector,
  hangTest: hangTestConnector,     // uso exclusivo de teste do Sandbox
  crashTest: crashTestConnector,   // uso exclusivo de teste do Sandbox
};

function obter(nome) {
  const conector = CONECTORES[nome];
  if (!conector) {
    throw new Error(`Conector "${nome}" não registrado. Disponíveis: ${Object.keys(CONECTORES).join(", ")}`);
  }
  return conector;
}

function listar() {
  return Object.keys(CONECTORES);
}

module.exports = { obter, listar };
