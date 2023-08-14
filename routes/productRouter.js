const express = require("express");
const productControllers = require("./../controllers/productControllers");
const authControllers = require("../controllers/authControllers");
const router = express.Router();

router.get(
  "/getAllProducts",
  authControllers.protect,
  productControllers.getAllProducts
);
router.get(
  "/getAllProductsByUserId",
  authControllers.protect,
  productControllers.getAllProductsByUserId
);
router.get(
  "/getProduct/:productId",
  productControllers.putProductOnReq,
  productControllers.getProduct
);
router.put(
  "/updateProduct/:productId",
  authControllers.protect,
  productControllers.putProductOnReq,
  productControllers.checkIfSeller,
  productControllers.productPhotoUpload,
  productControllers.deleteProductImages,
  productControllers.updateProduct
);

router.put(
  "/reactivateProduct/:productId",
  authControllers.protect,
  productControllers.putProductOnReq,
  productControllers.checkIfSeller,
  productControllers.reactivateProduct
);

router.put(
  "/deleteAllProductImages/:productId",
  authControllers.protect,
  productControllers.putProductOnReq,
  productControllers.checkIfSeller,
  productControllers.deleteAllProductImages
);

router.put(
  "/deleteOneProductImage/:productId",
  authControllers.protect,
  productControllers.putProductOnReq,
  productControllers.checkIfSeller,
  productControllers.deleteOneProductImage
);

router.delete(
  "/deleteProduct/:productId",
  authControllers.protect,
  productControllers.putProductOnReq,
  productControllers.checkIfSeller,
  productControllers.deleteProduct
);

router.post(
  "/createProduct",
  authControllers.protect,
  productControllers.createProduct
);

module.exports = router;
