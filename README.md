# lakehouse-sequelize-restapi-keycloak-cache

This is the library of nodejs for caching response data of some popular types of requests: 
+ Sequelize model on some kinds of databases: mysql, postgresql...
+ Rest API request
+ Keycloak admin client Api request

Features:
+ The Redis hosts/cluster will stand between application and these services: databases, a rest api service, a keycloak service.
+ This setup will speed up x4 the read speed on a query to these services because the data are cached on Redis hosts/cluster.
