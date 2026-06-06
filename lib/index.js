/**
 * Projeto 1 - EC48B - Programação Web Back-End (UTFPR-CP)
 *
 * Biblioteca de classes de acesso a SGBD (MongoDB) com temática de
 * e-commerce. Ponto de entrada que exporta todas as classes públicas.
 */
const Database = require('./config/Database');
const Usuario = require('./models/Usuario');
const Produto = require('./models/Produto');
const Pedido = require('./models/Pedido');
const Logger = require('./utils/Logger');
const Validator = require('./utils/Validator');
const ValidationError = require('./errors/ValidationError');
const NotFoundError = require('./errors/NotFoundError');
const DatabaseError = require('./errors/DatabaseError');

module.exports = {
  Database,
  Usuario,
  Produto,
  Pedido,
  Logger,
  Validator,
  ValidationError,
  NotFoundError,
  DatabaseError,
};
