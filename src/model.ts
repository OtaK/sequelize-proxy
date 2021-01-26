import { FindOptions, Identifier, NonNullFindOptions } from 'sequelize';
import { Model as OrginalModel } from 'sequelize-typescript';
import { Proxy, ProxyAssociationGetOptions } from './proxy';
import { $GetType } from './types';

export class ProxyModel<T = any, T2 = any> extends OrginalModel<T, T2> {
  static proxy: Proxy;

  public static findByPk_<M extends OrginalModel>(
    this: (new() => M) & typeof ProxyModel,
    identifier?: Identifier,
    options?: Omit<FindOptions, 'where'>,
  ): Promise<M | null>;
  public static findByPk_<M extends OrginalModel>(
    this: (new() => M) & typeof ProxyModel,
    identifier: Identifier,
    options: Omit<NonNullFindOptions, 'where'>,
  ): Promise<M>;

  public static findByPk_<M extends OrginalModel>(
    this: (new() => M) & typeof ProxyModel,
    identifier?: Identifier,
    options?: Omit<FindOptions, 'where'> | Omit<NonNullFindOptions, 'where'>,
  ): Promise<M | null> {
    return this.proxy.findByPk(identifier, options || {});
  }

  $get_<K extends keyof this>(propertyKey: K, options?: ProxyAssociationGetOptions): Promise<$GetType<this[K]>> {
    const identifier = (options?.findKey_ && options.findKey_ in this ? this.get(options?.findKey_) : this.id) as Identifier;
    return (this.constructor as typeof ProxyModel).proxy.$get(identifier, propertyKey as string, options);
  }
}
