/**
 * Referral Routes
 */

const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { protect } = require('../middleware/auth');
const { paginationValidation } = require('../validations/index');

/**
 * All routes require authentication
 */
router.use(protect);

/**
 * Referral endpoints
 */
router.get('/direct', paginationValidation, referralController.getDirectReferrals);
router.get('/tree', referralController.getReferralTree);
router.get('/income-history', paginationValidation, referralController.getReferralIncomeHistory);
router.get('/summary', referralController.getReferralSummary);
router.get('/statistics', referralController.getReferralStatistics);
router.get('/link', referralController.getReferralLink);
router.get('/levels', referralController.getReferralLevels);

module.exports = router;
