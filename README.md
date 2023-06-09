# lakehouse-sequelize-restapi-keycloak-cache

**Please give a <img src="https://github.blog/wp-content/uploads/2020/09/github-stars-logo_Color.png" width="25" height="25"> for this github library if you find it useful for your project.**

This is the library of nodejs for caching response data of some popular types of requests: 
+ Sequelize model on the databases that sequelize orm supports: mysql, postgresql...
+ Rest API request
+ Keycloak admin client Api request

Features:
+ The Redis hosts/cluster will stand between application and these services: databases, a rest api service, a keycloak service.
+ This setup will speed up x4 the read speed on a query to these services because the data are cached on Redis hosts/cluster.

### The library is compatible for: Nodejs with or without ES6. Below I use the ES6 syntax for easy understanding.

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
    // + "customKey": you can use any key string here to suit your project need on caching plan. For example, we use the "loggedInUserId" which is the id of the user who has logged in to the system and is interacting with the model
    // + "id" is the primary key of the model instance with which the user is interacting
    let response = await Car.cache(customKey, null).findAll();

    // caching for each "customKey", here example of "loggedInUserId"
    let response = await Car.cache(loggedInUserId, null).findAll();
    let response = await Car.cache(loggedInUserId, null).findAndCountAll();
    let response = await Car.cache(loggedInUserId, null).findOne();
    let response = await Car.cache(loggedInUserId, null).findByPk();
    let response = await Car.cache(loggedInUserId, null).create();
    let response = await Car.cache(loggedInUserId, null).bulkCreate();
    let response = await Car.cache(loggedInUserId, id).update();

    // destroy a single record
    let response = await Car.cache(loggedInUserId, id).destroy();
    // destroy multiple records
    let response = await Car.cache(loggedInUserId, null).destroy();
    

    // caching without the need of customKey, example here we dont need to know who has logged into the system
    let response = await Car.cache().findAll();
    let response = await Car.cache().findAndCountAll();
    let response = await Car.cache().findOne();
    let response = await Car.cache().findByPk();
    let response = await Car.cache().create();
    let response = await Car.cache().bulkCreate();
    let response = await Car.cache(null, id).update();
    let response = await Car.cache(null, id).destroy();

    // destroy a single record
    let response = await Car.cache(null, id).destroy();
    // destroy multiple records
    let response = await Car.cache(null, null).destroy();

    
    // Note that with only postgresql, the sequelize ORM will return the updated object with id in the model update() command: using option: "returning: true":
    response = await Components.cache(customKey, id).update({
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
        returning: true,
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
    // => findAll with enable caching: no customKey, example here is no logged in user id
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

    // => nearly the same with: saveOne, editOne and deleteOne: without customKey, example here without logged in user id
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
    
    
    // => findAll with enable caching: with customKey, example here with logged in user id: customKey = loggedInUserId

    async findAll(token, customKey) {
        var response = null;
        try {
          let queryUrl = 'https://abc.com/user';
          let apiMethod = "GET"
	        let moduleName = this.constructor.name;
          let data = RestApiCaching.apiCache(token, customKey, moduleName, queryUrl, null, apiMethod);
          return data;
        } catch (error) {
          throw error;
        }
    }
    
    // => nearly the same with: saveOne, editOne and deleteOne: with customKey, example here with logged in user id
    async saveOne(token, user, customKey) {
        var dateCreate = new Date();
        user.attributes.dateCreate = [dateCreate];
        try {
          let queryUrl = "https://abc.com/user";
          let data = user;
          let apiMethod = "POST";
	        let moduleName = this.constructor.name;
          let response = RestApiCaching.apiCache(token, customKey, moduleName, queryUrl, data, apiMethod);
          return response;
        } catch (error) {
          return error;
        }
      }
    
      async editOne(token, user, customKey) {
        var dateModify = new Date();
        user.attributes.dateModify = [dateModify];
        try {
          let queryUrl = "https://abc.com/user/" + user.id;
          let data = user;
          let apiMethod = "PUT";
	        let moduleName = this.constructor.name;
          let response = RestApiCaching.apiCache(token, customKey, moduleName, queryUrl, data, apiMethod);
          return response;
        } catch (error) {
          throw error;
        }
      }
    
      async deleteOne(token, userId, customKey) {
        try {
          let queryUrl = "https://abc.com/user/" + user.id;
          let apiMethod = "DELETE";
	        let moduleName = this.constructor.name;
          let response = RestApiCaching.apiCache(token, customKey, moduleName, queryUrl, null, apiMethod);
          return response;
        } catch (error) {
          throw error;
        }
      }

### Caching Keycloak admin function
=======================

**Keycloak admin and rest api of keycloak need to be the same hash key so that it can refresh properly all cache values that belong to each other and to each logged in user**
**=> so they need to use the same prefix key, so they have to use the same redisClient.**

    import { KeycloakAdminCaching } from "lakehouse-sequelize-restapi-keycloak-cache";
    import KcAdminClient from "@keycloak/keycloak-admin-client";
    
    KeycloakAdminCaching.redisKeycloakAdminClient = redisClient;
    
    let config = {
      'baseUrl': 'https://abc.com',
      'realmName': 'realm'
    }
    const kcAdminClient = new KcAdminClient({
      baseUrl: config.baseUrl,
      realmName: config.realmName,
    });
    await kcAdminClient.auth(config);
    setInterval(() => kcAdminClient.auth(config), 300 * 1000); // 900 seconds
    
    // The keycloak admin client functions are also divided into 4 methods: GET, POST, PUT, DELETE
    // We need to classify each functions into a specific method manually
    // for example the kcAdminClient.users.listGroups() function is classify as method "GET"
    
    // example "GET" method function
    // function without cache enabled
    async findGroupsOfUser(user_id) {
        try {
          const groups = await kcAdminClient.users.listGroups({ id: user_id });
          return groups;
        } catch (error) {
          console.error("AdminClient findGroupsOfUser: " + error);
        }
    }
    
    // function with cache enabled: customKey = userIdLoggedIn
    async findGroupsOfUser(customKey, user_id, moduleName) {
        try {
          let method = "GET";
          let keycloakAdminClientFuncName = "users.listGroups";
          let queryParams = { id: user_id};
          let bodyParams = null;
          const groups = KeycloakAdminCaching.keycloakAdminCache(method, kcAdminClient, moduleName, keycloakAdminClientFuncName, customKey, queryParams, bodyParams);
          return groups;
        } catch (error) {
          console.error("AdminClient findGroupsOfUser: " + error);
        }
    }
    // => the speed of reading data with cache is as 6x time as that of reading data without cache
    
    //--------------------------------
    
    // example "PUT" method function
    // function without cache enabled
    async disableUser(userId) {
        try {
          await kcAdminClient.users.update(
            { id: userId },
            {
              enabled: false,
            }
          );
        } catch (error) {
          console.error("AdminClient logoutUser: " + error);
        }
    }
    
    // => function with cache enabled: customKey = userIdLoggedIn
    async disableUser(customKey, userId, moduleName) {
        try {
          let method = "PUT";
          let keycloakAdminClientFuncName = "users.update";
          let queryParams = { 
            id: userId
          };
          let bodyParams = {
            enabled: false
          };
          const response = KeycloakAdminCaching.keycloakAdminCache(method, kcAdminClient, moduleName, keycloakAdminClientFuncName, customKey, queryParams, bodyParams);
        } catch (error) {
          console.error("AdminClient logoutUser: " + error);
        }
    }
