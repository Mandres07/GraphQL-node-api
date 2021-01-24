const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
   // obtiene el header Authorization
   const authHeader = req.get('Authorization');
   // verifica que el header se obtenga bien
   if (!authHeader) {
      req.isAuth = false;
      return next();
   }
   // el header viene con el formtao Bearer TOKEN, por lo que hay q separar el Bearer con split y quedarse solo con la segunda parte del token que es realmente el token
   const token = authHeader.split(' ')[1];
   let decodeToken;
   try {
      // obtiene el token y verifica si es correcto usando el mismo string secreto ('secret')
      decodeToken = jwt.verify(token, 'secret');
   }
   catch (err) {
      req.isAuth = false;
      return next();
   }

   if (!decodeToken) {
      req.isAuth = false;
      return next();
   }

   req.userId = decodeToken.userId;
   req.isAuth = true;
   next();
};