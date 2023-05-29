import jwt from "jsonwebtoken";
// import Logger from './Logger';

class JwtHelper {
  constructor(secret) {
    this.secret = secret;
  }

  sign(data, time) {
    return jwt.sign(data, this.secret, { expiresIn: time });
  }

  verify(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.secret, (err) => {
        if (err) {
          // Logger.error(__filename, err);
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  static decode(accessToken) {
    if (accessToken == undefined) {
      console.error("JWT Helper decodeToken: Missing token");
      throw new Error("Can not decode: Missing token");
    } else {
      try {
        accessToken = accessToken.replace("Bearer ", "");
        let decodeToken = jwt.decode(accessToken);
        return decodeToken;
      } catch (error) {
        console.error("JWT Helper decodeToken: Invalid token");
        throw error;
      }
    }
}
}

export default JwtHelper;
