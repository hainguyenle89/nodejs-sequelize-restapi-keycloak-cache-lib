// this class is to support caching for sequelize instance methods:
// save, update, reload, destroy
import CachingUtils from "./CachingUtils.js";

class SequelizeInstanceMethodsCaching {
    constructor() {
    }

    static buildInstanceMethodsForCaching(cacheClient, instance) {
        return {
            getCacheClient() {
                return cacheClient;
            },

            save() {
                return instance.save.apply(instance, arguments)
                    .then(instance => {
                        CachingUtils.save(cacheClient, instance);
                    });
            },

            update() {
                return instance.update.apply(instance, arguments)
                    .then(instance => {
                        CachingUtils.save(cacheClient, instance)
                    });
            },
            
            reload() {
                return instance.reload.apply(instance, arguments)
                    .then(instance => CachingUtils.save(cacheClient, instance))
            },
            
            destroy() {
                return instance.destroy.apply(instance, arguments)
                    .then(() => CachingUtils.destroy(cacheClient, instance))
            },
            
            clear () {
                return CachingUtils.destroy(cacheClient, instance)
            }
        }
    }
}

export default SequelizeInstanceMethodsCaching