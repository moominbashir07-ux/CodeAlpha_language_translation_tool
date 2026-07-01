const express = require('express');
const router = express.Router();
const translationService = require('../services/translationService');
const matrixValidator = require('../services/matrixValidator');
const stressTester = require('../services/stressTester');
const qualityValidator = require('../services/qualityValidator');
const edgeTester = require('../services/edgeTester');
const qualityMatrixValidator = require('../services/qualityMatrixValidator');

// GET /api/languages
router.get('/languages', (req, res) => {
  try {
    const languages = translationService.getLanguages();
    res.json({
      success: true,
      languages
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve languages list.'
    });
  }
});

// GET /api/validate-matrix
router.get('/validate-matrix', async (req, res) => {
  try {
    const report = await matrixValidator.validateAll();
    res.json({
      success: true,
      report
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Matrix validation failed.'
    });
  }
});

// GET /api/stress-test
router.get('/stress-test', async (req, res) => {
  const concurrency = parseInt(req.query.concurrency) || 25;
  const duration = parseInt(req.query.duration) || 3;
  const useMock = req.query.useMock !== 'false';

  try {
    const report = await stressTester.runStressTest(concurrency, duration, useMock);
    res.json({
      success: true,
      report
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Stress testing failed.'
    });
  }
});

// GET /api/validate-quality
router.get('/validate-quality', async (req, res) => {
  try {
    const report = await qualityValidator.runQualityValidation();
    res.json({
      success: true,
      report
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Quality validation failed.'
    });
  }
});

// GET /api/edge-test
router.get('/edge-test', async (req, res) => {
  try {
    const report = await edgeTester.runEdgeTests();
    res.json({
      success: true,
      report
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Edge testing failed.'
    });
  }
});

// GET /api/validate-quality-matrix
router.get('/validate-quality-matrix', async (req, res) => {
  try {
    const report = await qualityMatrixValidator.runMatrixQualityEvaluation();
    res.json({
      success: true,
      report
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Quality matrix validation failed.'
    });
  }
});

// POST /api/translate
router.post('/translate', async (req, res, next) => {
  const { text, source, target } = req.body;
  const correlationId = req.headers['x-correlation-id'] || req.headers['correlation-id'] || require('crypto').randomUUID();

  try {
    const result = await translationService.translate(text, source, target, correlationId);
    
    res.setHeader('X-Correlation-ID', correlationId);
    // Return standard response structure matching the frontend expectations
    res.json({
      success: true,
      translatedText: result.translatedText,
      source: result.detectedLanguage,
      target: target,
      provider: result.provider,
      correlationId: correlationId
    });
  } catch (err) {
    res.setHeader('X-Correlation-ID', correlationId);
    // If the error has a status attached, pass it; otherwise 500
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Translation failed.',
      correlationId: correlationId
    });
  }
});

module.exports = router;
