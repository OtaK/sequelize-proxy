import { Sequelize, ModelType, ModelCtor } from 'sequelize';
import { Proxy } from './proxy'
import { ProxyModel } from './model'

function proxyModel(model: ModelType): ModelCtor<ProxyModel> {
  class CustomProxyModel extends model {}
  CustomProxyModel.prototype = Object.assign(CustomProxyModel.prototype, ProxyModel.prototype);
  Object.defineProperty(CustomProxyModel, 'name', { value: model.name });
  // @ts-ignore
  CustomProxyModel.proxy = new Proxy(CustomProxyModel);
  return CustomProxyModel as ModelCtor<ProxyModel>;
}

export function createModels(
  sequelize: Sequelize,
): {
  [key: string]: ModelCtor<ProxyModel>;
} {
  const models: {
    [key: string]: ModelCtor<ProxyModel>;
  } = {};
  for (const [name, model] of Object.entries(sequelize.models)) {
    models[name] = proxyModel(model);
  }
  for (const [_name, model] of Object.entries(models)) {
    for (const [_asname, association] of Object.entries(model.associations)) {
      association.source = models[association.source.name];
      association.target = models[association.target.name];
    }
  }
  return models;
}
