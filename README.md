# lakehouse-sequelize-restapi-keycloak-cache

This is the library of nodejs for caching response data of some popular types of requests: 
+ Sequelize model on some kinds of databases: mysql, postgresql...
+ Rest API request
+ Keycloak admin client Api request

Features:
+ The Redis hosts/cluster will stand between application and these services: databases, a rest api service, a keycloak service.
+ This setup will speed up x4 the read speed on a query to these services because the data are cached on Redis hosts/cluster.

### Installation
    # npm install --save lakehouse-sequelize-restapi-keycloak-cache

### Create Redis Client
    const redisNode = {
         "port": 6379,
         "host": "127.0.0.1"
    };
    const redisPw = "1234567";
    const prefixRedisKey = "cachekey";
    const expirationTime = 18000;    // seconds
    const redisClient = new RedisCache(redisNode, redisPw, prefixRedisKey, expirationTime);

### Caching Sequelize v6+ Usage
	import { SequelizeModelCaching } from "lakehouse-sequelize-restapi-keycloak-cache";
	
    // import model (already sync and config with sequelize)
    import Car from ".model/CarModel.js";
	
    SequelizeModelCaching.redisDBClient = redisClient;
    
    // enable caching for a model, for example here the model name is "Car"
    SequelizeModelCaching.enableCaching(Car);
    
    // caching for each sequelize model methods
    // methods that don't need params
    let response = await Car.cache().findAll()
    let response = await Car.cache().findAndCountAll()
    let response = await Car.cache().findOne()
    let response = await Car.cache().findByPk()
    let response = await Car.cache().create()
    let response = await Car.cache().update()
    
    // method that need primary key params: example here the "id" primary key
    let response = Car.cache(id).destroy()
    let response = Car.cache().findAll()

### Caching Rest API
    import { RestApiCaching } from "lakehouse-sequelize-restapi-keycloak-cache";
    
    RestApiCaching.redisApiClient = redisClient;
    
    // User service
    
    // findAll before enabling cache
    async findAll(token) {
        var response = null;
        try {
          response = await axios({
            method: "GET",
            url: 'https://abc.com/user',
            headers: { Authorization: token },
          });
          return response.data;
          } catch (error) {
          throw error;
        }
    }
    // => findAll after enabling cache
    async findAll(token) {
        var response = null;
        try {
          let queryUrl = 'https://abc.com/user';
          let apiMethod = "GET"
          let data = RestApiCaching.apiCache(token, this.moduleName, queryUrl, null, apiMethod);
          return data;
        } catch (error) {
          throw error;
        }
    }
    
    // => nearly the same with: saveOne, editOne and deleteOne
    async saveOne(token, user) {
        var dateCreate = new Date();
        user.attributes.dateCreate = [dateCreate];
        try {
          let queryUrl = "https://abc.com/user";
          let data = user;
          let apiMethod = "POST";
          let response = RestApiCaching.apiCache(token, this.moduleName, queryUrl, data, apiMethod);
          return response;
        } catch (error) {
          return error;
        }
      }
    
      async editOne(token, user) {
        var dateModify = new Date();
        user.attributes.dateModify = [dateModify];
        try {
          let queryUrl = "https://abc.com/user/" + user.id;
          let data = user;
          let apiMethod = "PUT";
          let response = RestApiCaching.apiCache(token, this.moduleName, queryUrl, data, apiMethod);
          return response;
        } catch (error) {
          throw error;
        }
      }
    
      async deleteOne(token, userId) {
        try {
          let queryUrl = "https://abc.com/user/" + user.id;
          let apiMethod = "DELETE";
          let response = RestApiCaching.apiCache(token, this.moduleName, queryUrl, null, apiMethod);
          return response;
        } catch (error) {
          throw error;
        }
      }
