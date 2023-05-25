import Redis from "ioredis";

class RedisCache {
  constructor(redisHosts, redisDefaultPassword, namespace, cacheExpirationTime) {
    
    if(redisHosts) {
      this.redisClient = new Redis.Cluster(
          redisHosts,
          {
              redisOptions: {
                  password: redisDefaultPassword
              }
          }
      );
    } else {
      this.redisClient = new Redis();
    }
    // namespace is the prefix for all cache key in redis
    if(namespace) {
      this.namespace = namespace;
    } else {
      this.namespace = "CachePrefixKey";
    }
    // Keys lifetime/cache expiration time, in seconds
    if(!cacheExpirationTime) {
      this.cacheExpirationTime = config.cacheExpirationTime;
    } else {
      this.cacheExpirationTime = cacheExpirationTime;
    }
  }

  getredisClient() {
    return this.redisClient;
  }

  getNamespace() {
    return this.namespace;
  }

  getCacheExpirationTime() {
    return this.cacheExpirationTime;
  }

  _withNamespace(key) {
    const namespace = this.namespace
    const keyWithNamespace = namespace
      ? [namespace, ...key]
      : key

    return keyWithNamespace.join(':')
  }
  
  // set(key, value) {
  //     const options = this.cacheExpirationTime
  //       ? ['EX', this.cacheExpirationTime]
  //       : []
  
  //     return this.redisClient.set(
  //       this._withNamespace(key),
  //       JSON.stringify(value),
  //       options
  //     )
  // }

  async set(key, value) {
    const options = this.cacheExpirationTime
      ? ['EX', this.cacheExpirationTime]
      : []

    return await this.redisClient.set(
      this._withNamespace(key),
      JSON.stringify(value),
      options
    )
  }

  // write hash set to redis endpoint
  async hset(hashKey, key, value) {
    return await this.redisClient.hset(
      this._withNamespace(hashKey), 
      key,
      JSON.stringify(value))
      .then((status) => this.redisClient.expire(this._withNamespace(hashKey), this.cacheExpirationTime));
  }

  // write hash set to redis endpoint with an object of multi keys and values on a hash key
  async hsetMultiKeys(hashKey, object) {
    return await this.redisClient.hset(this._withNamespace(hashKey), object)
      .then((status) => this.redisClient.expire(this._withNamespace(hashKey), this.cacheExpirationTime));
  }
    
  // get(key) {
  //     // console.log(this.redisClient.get(this._withNamespace(key)));
  //     return this.redisClient.get(this._withNamespace(key))
  //       .then(data => {
  //         if (!data) {
  //           return data
  //         }
  
  //         return JSON.parse(data, (key, value) => {
  //           return value && value.type === 'Buffer'
  //             ? Buffer.from(value.data)
  //             : value
  //         })
  //       })
  // }

  async get(key) {
    // console.log(this.redisClient.get(this._withNamespace(key)));
    let data = await this.redisClient.get(this._withNamespace(key));
    if(!data) {
      return data;
    } else {
      return JSON.parse(data, (key, value) => {
        return value && value.type === 'Buffer'
          ? Buffer.from(value.data)
          : value
      });
    }
  }

  // get hash set from redis endpoint
  async hget(hashKey, key) {
    // console.log(this.redisClient.get(this._withNamespace(key)));
    let data = await this.redisClient.hget(this._withNamespace(hashKey), key);
    if(!data) {
      return data;
    } else {
      return JSON.parse(data, (key, value) => {
        return value && value.type === 'Buffer'
          ? Buffer.from(value.data)
          : value
      });
    }
  }
    
  async del(key) {
    return await this.redisClient.del(this._withNamespace(key))
  }

  // delete a key,value on a hash set
  async hdel(hashKey, key) {
    return await this.redisClient.hdel(this._withNamespace(hashKey), key);
  }

}

export default RedisCache;

// let redisNodes = [
//     {
//         port: 2347,
//         host: "10.168.6.34",
//     },
//     {
//         port: 2347,
//         host: "10.168.6.35",
//     },
//     {
//         port: 2347,
//         host: "10.168.6.52",
//     },
//     {
//         port: 2348,
//         host: "10.168.6.34",
//     },
//     {
//         port: 2348,
//         // If some of nodes in the cluster using a different password, you should specify them in the first parameter
//         password: "123456a#",
//         host: "10.168.6.35",
//     },
//     {
//         port: 2348,
//         host: "10.168.6.52",
//     }
// ];

// let redisPw = "123456a#";


// let redisCache = new RedisCache();

// let cluster = redisCache.getRedisCluster();

// const cluster = new Redis.Cluster(
//     redisClusterNodes,
//     {
//         redisOptions: {
//             password: "123456a#"
//         }
//     }
// );

// cluster.set("colors", JSON.stringify({red: 'rojo'}));
// cluster.get("colors", (err, res) => {
//     console.log(JSON.parse(res));
// });
// cluster.hset('spanish', 'red', 'rojo'); 
// cluster.hget("spanish", 'red', (err, res) => {
//     console.log(err+res);
// });

// // connect to sentinel
// const redisSentinel = new Redis({
//     sentinels: [
//         { host: "192.168.1.12", port: 2600},
//         { host: "192.168.1.14", port: 2600},
//         { host: "192.168.1.16", port: 2600},
//     ],
//     name: "replicaset1",
//     // sentinelPassword: "gatewayCacheMaster#2020",
//     username: "default",
//     password: "gatewayCacheMaster#2020"
// });

// redisSentinel.set("hoho", "hí hí");

// redisSentinel.get("hoho", (err, value) => {
//     if (err) {
//         console.log(err);
//     } else {
//         console.log(value);
//     }
// });
