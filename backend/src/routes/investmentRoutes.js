/**
 * Investment Routes
 */

const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investmentController');
const { protect } = require('../middleware/auth');
const {
  createInvestmentValidation,
  investmentIdValidation,
  paginationValidation,
} = require('../validations/index');

/**
 * All routes require authentication
 */
router.use(protect);

/**
 * Public investment routes
 */
router.get('/plans', investmentController.getAvailablePlans);
router.post('/calculate-roi', investmentController.calculateROI);

/**
 * Protected investment routes
 */
router.post('/create', createInvestmentValidation, investmentController.createInvestment);
router.get('/my-investments', paginationValidation, investmentController.getMyInvestments);
router.get('/summary', investmentController.getInvestmentSummary);
router.get('/:id', investmentIdValidation, investmentController.getInvestmentDetails);
router.post('/:id/cancel', investmentIdValidation, investmentController.cancelInvestment);

module.exports = router;
