import SequelizeClassMethodsCaching from './SequelizeClassMethodsCaching.js';
import SequelizeInstanceMethodsCaching from './SequelizeInstanceMethodsCaching.js';
// import RedisCache from './RedisCache.js';

// specify this _redisDBClient global variable for app's life time access redis client 
// let _redisDBClient = new RedisCache(null, 'sequelizeModelCachePrefixKey', null);
class SequelizeModelCaching {
    static redisDBClient;
    constructor() {
    }

    // enable caching for fast querying Sequelize model
    static enableCaching(sequelizeModel) {
        //add cache function to class method
        sequelizeModel.cache = function (customKey) {
            return SequelizeClassMethodsCaching.buildClassMethodsForCaching(SequelizeModelCaching.redisDBClient, sequelizeModel, customKey); 
        }
        //add cache function to instance method
        sequelizeModel.prototype.cache = function () {
            return SequelizeInstanceMethodsCaching.buildInstanceMethodsForCaching(SequelizeModelCaching.redisDBClient, sequelizeModel);
        }
    }
}

export default SequelizeModelCaching;

