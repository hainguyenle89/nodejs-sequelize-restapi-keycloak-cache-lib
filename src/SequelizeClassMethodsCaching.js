// this class is to support caching for Class / sequelizeModel Methods:
// create, findByPk, findById, update, findAll, findOne, destroy, bulkCreate,count, max, min, sum, increment, decrement
import CachingUtils from "./CachingUtils.js";

class SequelizeClassMethodsCaching {
    constructor() {
    }

    static buildClassMethodsForCaching(cacheClient, sequelizeModel, loggedInUserId, cid) {
        return {
            getCacheClient() {
                return cacheClient;
            },

            async create() {
                let compositeKey = {
                    'hashKey': '',
                    'key': '',
                    'action': 'create'
                };
                compositeKey['hashKey'] = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+":findByPk" : sequelizeModel.name+':findByPk';
                compositeKey['key'] = cid ? cid : '';
                let instance = await sequelizeModel.create.apply(sequelizeModel, arguments);
                await CachingUtils.saveHash(cacheClient, instance, compositeKey);
                // return CachingUtils.save(cacheClient, instance, 'id:'+instance.dataValues.id);

                // clear hashKey 'find' because a new record has been added
                let deleteKey = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+':find' : sequelizeModel.name+':find';
                await CachingUtils.clearKey(cacheClient, sequelizeModel, deleteKey);
                return instance;
            },

            async bulkCreate() {
                let compositeKey = {
                    'hashKey': '',
                    'key': '',
                    'action': 'bulkCreate'
                };
                compositeKey['hashKey'] = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+":findByPk" : sequelizeModel.name+':findByPk';
                let instances = await sequelizeModel.bulkCreate.apply(sequelizeModel, arguments);
                if(instances) {
                    await CachingUtils.saveHashMultiKeys(cacheClient, sequelizeModel, instances, compositeKey);
                    // clear hashKey 'find' because new records has been added
                    let deleteKey = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+':find' : sequelizeModel.name+':find';
                    await CachingUtils.clearKey(cacheClient, sequelizeModel, deleteKey);
                }
                return instances;
                
            },

            async findByPk(id) {
                let compositeKey = {
                    'hashKey': '',
                    'key': '',
                    'action': 'find'
                };
                compositeKey['hashKey'] = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+":findByPk" : sequelizeModel.name+':findByPk';
                compositeKey['key'] = id ? id : '';
                return await CachingUtils.getHash(cacheClient, sequelizeModel, compositeKey)
                    .then(instance => {
                        if (instance) {
                            return instance
                        }

                        return (sequelizeModel.findByPk || sequelizeModel.findById).apply(sequelizeModel, arguments)
                            .then(instance => { 
                                return CachingUtils.saveHash(cacheClient, instance, compositeKey)
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
                let compositeKey = {
                    'hashKey': '',
                    'key': '',
                    'action': 'update'
                };
                compositeKey['hashKey'] = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+":findByPk" : sequelizeModel.name+':findByPk';
                compositeKey['key'] = cid ? cid : '';
                
                // update only return the updated record if we specify 
                // "returning: true" option in the sequelized Model.update() function
                let instance = await sequelizeModel.update.apply(sequelizeModel, arguments);
                // if update successfully on database
                if (instance[0] === 1) {
                    await CachingUtils.clearHashKey(cacheClient, sequelizeModel, compositeKey.hashKey, compositeKey.key);
                    let deleteKey = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+':find' : sequelizeModel.name+':find';
                    await CachingUtils.clearKey(cacheClient, sequelizeModel, deleteKey);
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
                let queryOptiontString = queryOptions ? CachingUtils.stringifyQueryOptions(queryOptions) : '';
                let compositeKey = {
                    'hashKey': '',
                    'key': '',
                    'action': 'find'
                };
                compositeKey['hashKey'] = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+':find' : sequelizeModel.name+':find';
                compositeKey.key = 'findAll'+queryOptiontString;
                
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
                let queryOptiontString = queryOptions ? CachingUtils.stringifyQueryOptions(queryOptions) : '';

                let compositeKey = {
                    'hashKey': '',
                    'key': '',
                    'action': 'find'
                };
                compositeKey['hashKey'] = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+':find' : sequelizeModel.name+':find';
                compositeKey.key = 'findAndCountAll'+queryOptiontString;
                
                // let instances = await CachingUtils.getAll(cacheClient, sequelizeModel, customKey);
                let countAndInstances = await CachingUtils.getHashAndCountAll(cacheClient, sequelizeModel, compositeKey);
                if (countAndInstances) { // any array - cache hit
                    // console.log(instances);  
                    return countAndInstances;
                } else {
                    return await sequelizeModel.findAndCountAll.apply(sequelizeModel, arguments)
                        .then((countAndInstances) => {
                            return CachingUtils.saveHashAndCountAll(cacheClient, sequelizeModel, countAndInstances, compositeKey);
                        });
                    return 
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
                let queryOptiontString = queryOptions ? CachingUtils.stringifyQueryOptions(queryOptions) : '';
                let compositeKey = {
                    'hashKey': '',
                    'key': '',
                    'action': 'find'
                };
                compositeKey['hashKey'] = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+':find' : sequelizeModel.name+':find';
                compositeKey.key = 'findOne'+queryOptiontString;
                let instance = await CachingUtils.getHash(cacheClient, sequelizeModel, compositeKey);
                // let instance = await CachingUtils.get(cacheClient, sequelizeModel, customKey);
                if (instance) {
                    return instance;
                } else {
                    let instance = await sequelizeModel.findOne.apply(sequelizeModel, arguments);
                    return await CachingUtils.saveHash(cacheClient, instance, compositeKey)
                }
            },

            async destroy() {
                let compositeKey = {
                    'hashKey': '',
                    'key': '',
                    'action': 'find'
                };
                compositeKey['hashKey'] = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+':findByPk' : sequelizeModel.name+':findByPk';
                compositeKey['key'] = cid ? cid : '';
                await sequelizeModel.destroy.apply(sequelizeModel, arguments);
                let deleteKey = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+':find' : sequelizeModel.name+':find';
                if (compositeKey['key'] === '') {
                    return await CachingUtils.clearKey(cacheClient, sequelizeModel, compositeKey.hashKey)
                        .then(() => {
                            return CachingUtils.clearKey(cacheClient, sequelizeModel, deleteKey);
                        });
                } else {
                    return await CachingUtils.clearHashKey(cacheClient, sequelizeModel, compositeKey.hashKey, compositeKey.key)
                        .then(() => {
                            return CachingUtils.clearKey(cacheClient, sequelizeModel, deleteKey);
                        });
                }
            },

            async clear() {
                let deleteKey = loggedInUserId ? loggedInUserId+":"+sequelizeModel.name+':find' : sequelizeModel.name+':find';
                return await CachingUtils.clearKey(cacheClient, sequelizeModel, deleteKey)
            }
        }
    }
}

export default SequelizeClassMethodsCaching;