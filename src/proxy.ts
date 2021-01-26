import { default as DataLoader } from 'dataloader';
import { FindOptions, Identifier, IncludeOptions, ModelCtor } from 'sequelize';
import { Model, AssociationGetOptions } from 'sequelize-typescript';
import { $GetType } from './types';
import { collectAttributes, stringify } from './utils';

export type ProxyOptionsThunk = () => DataLoader.Options<any, any, any>;
export interface ProxyAssociationGetOptions extends AssociationGetOptions {
  findKey_?: string;
}

export class Proxy {
  constructor(
    private model: ModelCtor<Model>,
    private options?: ProxyOptionsThunk,
  ) {}

  private findByPkDataLoader = new DataLoader(
    async (keys: readonly { id?: Identifier; options?: Omit<FindOptions, 'where'> }[]): Promise<(Model | null)[]> => {
      const map = new Map<string, Set<Identifier>>();
      keys.forEach(({ id, options }) => {
        const opKey = stringify(options);
        if (!map.has(opKey)) map.set(opKey, new Set<Identifier>());
        const ids = map.get(opKey)!;
        if (id) ids.add(id);
      });

      const returnMap = new Map<string, Map<Identifier, Model>>();
      const promises: Promise<void>[] = [];
      map.forEach((ids, opKey) => {
        const options = JSON.parse(opKey);
        const attributes = collectAttributes(options);
        const scope = options.__scope || [];
        const mdl = scope.reduce((acc: any, cur: any) => {
          if (cur === '_unscoped_') return acc.unscoped();
          return acc.scope(cur);
        }, this.model);

        promises.push(
          mdl
            .findAll({
              attributes,
              ...options,
              where: {
                id: Array.from(ids),
              },
            })
            .then((instances: Model<any, any>[]) => {
              if (!returnMap.has(opKey)) returnMap.set(opKey, new Map<Identifier, Model>());
              const insMap = returnMap.get(opKey)!;
              instances.forEach((instance) => {
                insMap.set(instance.id, instance);
              });
            }),
        );
      });
      await Promise.all(promises);

      return keys.map(({ id, options }) => {
        if (!id) return null;
        const opKey = stringify(options);
        const insMap = returnMap.get(opKey);
        if (!insMap) return null;
        return insMap.get(id) || null;
      });
    },{
      ...this.options ? this.options() : {}
  });
  findByPk<M extends Model>(id?: Identifier, options?: Omit<FindOptions, 'where'>): Promise<M | null> {
    // @ts-ignore
    return this.findByPkDataLoader.load({ id, options });
  }

  private $getDataLoader = new DataLoader(
    async (
      keys: readonly {
        id: Identifier;
        prop: string;
        findKey: string;
        options?: ProxyAssociationGetOptions;
      }[],
    ): Promise<(Model | null | Model[])[]> => {
      const map = new Map<string, Map<string, Set<Identifier>>>();
      keys.forEach(({ id, prop, options }) => {
        if (!map.has(prop)) {
          map.set(prop, new Map<string, Set<Identifier>>());
        }
        const propMap = map.get(prop)!;
        const opKey = stringify(options);
        if (!propMap.has(opKey)) {
          propMap.set(opKey, new Set<Identifier>());
        }
        const ids = propMap.get(opKey)!;
        ids.add(id);
      });
      const returnMap = new Map<string, Map<string, Map<Identifier, Model>>>();
      const promises: Promise<void>[] = [];
      map.forEach((propMap, prop) => {
        propMap.forEach((ids, opKey) => {
          const proxyOptions: ProxyAssociationGetOptions = JSON.parse(opKey);
          const findKey = proxyOptions.findKey_ ?? "id";
          delete proxyOptions.findKey_;
          const options = proxyOptions as IncludeOptions;

          promises.push(
            this.model
              .findAll({
                attributes: [findKey],
                where: {
                  [findKey]: Array.from(ids.values()),
                },
                include: [{ ...options, association: prop, separate: false }],
              })
              .then((instances) => {
                if (!returnMap.has(prop)) {
                  returnMap.set(prop, new Map<string, Map<Identifier, Model>>());
                }
                const instancePropMap = returnMap.get(prop)!;

                if (!instancePropMap.has(opKey)) {
                  instancePropMap.set(opKey, new Map<Identifier, Model>());
                }
                const insMap = instancePropMap.get(opKey)!;
                instances.forEach((instance) => {
                  // @ts-ignore
                  insMap.set(instance[findKey], (instance as any)[prop]);
                });
              }),
          );
        });
      });
      await Promise.all(promises);

      return keys.map(({ id, prop, options }) => {
        const notfound = this.model.associations[prop].isSingleAssociation ? null : [];
        const propMap = returnMap.get(prop);
        if (!propMap) return notfound;
        const opKey = stringify(options);
        const insMap = propMap.get(opKey);
        if (!insMap) return notfound;
        return insMap.get(id) as Model;
      });
    }, {
      ...this.options ? this.options() : {}
    }
  );

  $get(id: Identifier, prop: string, options?: ProxyAssociationGetOptions): Promise<$GetType<any>> {
    // @ts-ignore
    return this.$getDataLoader.load({ id, prop, options });
  }
}
