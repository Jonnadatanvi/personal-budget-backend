// middlewares/auth.js
// const jwt = require('jsonwebtoken');
// const jwt_key ='My_secret_key';

// function authenticateToken(req, res, next) {
//     const token = req.headers['authorization']?.split(' ')[1];
//     if (token == null) return res.sendStatus(401);

//     jwt.verify(token, jwt_key, (err, user) => {
//         if (err) return res.sendStatus(403);
//         req.user = user;
//         next();
//     });
// }

// module.exports = { authenticateToken };
