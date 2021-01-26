import { Sequelize } from 'sequelize';
import { Proxy, ProxyOptionsThunk } from './proxy';

export function injectProxy(sequelize: Sequelize, optionsThunk?: ProxyOptionsThunk) {
  for (const [name, model] of Object.entries(sequelize.models)) {
    // @ts-ignore
    model.proxy = new Proxy(model, optionsThunk);
  }
}
