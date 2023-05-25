import axios from "axios";

class RestApiCaching {
    static redisApiClient;
    constructor() {

    }

    static async apiCache(token, moduleName, queryUrl, data, apiMethod) {
        let realToken;
        if(!token) {
            realToken = '';
        } else {
            realToken = token;
        }
        // let hashKey = [
        //     moduleName,
        //     "GET"
        // ];
        let hashKey = [
            moduleName
        ];
        let key = queryUrl;
        switch(apiMethod) {
            case "GET":
                // see if we have a value for 'key' and 'hashKey' in redis
                let cacheData = await RestApiCaching.redisApiClient.hget(hashKey, key);

                // if the value exists, return that
                if(cacheData) {
                    return cacheData;
                }

                // Otherwise, issue the rest api query and store the result in redis
                const result = await axios({
                    method: apiMethod,
                    url: queryUrl,
                    headers: { Authorization: realToken },
                });
                
                // set cache for this rest api query
                await RestApiCaching.redisApiClient.hset(hashKey, key, result.data);
                return result.data;
            case "POST":
                const resultPOST = await axios({
                    method: apiMethod,
                    url: queryUrl,
                    data: data,
                    headers: { Authorization: realToken },
                });
                // delete all "GET" calls cache related to this module
                await RestApiCaching.redisApiClient.del(hashKey);
                return resultPOST;
            case "PUT":
                const resultPUT = await axios({
                    method: apiMethod,
                    url: queryUrl,
                    data: data,
                    headers: { Authorization: realToken },
                });
                // delete all "GET" calls cache related to this module
                await RestApiCaching.redisApiClient.del(hashKey);
                return resultPUT;
            case "DELETE":
                const resultDELETE = await axios({
                    method: apiMethod,
                    url: queryUrl,
                    headers: { Authorization: realToken },
                });
                await RestApiCaching.redisApiClient.del(hashKey);
                return resultDELETE;
            default:
                return "No Method found for caching";
        }
        
    }
}

export default RestApiCaching;