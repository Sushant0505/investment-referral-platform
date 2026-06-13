/**
 * Dashboard Routes
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

/**
 * All routes require authentication
 */
router.use(protect);

/**
 * Dashboard endpoints
 */
router.get('/summary', dashboardController.getDashboardSummary);
router.get('/roi-stats', dashboardController.getROIStats);
router.get('/referral-stats', dashboardController.getReferralStats);
router.get('/monthly-breakdown', dashboardController.getMonthlyBreakdown);
router.get('/analytics', dashboardController.getAnalytics);
router.get('/transaction-history', dashboardController.getTransactionHistory);

module.exports = router;
