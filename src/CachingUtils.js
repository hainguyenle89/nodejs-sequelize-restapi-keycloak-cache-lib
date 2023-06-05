class CachingUtils {
  constructor() {

  }

  // desymbolize the symbols on sequelize query (option) so that we can JSON stringify the symbol
  // BUT There are a couple ISSUES with this FUNCTION. The first is that typeof null is "object". The second is that it does not handle object reference cycles.
  static desymbolize(object) {
    if (Array.isArray(object)) {
      return object.map(CachingUtils.desymbolize);
    } else if (typeof object != "object") {
      return object;
    } else {
      let d = Object.assign(Object.create(Object.getPrototypeOf(object)), object);
      Object.getOwnPropertySymbols(object).forEach(k => {
        d[`<${Symbol.keyFor(k)}>`] = object[k];
        delete d[k];
      });
      Object.keys(d).forEach(k => d[k] = CachingUtils.desymbolize(d[k]));
      return d;
    }
  }

  // transform QueryOptions from JSON to String
  static stringifyQueryOptions(queryOpt) {
    let queryOptString = '';
    Object.entries(queryOpt).forEach(([key, value]) => {  
        // console.log(`${key}: ${value}`);
        // if encounter "where" options, we need to desymbolize the symbol inside it
        if (key === "where") {
          queryOptString += ':'+key+JSON.stringify(CachingUtils.desymbolize(value))
        } else {
          queryOptString += ':'+key+JSON.stringify(value)
        }
    });
    return queryOptString;
  }

  static instanceToData(instance) {
    return instance.get({ plain: true })
  }
  
  static dataToInstance(model, data) {
    if (!data) {
        return data
    }
    const include = CachingUtils.generateIncludeRecurse(model)
    const instance = model.build(data, { isNewRecord: false, raw: false, include })
    CachingUtils.restoreTimestamps(data, instance)
    return instance
  }
  
  static restoreTimestamps(data, instance) {
    const timestampFields = ['createdAt', 'updatedAt', 'deletedAt']

    for (const field of timestampFields) {
        const value = data[field]
        if (value) {
            instance.setDataValue(field, new Date(value))
        }
    }

    Object.keys(data).forEach(key => {
        const value = data[key]

        if (!value) {
            return
        }

        if (Array.isArray(value)) {
            try {
                const nestedInstances = instance.get(key)
                value.forEach((nestedValue, i) => CachingUtils.restoreTimestamps(nestedValue, nestedInstances[i]))
            } catch (error) { // TODO: Fix issue with JSON and BLOB columns

            }
            return
        }

        if (typeof value === 'object') {
            try {
                const nestedInstance = instance.get(key)
                Object.values(value).forEach(nestedValue => CachingUtils.restoreTimestamps(nestedValue, nestedInstance))
            } catch (error) { // TODO: Fix issue with JSON and BLOB columns

            }
        }
    })
  }
  
  static generateIncludeRecurse(model, depth = 1) {
    if (depth > 5) {
        return []
    }
    return Object.entries(model.associations || [])
      .filter(([as, association]) => {
          const hasOptions = Object.prototype.hasOwnProperty.call(association, 'options')
          return hasOptions
      })
      .map(([as, association]) => {
          const associatedModel = model.sequelize.model(association.target.name)
          return {
              model: associatedModel,
              include: CachingUtils.generateIncludeRecurse(associatedModel, depth + 1),
              as
          }
      })
  }    

  static getInstanceModel(instance) {
    return instance.constructor
  }
    
  static getInstanceCacheKey(instance) {
    return CachingUtils.getInstanceModel(instance).primaryKeyAttributes.map(pk => instance[pk])
  }

  //caching functions
  static async save(cacheClient, instance, customKey) {
    if (!instance) {
      return Promise.resolve(instance)
    }
  
    const key = [
      CachingUtils.getInstanceModel(instance).name
    ]
  
    if (customKey) {
      key.push(customKey)
    } else {
      key.push(...CachingUtils.getInstanceCacheKey(instance))
    }
  
    // return cacheClient.set(key, CachingUtils.instanceToData(instance))
    //   .then(() => instance);
    return await cacheClient.set(key, CachingUtils.instanceToData(instance))
        .then(() => instance);
  }
    
  // set single value of a key and the hash key to a hash set
  static async saveHash(cacheClient, instance, compositeKey) {
    if (!instance) {
      return Promise.resolve(instance)
    }
    
    const hashKey = [
      compositeKey.hashKey,
      // CachingUtils.getInstanceModel(instance).name
      
    ]
  
    let key = compositeKey.key;
    // if (customKey) {
    //   // compositeKey.key.push(customKey);
    //   key = key+':'+customKey;
    // } 
    if (compositeKey.action === 'create') {
      // compositeKey.key.push(...CachingUtils.getInstanceCacheKey(instance))
      key += CachingUtils.getInstanceCacheKey(instance);
    }
  
    // return cacheClient.set(key, CachingUtils.instanceToData(instance))
    //   .then(() => instance);
    return await cacheClient.hset(hashKey, key, CachingUtils.instanceToData(instance))
        .then(() => instance);
  }

  static async saveAll(cacheClient, model, instances, customKey) {
    const key = [
      model.name,
      customKey
    ]
  
    // return cacheClient.set(key, instances.map(CachingUtils.instanceToData))
    //   .then(() => instances)
    return await cacheClient.set(key, instances.map(CachingUtils.instanceToData))
        .then(() => instances);
  }

  // set multiple key and value on a hash key to a hash set
  static async saveHashMultiKeys(cacheClient, model, instances, compositeKey) {
    if (!instances) {
      return Promise.resolve(instances)
    }
    
    const hashKey = [
      compositeKey.hashKey,
      // model.name
      
    ]
  
    // change instances array to instances object to set multiple key and value to a hash key
    let instancesObject = {};

    instances.forEach((instance) => {
      let key = CachingUtils.getInstanceCacheKey(instance);
      instancesObject[key] = JSON.stringify(instance);
    })
  
    // return cacheClient.set(key, CachingUtils.instanceToData(instance))
    //   .then(() => instance);
    return await cacheClient.hsetMultiKeys(hashKey, instancesObject)
        .then(() => instances);
  }

  // set array value of a key and the hash key to a hash set
  static async saveHashAll(cacheClient, model, instances, compositeKey) {
    const hashKey = [
      compositeKey.hashKey,
      // model.name
      
    ]
  
    // return cacheClient.set(key, instances.map(CachingUtils.instanceToData))
    //   .then(() => instances)
    return await cacheClient.hset(hashKey, compositeKey.key, instances.map(CachingUtils.instanceToData))
        .then(() => instances);
  }

  // set array value of a key and the hash key to a hash set and store Count for findAndCountAll
  static async saveHashAndCountAll(cacheClient, model, countAndInstances, compositeKey) {
    const hashKey = [
      compositeKey.hashKey,
      // model.name
      
    ]
  
    // return cacheClient.set(key, instances.map(CachingUtils.instanceToData))
    //   .then(() => instances)
    return await cacheClient.hset(hashKey, compositeKey.key, JSON.stringify(countAndInstances))
        .then(() => countAndInstances);
  }
    
  // getAll(cacheClient, model, customKey) {
  //     const key = [
  //       model.name,
  //       customKey
  //     ]
    
  //     return cacheClient.get(key).then(dataArray => {
  //       if (!dataArray) { // undefined - cache miss
  //         return dataArray
  //       }
  //       // console.log(dataArray);
  //       return dataArray.map(data => CachingUtils.dataToInstance(model, data))
  //     })
  // }

  static async getAll(cacheClient, model, customKey) {
    const key = [
      model.name,
      customKey
    ]
  
    let dataArray = await cacheClient.get(key);
    if (!dataArray) { // undefined - cache miss
      return dataArray
    }
    // console.log(dataArray);
    return dataArray.map(data => CachingUtils.dataToInstance(model, data));
  }

  // get value from a key and the hash key from a hash set
  static async getHashAll(cacheClient, model, compositeKey) {
    const hashKey = [
      // model.name,
      compositeKey.hashKey
    ]
  
    let dataArray = await cacheClient.hget(hashKey, compositeKey.key);
    if (!dataArray) { // undefined - cache miss
      return dataArray
    }
    // console.log(dataArray);
    return dataArray.map(data => CachingUtils.dataToInstance(model, data));
  }

  // get value from a key and the hash key from a hash set and Count all
  static async getHashAndCountAll(cacheClient, model, compositeKey) {
    const hashKey = [
      // model.name,
      compositeKey.hashKey
    ]
  
    let data = await cacheClient.hget(hashKey, compositeKey.key);
    if (!data) { // undefined - cache miss
      return data
    }
    // console.log(dataArray);
    return JSON.parse(data);
  }
    
  // get(cacheClient, model, customKey) {
  //     const key = [
  //       model.name,
  //       customKey
  //     ]
    
  //     return cacheClient.get(key).then(data => {
  //       return CachingUtils.dataToInstance(model, data)
  //     })
  // }
    
  static async get(cacheClient, model, customKey) {
    const key = [
      model.name,
      customKey
    ]
  
    let data = await cacheClient.get(key);
    return CachingUtils.dataToInstance(model, data);
    
  }

  // get single value from a key and the hash key from a hash set
  static async getHash(cacheClient, model, compositeKey) {
    const hashKey = [
      compositeKey.hashKey,
      // model.name
    ]

    let key = compositeKey.key;
    // if (customKey) {
    //   // compositeKey.key.push(customKey);
    //   key = key+':'+customKey;
    // }

  
    let data = await cacheClient.hget(hashKey, key);
    return CachingUtils.dataToInstance(model, data);
    
  }

  static destroy(cacheClient, instance) {
    if (!instance) {
      return Promise.resolve(instance)
    }
  
    const key = [
      CachingUtils.getInstanceModel(instance).name,
      ...CachingUtils.getInstanceCacheKey(instance)
    ]
    return cacheClient.del(key)
  }
    
  static async clearKey(cacheClient, model, customKey) {
    const key = [
      customKey,
      // model.name
    ]
    return await cacheClient.del(key)
  }

  static async clearHashKey(cacheClient, model, hashKey, customKey) {
    const hashK = [
      hashKey,
      // model.name
    ]
    return await cacheClient.hdel(hashK, customKey)
  }
}

export default CachingUtils;