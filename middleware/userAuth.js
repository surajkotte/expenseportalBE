import JWT from "jsonwebtoken";

const userAuth = async (req, res, next) => {
  const cookies = req.cookies;
  console.log("Cookies:", cookies);
  try {
    const token = cookies?.token;
    if (!token || token.length <= 1) {
      throw new Error("Please login");
    }

    const decodedObject = JWT.verify(token, "ExpensePortal@2025");
    console.log(decodedObject);

    if (decodedObject) {
      const { id } = decodedObject;
      req.customObject = { password: id };

      res.header("Access-Control-Allow-Origin", "http://localhost:5173");
      res.header("Access-Control-Allow-Credentials", true);
      res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin,X-Requested-With,Content-Type,Accept,content-type,application/json"
      );

      next();
    } else {
      throw new Error("Unable to parse token");
    }
  } catch (err) {
    res.status(401).json({ messageType: "E", message: err.message });
  }
};

export default userAuth;
