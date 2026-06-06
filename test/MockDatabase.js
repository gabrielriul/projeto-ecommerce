const { ObjectId } = require('mongodb');

/**
 * Banco de dados simulado (em memória) com a mesma interface usada pela
 * biblioteca do Projeto 1. Permite testar a API sem um MongoDB real.
 */
function corresponde(doc, filtro) {
  return Object.entries(filtro).every(([chave, cond]) => {
    const valor = doc[chave];
    if (cond instanceof ObjectId) return valor instanceof ObjectId && cond.equals(valor);
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('$regex' in cond) {
        const re = new RegExp(cond.$regex, cond.$options || '');
        return typeof valor === 'string' && re.test(valor);
      }
      let ok = true;
      if ('$gte' in cond) ok = ok && valor >= cond.$gte;
      if ('$lte' in cond) ok = ok && valor <= cond.$lte;
      return ok;
    }
    return valor === cond;
  });
}

class MockColecao {
  constructor(nome) {
    this.nome = nome;
    this.docs = [];
    this.indicesUnicos = [];
  }
  async createIndex(spec, opts) {
    if (opts && opts.unique) this.indicesUnicos.push(Object.keys(spec)[0]);
  }
  async insertOne(doc) {
    for (const campo of this.indicesUnicos) {
      if (this.docs.some((d) => d[campo] === doc[campo])) {
        const erro = new Error(`E11000 duplicate key error collection: ${this.nome} index: ${campo}_1`);
        erro.code = 11000;
        throw erro;
      }
    }
    const _id = new ObjectId();
    this.docs.push({ _id, ...doc });
    return { insertedId: _id };
  }
  async findOne(filtro) {
    return this.docs.find((d) => corresponde(d, filtro)) || null;
  }
  find(filtro = {}) {
    let resultado = this.docs.filter((d) => corresponde(d, filtro));
    const cursor = {
      sort(spec) {
        const [campo, dir] = Object.entries(spec)[0];
        resultado = [...resultado].sort((a, b) =>
          a[campo] > b[campo] ? dir : a[campo] < b[campo] ? -dir : 0
        );
        return cursor;
      },
      async toArray() {
        return resultado;
      },
    };
    return cursor;
  }
  async updateOne(filtro, update) {
    const doc = this.docs.find((d) => corresponde(d, filtro));
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };
    Object.assign(doc, update.$set);
    return { matchedCount: 1, modifiedCount: 1 };
  }
  async deleteOne(filtro) {
    const i = this.docs.findIndex((d) => corresponde(d, filtro));
    if (i === -1) return { deletedCount: 0 };
    this.docs.splice(i, 1);
    return { deletedCount: 1 };
  }
  async deleteMany() {
    const n = this.docs.length;
    this.docs = [];
    return { deletedCount: n };
  }
}

class MockDatabase {
  constructor() {
    this.colecoes = new Map();
    this.nomeBanco = 'mock';
    this.getColecao('usuarios').createIndex({ email: 1 }, { unique: true });
  }
  getColecao(nome) {
    if (!this.colecoes.has(nome)) this.colecoes.set(nome, new MockColecao(nome));
    return this.colecoes.get(nome);
  }
  async conectar() {}
  async desconectar() {}
}

module.exports = MockDatabase;
