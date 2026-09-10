/**
 * SahakarGig AI Services Barrel Registry
 * Centralized directory for all Artificial Intelligence engines:
 * 
 * 1. Price Estimator Engine (estimator.js)
 * 2. Dispute Arbitration & Audit Engine (disputeAudit.js)
 * 3. Worker Earnings & Skill Coach Engine (workerCoach.js)
 * 4. Trust Score & KYC Verifier Engine (trustVerifier.js)
 * 5. Saarthi Conversational Assistant (saarthiChat.js)
 * 6. Demand Forecasting Engine (demandForecaster.js)
 * 7. Multilingual Translator Engine (translator.js)
 */

const { estimatePriceEngine } = require('./estimator');
const { auditDisputeEngine } = require('./disputeAudit');
const { generateWorkerCoachInsights } = require('./workerCoach');
const { verifyProviderTrustEngine } = require('./trustVerifier');
const { saarthiChatEngine } = require('./saarthiChat');
const { demandForecastEngine } = require('./demandForecaster');
const { translateContentEngine } = require('./translator');

module.exports = {
  estimatePriceEngine,
  auditDisputeEngine,
  generateWorkerCoachInsights,
  verifyProviderTrustEngine,
  saarthiChatEngine,
  demandForecastEngine,
  translateContentEngine,
};
