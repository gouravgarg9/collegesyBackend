const express = require("express");
const userControllers = require("./../controllers/userControllers");
const authControllers = require("../controllers/authControllers");
const chatControllers = require("./../controllers/chatControllers");
const productControllers = require("./../controllers/productControllers");
const router = express.Router();

router.get("/getChats", authControllers.protect, chatControllers.getChats);

router.get(
  "/getChatByProductId/:productId",
  authControllers.protect,
  productControllers.putProductOnReq,
  chatControllers.getChatbyProduct
);

router.get(
  "/getChat/:chatId",
  authControllers.protect,
  chatControllers.getChatbyChatId
);

router.post("/reveal", authControllers.protect, chatControllers.reveal);

router.post("/blockChat", authControllers.protect, chatControllers.blockChat);

module.exports = router;
