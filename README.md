# lakehouse-sequelize-restapi-keycloak-cache

**Please give a <img src="https://github.blog/wp-content/uploads/2020/09/github-stars-logo_Color.png" width="25" height="25"> for this github library if you find it useful for your project.**

This is the library of nodejs for caching response data of some popular types of requests: 
+ Sequelize model on the databases that sequelize orm supports: mysql, postgresql...
+ Rest API request
+ Keycloak admin client Api request (not executed)

Features:
+ The Redis hosts/cluster will stand between application and these services: databases, a rest api service, a keycloak service.
+ This setup will speed up x4 the read speed on a query to these services because the data are cached on Redis hosts/cluster.

### Library is compatible for: Nodejs with or without ES6. Below I use the ES6 syntax for easy understanding.

### Installation
    # npm install --save lakehouse-sequelize-restapi-keycloak-cache

### Create Redis Client
    import { RedisCache } from "lakehouse-sequelize-restapi-keycloak-cache";
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
    // the cache function accepts 2 params: 
    // + "loggedInUserId" is the id of the user who has logged in to the system and is interacting with the model
    // + "id" is the primary key of the model instance with which the user is interacting
    
    // caching for each loggedInUserId
    let response = await Car.cache(loggedInUserId, null).findAll()
    let response = await Car.cache(loggedInUserId, null).findAndCountAll()
    let response = await Car.cache(loggedInUserId, null).findOne()
    let response = await Car.cache(loggedInUserId, null).findByPk()
    let response = await Car.cache(loggedInUserId, null).create()
    let response = await Car.cache(loggedInUserId, null).bulkCreate()
    let response = await Car.cache(loggedInUserId, id).update()
    let response = Car.cache(loggedInUserId, id).destroy()
    
    // caching without the need of knowing who has logged into the system
    let response = await Car.cache().findAll()
    let response = await Car.cache().findAndCountAll()
    let response = await Car.cache().findOne()
    let response = await Car.cache().findByPk()
    let response = await Car.cache().create()
    let response = await Car.cache().bulkCreate()
    let response = await Car.cache(null, id).update()
    let response = Car.cache(null, id).destroy()
    
    // Note that with only postgresql, the sequelize ORM will return the updated object with id in the model update() command:
    let loggedInUserId = JwtHelper.decode(token).sub;
    response = await Components.cache(loggedInUserId, id).update({
        ip: component.ip,
        port: component.port,
        protocol: component.protocol,
        type: component.type,
        description: component.description
      },
      {
        where: {
          id: id
        },
        **returning: true**,
      }
    );
    

### Caching Rest API
    import { RestApiCaching } from "lakehouse-sequelize-restapi-keycloak-cache";
    
    RestApiCaching.redisApiClient = redisClient;
    
    // User service
    // token: it's the user bearer token returned when the user log in to the portal
    
    // findAll without enable caching
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
    // => findAll with enable caching: no  logged in user id
    async findAll(token) {
        var response = null;
        try {
          let queryUrl = 'https://abc.com/user';
          let apiMethod = "GET"
	  let moduleName = this.constructor.name;
          let data = RestApiCaching.apiCache(token, null, moduleName, queryUrl, null, apiMethod);
          return data;
        } catch (error) {
          throw error;
        }
    }
    
    // => findAll with enable caching: no  logged in user id, but the token contain the logged in user id in the token.sub attribute
    async findAll(token) {
        var response = null;
        try {
          let queryUrl = 'https://abc.com/user';
          let apiMethod = "GET"
	  let moduleName = this.constructor.name;
          let data = RestApiCaching.apiCache(token, null, moduleName, queryUrl, null, apiMethod);
          return data;
        } catch (error) {
          throw error;
        }
    }
    
    // => findAll with enable caching: with logged in user id
    async findAll(token, loggedInUserId) {
        var response = null;
        try {
          let queryUrl = 'https://abc.com/user';
          let apiMethod = "GET"
	  let moduleName = this.constructor.name;
          let data = RestApiCaching.apiCache(token, loggedInUserId, moduleName, queryUrl, null, apiMethod);
          return data;
        } catch (error) {
          throw error;
        }
    }
    
    // => nearly the same with: saveOne, editOne and deleteOne: with logged in user id
    async saveOne(token, user, loggedInUserId) {
        var dateCreate = new Date();
        user.attributes.dateCreate = [dateCreate];
        try {
          let queryUrl = "https://abc.com/user";
          let data = user;
          let apiMethod = "POST";
	  let moduleName = this.constructor.name;
          let response = RestApiCaching.apiCache(token, loggedInUserId, moduleName, queryUrl, data, apiMethod);
          return response;
        } catch (error) {
          return error;
        }
      }
    
      async editOne(token, user, loggedInUserId) {
        var dateModify = new Date();
        user.attributes.dateModify = [dateModify];
        try {
          let queryUrl = "https://abc.com/user/" + user.id;
          let data = user;
          let apiMethod = "PUT";
	  let moduleName = this.constructor.name;
          let response = RestApiCaching.apiCache(token, loggedInUserId, moduleName, queryUrl, data, apiMethod);
          return response;
        } catch (error) {
          throw error;
        }
      }
    
      async deleteOne(token, userId, loggedInUserId) {
        try {
          let queryUrl = "https://abc.com/user/" + user.id;
          let apiMethod = "DELETE";
	  let moduleName = this.constructor.name;
          let response = RestApiCaching.apiCache(token, loggedInUserId, moduleName, queryUrl, null, apiMethod);
          return response;
        } catch (error) {
          throw error;
        }
      }
      
      // => nearly the same with: saveOne, editOne and deleteOne: without logged in user id
    async saveOne(token, user) {
        var dateCreate = new Date();
        user.attributes.dateCreate = [dateCreate];
        try {
          let queryUrl = "https://abc.com/user";
          let data = user;
          let apiMethod = "POST";
	  let moduleName = this.constructor.name;
          let response = RestApiCaching.apiCache(token, null, moduleName, queryUrl, data, apiMethod);
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
	  let moduleName = this.constructor.name;
          let response = RestApiCaching.apiCache(token, null, moduleName, queryUrl, data, apiMethod);
          return response;
        } catch (error) {
          throw error;
        }
      }
    
      async deleteOne(token, userId) {
        try {
          let queryUrl = "https://abc.com/user/" + user.id;
          let apiMethod = "DELETE";
	  let moduleName = this.constructor.name;
          let response = RestApiCaching.apiCache(token, null, moduleName, queryUrl, null, apiMethod);
          return response;
        } catch (error) {
          throw error;
        }
      }
