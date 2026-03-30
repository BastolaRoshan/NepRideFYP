import jwt from "jsonwebtoken";

const userAuth = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.json({
      success: false,
      message: "Not Authorized.Login Again",
    });
  }
  try {
    const tokenDecode = jwt.verify(token, process.env.JWT_SECRET);
    const id = tokenDecode.id || tokenDecode.userId;

    if (id) {
      req.userId = id;
      req.user = { _id: id };
      if (!req.body) req.body = {};
      req.body.userId = id;
    } else {
      return res.json({
        success: false,
        message: "Not Authorized.",
      });
    }
    next();
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};

export default userAuth;
