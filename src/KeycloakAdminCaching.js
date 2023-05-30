// import to from 'await-to-js';

class KeycloakAdminCaching {
    static redisKeycloakAdminClient;
    constructor() {

    }

    // const variableToString = varObj => Object.keys(varObj)[0]
    static variableToString(varObj) {
        return Object.keys(varObj)[0];
    } 
    
    static async keycloakAdminCache(method, keycloakAdminClient, moduleName, keycloakAdminClientFuncName, userIdLoggedIn, queryParams, bodyParams) {

        let userLoggedIn = userIdLoggedIn ? userIdLoggedIn : '';
        let module = moduleName ? moduleName : '';
        let hashKey = [
            userLoggedIn,
            module
        ];
        let kcAdminClient = keycloakAdminClient;
        
        let func_string = KeycloakAdminCaching.variableToString({kcAdminClient})+"."+keycloakAdminClientFuncName;

        switch(method) {
            case "GET":
                // see if we have a value for 'key' and 'hashKey' in redis
                let key = keycloakAdminClientFuncName+":"+JSON.stringify(queryParams);
                let cacheData = await KeycloakAdminCaching.redisKeycloakAdminClient.hget(hashKey, key);

                // if the value exists, return that
                if(cacheData) {
                    return cacheData;
                }

                // await-to-js: execute function with error handling (no try-catch needed)
                // const [err, result] = await to(eval(func_string+"("+JSON.stringify(args)+")"));
                // if (err) return;
                // Otherwise, issue the function and store the result in redis 
                const result = await eval(func_string+"("+JSON.stringify(queryParams)+")");
                
                // set cache for this get function
                await KeycloakAdminCaching.redisKeycloakAdminClient.hset(hashKey, key, result);
                return result;
            case "POST":
            case "PUT":
            case "DELETE":
                // delete cache
                await KeycloakAdminCaching.redisKeycloakAdminClient.del(hashKey);

                // do the function
                const response = await eval(func_string+"("+JSON.stringify(queryParams)+","+JSON.stringify(bodyParams)+")");
                return response;
            default:
                return "No Method found for caching";
        }

    }

    // static async clearCache(userIdLoggedIn, moduleName) {
    //     let userLoggedIn = userIdLoggedIn ? userIdLoggedIn : '';
    //     let module = moduleName ? moduleName : '';
    //     let hashKey = [
    //         userLoggedIn,
    //         module
    //     ];
    //     await KeycloakAdminCaching.redisKeycloakAdminClient.del(hashKey);
    // }
}

export default KeycloakAdminCaching;