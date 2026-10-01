const express = require("express");
const router = express.Router();
const portalController = require("../controllers/portalController");

// Public route - NO auth middleware!
router.get("/customer/:token", portalController.getCustomerPortalData);

module.exports = router;
