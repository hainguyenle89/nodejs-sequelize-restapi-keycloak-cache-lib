// this class is to support caching for Class / sequelizeModel Methods:
// create, findByPk, findById, update, findAll, findOne, destroy, bulkCreate,count, max, min, sum, increment, decrement
import CachingUtils from "./CachingUtils.js";

class SequelizeClassMethodsCaching {
    constructor() {
    }

    static buildClassMethodsForCaching(cacheClient, sequelizeModel, customKey) {
        return {
            getCacheClient() {
                return cacheClient;
            },

            async create() {
                let compositeKey = {
                    'hashKey': 'findByPk',
                    'key': '',
                    'action': 'create'
                };
                let instance = await sequelizeModel.create.apply(sequelizeModel, arguments);
                await CachingUtils.saveHash(cacheClient, instance, compositeKey);
                // return CachingUtils.save(cacheClient, instance, 'id:'+instance.dataValues.id);

                // clear hashKey 'find' because a new record has been added
                await CachingUtils.clearKey(cacheClient, sequelizeModel, 'find');
                return instance;
            },

            async bulkCreate() {
                let compositeKey = {
                    'hashKey': 'findByPk',
                    'action': 'bulkCreate'
                };
                let instances = await sequelizeModel.bulkCreate.apply(sequelizeModel, arguments);
                await CachingUtils.saveHashMultiKeys(cacheClient, sequelizeModel, instances, compositeKey);
                // clear hashKey 'find' because new records has been added
                await CachingUtils.clearKey(cacheClient, sequelizeModel, 'find');
                return instances;
            },

            async findByPk(id) {
                let compositeKey = {
                    'hashKey': 'findByPk',
                    'key': id,
                    'action': 'find'
                };
                return await CachingUtils.getHash(cacheClient, sequelizeModel, compositeKey, customKey)
                    .then(instance => {
                        if (instance) {
                            return instance
                        }

                        return (sequelizeModel.findByPk || sequelizeModel.findById).apply(sequelizeModel, arguments)
                            .then(instance => { 
                                return CachingUtils.saveHash(cacheClient, instance, compositeKey, customKey)
                            })
                    })
            },

            // update(data) {
            //     return sequelizeModel.update.apply(sequelizeModel, arguments)
            //         .then(created => {
            //             return CachingUtils.destroy(cacheClient, sequelizeModel.build(data))
            //         .then(() => created)
            //     })
            // },

            async update(data) {
                if(!customKey) {
                    customKey = '';
                }
                let compositeKey = {
                    'hashKey': 'findByPk',
                    'key': '',
                    'action': 'update'
                };
                
                // update only return the updated record if we specify 
                // "returning: true" option in the sequelized Model.update() function
                let instance = await sequelizeModel.update.apply(sequelizeModel, arguments);
                // if update successfully on database
                if (instance[0] === 1) {
                    await CachingUtils.clearHashKey(cacheClient, sequelizeModel, compositeKey.hashKey, customKey);
                    await CachingUtils.clearKey(cacheClient, sequelizeModel, 'find');
                    if (instance[1])
                        return await CachingUtils.saveHash(cacheClient, sequelizeModel.build(instance[1][0].dataValues), compositeKey)
                    else
                        return instance;
                } else {
                    return instance;
                }
                //     // .then(created => {
                //     //     return CachingUtils.destroy(cacheClient, sequelizeModel.build(data))
                //     // .then(() => created)
                // })
            },

            // findAll() {
            //     return CachingUtils.getAll(cacheClient, sequelizeModel, customKey)
            //         .then(instances => {
            //             if (instances) { // any array - cache hit
            //                 // console.log(instances);
            //                 return instances
            //             }
        
            //             return sequelizeModel.findAll.apply(sequelizeModel, arguments)
            //                 .then(instances => CachingUtils.saveAll(cacheClient, sequelizeModel, instances, customKey))
            //         })
            // }

            async findAll(queryOptions) {
                let queryOptiontString = CachingUtils.stringifyQueryOptions(queryOptions);

                let compositeKey = {
                    'hashKey': 'find',
                    'key': 'findAll'+queryOptiontString,
                    'action': 'find'
                };
                
                // let instances = await CachingUtils.getAll(cacheClient, sequelizeModel, customKey);
                let instances = await CachingUtils.getHashAll(cacheClient, sequelizeModel, compositeKey);
                if (instances) { // any array - cache hit
                    // console.log(instances);
                    return instances;
                } else {
                    let instances = await sequelizeModel.findAll.apply(sequelizeModel, arguments);
                    return await CachingUtils.saveHashAll(cacheClient, sequelizeModel, instances, compositeKey);
                }
        
            },

            async findAndCountAll(queryOptions) {
                let queryOptiontString = CachingUtils.stringifyQueryOptions(queryOptions);

                let compositeKey = {
                    'hashKey': 'find',
                    'key': 'findAndCountAll'+queryOptiontString,
                    'action': 'find'
                };
                
                // let instances = await CachingUtils.getAll(cacheClient, sequelizeModel, customKey);
                let instances = await CachingUtils.getHashAll(cacheClient, sequelizeModel, compositeKey);
                if (instances) { // any array - cache hit
                    // console.log(instances);
                    return instances;
                } else {
                    let instances = await sequelizeModel.findAll.apply(sequelizeModel, arguments);
                    return await CachingUtils.saveHashAll(cacheClient, sequelizeModel, instances, compositeKey);
                }
        
            },
            
            // this findOne below does not return value when save because of the .then structure
            // findOne() {
            //     return CachingUtils.get(cacheClient, sequelizeModel, customKey)
            //         .then(instance => {
            //             if (instance) {
            //                 return instance
            //             }
        
            //             return sequelizeModel.findOne.apply(sequelizeModel, arguments)
            //                 .then(instance => {
            //                     CachingUtils.save(cacheClient, instance, customKey)
            //                 })
            //         });
            // }

            async findOne(queryOptions) {
                let queryOptiontString = CachingUtils.stringifyQueryOptions(queryOptions);
                let compositeKey = {
                    'hashKey': 'find',
                    'key': 'findOne'+queryOptiontString,
                    'action': 'find'
                };
                let instance = await CachingUtils.getHash(cacheClient, sequelizeModel, compositeKey, customKey);
                // let instance = await CachingUtils.get(cacheClient, sequelizeModel, customKey);
                if (instance) {
                    return instance;
                } else {
                    let instance = await sequelizeModel.findOne.apply(sequelizeModel, arguments);
                    return await CachingUtils.saveHash(cacheClient, instance, compositeKey, customKey)
                }
            },

            async destroy() {
                let hashKey = 'findByPk';
                if(!customKey) {
                    customKey = '';
                }
                await sequelizeModel.destroy.apply(sequelizeModel, arguments);
                return await CachingUtils.clearHashKey(cacheClient, sequelizeModel, hashKey, customKey)
                    .then(() => {
                        return CachingUtils.clearKey(cacheClient, sequelizeModel, 'find');
                    });
            },

            async clear() {
                if(!customKey) {
                    customKey = '';
                }
                return await CachingUtils.clearKey(cacheClient, sequelizeModel, customKey)
            }
        }
    }
}

export default SequelizeClassMethodsCaching;